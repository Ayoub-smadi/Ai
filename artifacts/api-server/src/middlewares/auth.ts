import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { appUsersTable, db, workspaceMembersTable } from "@workspace/db";

const SESSION_COOKIE = "webdev_app_session";
const PREVIEW_SESSION_COOKIE = "app_session_id";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type SessionClaims = {
  appId: string;
  openId: string;
  exp: number;
};

type CookieOptions = {
  httpOnly?: boolean;
  secure: boolean;
  sameSite: "None" | "Lax";
  path: string;
  maxAge?: number;
};

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function parseCookieHeader(header: string | undefined): Map<string, string | null> {
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

export function readSessionClaims(cookieHeader: string | undefined): SessionClaims | null {
  const projectId = process.env.MANUS_PROJECT_ID;
  const secret = process.env.MANUS_JWT_SECRET;
  if (!projectId || !secret) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies.get(SESSION_COOKIE) ?? cookies.get(PREVIEW_SESSION_COOKIE);
  if (!token || token === null) return null;
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  const headerBytes = decodeBase64Url(segments[0]);
  const payloadBytes = decodeBase64Url(segments[1]);
  const signature = decodeBase64Url(segments[2]);
  if (!headerBytes || !payloadBytes || !signature) return null;

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(headerBytes.toString("utf8"));
    payload = JSON.parse(payloadBytes.toString("utf8"));
  } catch {
    return null;
  }
  if (!header || typeof header !== "object" || (header as { alg?: unknown }).alg !== "HS256") return null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(`${segments[0]}.${segments[1]}`)
    .digest();
  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const claims = payload as Partial<SessionClaims>;
  if (
    claims.appId !== projectId ||
    typeof claims.openId !== "string" ||
    claims.openId.length === 0 ||
    typeof claims.exp !== "number" ||
    !Number.isSafeInteger(claims.exp) ||
    claims.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return { appId: claims.appId, openId: claims.openId, exp: claims.exp };
}

export function createSessionToken(openId: string): string | null {
  const projectId = process.env.MANUS_PROJECT_ID;
  const secret = process.env.MANUS_JWT_SECRET;
  if (!projectId || !secret || !openId) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ appId: projectId, openId, exp: now + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function cookieHeader(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly) parts.push("HttpOnly");
  parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function cookieOptionsForHttps(
  isHttps: boolean,
  path: string,
  maxAge?: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

async function findIdentity(openId: string) {
  const [identity] = await db
    .select({
      openId: appUsersTable.openId,
      email: appUsersTable.email,
      name: appUsersTable.name,
      role: appUsersTable.role,
    })
    .from(appUsersTable)
    .where(eq(appUsersTable.openId, openId))
    .limit(1);
  return identity ?? null;
}

async function authenticatedIdentity(req: Request) {
  const claims = readSessionClaims(req.headers.cookie);
  if (!claims) return null;
  const identity = await findIdentity(claims.openId);
  return identity ? { claims, identity } : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authenticated = await authenticatedIdentity(req);
    if (!authenticated) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    req.authUserId = authenticated.claims.openId;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authenticated = await authenticatedIdentity(req);
    if (!authenticated) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    req.authUserId = authenticated.claims.openId;
    const allowlistedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const authenticatedEmail = authenticated.identity.email?.trim().toLowerCase();
    if (
      !allowlistedEmail ||
      !authenticatedEmail ||
      authenticatedEmail !== allowlistedEmail ||
      authenticated.identity.role !== "admin"
    ) {
      res.status(403).json({ error: "Admin access is required." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function getAuthenticatedUser(cookieHeader: string | undefined) {
  const claims = readSessionClaims(cookieHeader);
  if (!claims) return null;
  return findIdentity(claims.openId);
}

export async function getWorkspaceContext(
  req: Request,
  res: Response,
): Promise<{ workspaceId: number; userId: string } | null> {
  const userId = req.authUserId;
  const rawId = req.get("X-Workspace-Id");
  const workspaceId = rawId ? Number(rawId) : NaN;

  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }
  if (!Number.isSafeInteger(workspaceId) || workspaceId < 1) {
    res.status(400).json({ error: "A valid workspace is required." });
    return null;
  }

  const [membership] = await db
    .select({ workspaceId: workspaceMembersTable.workspaceId })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "You do not have access to this workspace." });
    return null;
  }

  return { workspaceId, userId };
}
