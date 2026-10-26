import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { appUsersTable, db } from "@workspace/db";
import {
  cookieHeader,
  cookieOptionsForHttps,
  createSessionToken,
  getAuthenticatedUser,
} from "../middlewares/auth";

const router: IRouter = Router();
const NONCE_COOKIE = "webdev_oauth_nonce";
const SESSION_COOKIE = "webdev_app_session";
const NONCE_TTL_SECONDS = 5 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type OAuthState = {
  redirectUri: string;
  nonce: string;
};

function parseBrowserOrigin(value: unknown): { origin: string; isHttps: boolean } | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      parsed.origin !== value
    ) {
      return null;
    }
    return { origin: parsed.origin, isHttps: parsed.protocol === "https:" };
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Map<string, string | null> {
  const cookies = new Map<string, string | null>();
  for (const part of (header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!name) continue;
    let value: string;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      value = rawValue;
    }
    cookies.set(name, cookies.has(name) ? null : value);
  }
  return cookies;
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function parseState(encoded: string): OAuthState | null {
  if (encoded.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.toString("base64url") !== encoded) return null;
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const state = value as Partial<OAuthState>;
    if (
      typeof state.redirectUri !== "string" ||
      typeof state.nonce !== "string" ||
      !/^[A-Za-z0-9_-]{32,128}$/.test(state.nonce)
    ) {
      return null;
    }
    const parsedCallback = new URL(state.redirectUri);
    const parsedOrigin = parseBrowserOrigin(parsedCallback.origin);
    if (
      !parsedOrigin ||
      parsedCallback.href !== `${parsedOrigin.origin}/api/auth/callback` ||
      parsedCallback.pathname !== "/api/auth/callback" ||
      parsedCallback.search !== "" ||
      parsedCallback.hash !== ""
    ) {
      return null;
    }
    return { redirectUri: state.redirectUri, nonce: state.nonce };
  } catch {
    return null;
  }
}

function configValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function serviceUrl(base: string, endpoint: string): string {
  return `${base.replace(/\/+$/, "")}/${endpoint}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function postJson(url: string, body: Record<string, string>): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  const json: unknown = await response.json().catch(() => null);
  return isRecord(json) ? json : null;
}

function oauthFailure(res: Response, status = 400): void {
  res.status(status).type("text/plain").send("Unable to complete sign-in.");
}

router.post("/auth/login", (req, res): void => {
  const bodyOrigin = parseBrowserOrigin(req.body?.origin);
  const headerOrigin = parseBrowserOrigin(req.get("Origin"));
  if (!bodyOrigin || !headerOrigin || bodyOrigin.origin !== headerOrigin.origin) {
    res.status(400).json({ error: "A matching browser origin is required." });
    return;
  }

  const projectId = configValue("MANUS_PROJECT_ID");
  const portalUrl = configValue("MANUS_OAUTH_PORTAL_URL");
  if (!projectId || !portalUrl) {
    res.status(503).json({ error: "Sign-in is not configured." });
    return;
  }

  const redirectUri = `${bodyOrigin.origin}/api/auth/callback`;
  const nonce = randomBytes(32).toString("base64url");
  const state = Buffer.from(JSON.stringify({ redirectUri, nonce })).toString("base64url");
  const authorizationUrl = new URL(serviceUrl(portalUrl, "app-auth"));
  authorizationUrl.searchParams.set("appId", projectId);
  authorizationUrl.searchParams.set("redirectUri", redirectUri);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("responseType", "code");

  res.setHeader(
    "Set-Cookie",
    cookieHeader(
      NONCE_COOKIE,
      nonce,
      cookieOptionsForHttps(bodyOrigin.isHttps, "/api/auth", NONCE_TTL_SECONDS),
    ),
  );
  res.setHeader("Cache-Control", "no-store");
  res.json({ authorizationUrl: authorizationUrl.toString() });
});

router.get("/auth/callback", async (req, res): Promise<void> => {
  const stateValue = req.query.state;
  const code = req.query.code;
  if (typeof stateValue !== "string" || typeof code !== "string" || !code) {
    oauthFailure(res);
    return;
  }
  const state = parseState(stateValue);
  const cookies = parseCookies(req.headers.cookie);
  const cookieNonce = cookies.get(NONCE_COOKIE);
  if (!state || !cookieNonce || cookieNonce === null || !safeEqual(state.nonce, cookieNonce)) {
    oauthFailure(res);
    return;
  }

  const projectId = configValue("MANUS_PROJECT_ID");
  const apiUrl = configValue("MANUS_OAUTH_API_URL");
  const jwtSecret = configValue("MANUS_JWT_SECRET");
  const adminEmail = configValue("ADMIN_EMAIL")?.toLowerCase();
  if (!projectId || !apiUrl || !jwtSecret) {
    oauthFailure(res, 503);
    return;
  }

  const callbackOrigin = new URL(state.redirectUri).origin;
  const callbackCookieSettings = cookieOptionsForHttps(
    new URL(callbackOrigin).protocol === "https:",
    "/api/auth",
  );
  res.append(
    "Set-Cookie",
    cookieHeader(NONCE_COOKIE, "", {
      ...callbackCookieSettings,
      path: "/api/auth",
      maxAge: 0,
    }),
  );

  try {
    const exchanged = await postJson(
      serviceUrl(apiUrl, "webdev.v1.WebDevAuthPublicService/ExchangeToken"),
      { clientId: projectId, grantType: "authorization_code", code, redirectUri: state.redirectUri },
    );
    const accessToken = exchanged?.accessToken;
    if (typeof accessToken !== "string" || !accessToken) {
      oauthFailure(res);
      return;
    }

    const userInfo = await postJson(
      serviceUrl(apiUrl, "webdev.v1.WebDevAuthPublicService/GetUserInfo"),
      { accessToken },
    );
    const openId = userInfo?.openId;
    const emailValue = userInfo?.email;
    const nameValue = userInfo?.name;
    if (
      typeof openId !== "string" ||
      !openId.trim() ||
      (emailValue !== undefined && emailValue !== null && typeof emailValue !== "string") ||
      (nameValue !== undefined && nameValue !== null && typeof nameValue !== "string")
    ) {
      oauthFailure(res);
      return;
    }

    const email = typeof emailValue === "string" && emailValue.trim() ? emailValue.trim() : null;
    const name = typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : null;
    const role = adminEmail && email?.toLowerCase() === adminEmail ? "admin" : "member";
    await db
      .insert(appUsersTable)
      .values({ openId, email, name, role, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appUsersTable.openId,
        set: { email, name, role, updatedAt: new Date() },
      });

    const sessionToken = createSessionToken(openId);
    if (!sessionToken) {
      oauthFailure(res, 503);
      return;
    }
    res.append(
      "Set-Cookie",
      cookieHeader(
        SESSION_COOKIE,
        sessionToken,
        cookieOptionsForHttps(
          new URL(callbackOrigin).protocol === "https:",
          "/",
          SESSION_TTL_SECONDS,
        ),
      ),
    );
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, `${callbackOrigin}/admin`);
  } catch {
    // OAuth codes, access tokens, and provider response bodies must never be logged.
    oauthFailure(res, 502);
  }
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getAuthenticatedUser(req.headers.cookie);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    user: user
      ? { openId: user.openId, email: user.email, name: user.name, role: user.role }
      : null,
  });
});

router.post("/auth/logout", (req, res): void => {
  const origin = parseBrowserOrigin(req.get("Origin"));
  if (!origin) {
    res.status(403).json({ error: "A valid browser origin is required." });
    return;
  }
  const isHttps = origin.isHttps;
  const options = cookieOptionsForHttps(isHttps, "/");
  const nonceOptions = cookieOptionsForHttps(isHttps, "/api/auth");
  res.append("Set-Cookie", cookieHeader(SESSION_COOKIE, "", { ...options, maxAge: 0 }));
  res.append("Set-Cookie", cookieHeader(NONCE_COOKIE, "", { ...nonceOptions, maxAge: 0 }));
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
});

export default router;
