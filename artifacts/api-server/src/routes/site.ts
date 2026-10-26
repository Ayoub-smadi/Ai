import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, siteAssetsTable, siteSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type HeroMotionScene = {
  id: string;
  icon: "sprout" | "garden" | "care";
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
};
type SocialLink = {
  id: string;
  label: string;
  url: string;
  icon: "facebook" | "instagram" | "linkedin" | "youtube" | "website";
};
type SiteSettings = {
  brandNameEn: string;
  brandNameAr: string;
  phone: string;
  primaryColor: string;
  logoUrl: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroDescriptionEn: string;
  heroDescriptionAr: string;
  heroMotionEnabled: boolean;
  heroMotionScenes: HeroMotionScene[];
  socialLinks: SocialLink[];
};

const DEFAULT_SETTINGS: SiteSettings = {
  brandNameEn: "QADRI AI",
  brandNameAr: "قادري AI",
  phone: "0777772211",
  primaryColor: "#020618",
  logoUrl: "/chatbot.png",
  heroTitleEn: "Customer care\nthat knows\nyour business.",
  heroTitleAr: "خدمة عملاء\nتعرف عملك.",
  heroDescriptionEn:
    "Build a bilingual AI agent that answers from your real products, policies, and approved answers.",
  heroDescriptionAr:
    "أنشئ وكيلاً ذكياً ثنائي اللغة يجيب من منتجاتك وسياساتك وإجاباتك المعتمدة.",
  heroMotionEnabled: true,
  heroMotionScenes: [
    {
      id: "project",
      icon: "sprout",
      titleEn: "Starting an agricultural project?",
      titleAr: "عندك مشروع زراعي؟",
      descriptionEn: "Let’s turn your idea into a clear growing plan.",
      descriptionAr: "نحوّل فكرتك إلى بداية واضحة وخطة نموّ.",
    },
    {
      id: "garden",
      icon: "garden",
      titleEn: "Ready to plant your garden?",
      titleAr: "عندك حديقة وبدك تزرعها؟",
      descriptionEn: "Choose the right plants and make every corner bloom.",
      descriptionAr: "نختار معك النباتات المناسبة ونرتّب خطوات الزراعة.",
    },
    {
      id: "care",
      icon: "care",
      titleEn: "Is your plant looking unwell?",
      titleAr: "نبتتك تعبانة وبدها عناية؟",
      descriptionEn: "Understand what it needs and help it thrive again.",
      descriptionAr: "نساعدك تعرف احتياجها وتعتني فيها بطريقة أفضل.",
    },
  ],
  socialLinks: [],
};
const SETTINGS_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max: number, min = 0): value is string {
  return (
    typeof value === "string" &&
    value.length >= min &&
    value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}

function isSafeUrl(value: unknown): value is string {
  if (!isText(value, 2048, 1)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateScene(value: unknown): value is HeroMotionScene {
  if (!isRecord(value)) return false;
  const keys = [
    "id",
    "icon",
    "titleEn",
    "titleAr",
    "descriptionEn",
    "descriptionAr",
  ];
  if (Object.keys(value).some((key) => !keys.includes(key))) return false;
  return (
    isText(value.id, 40, 1) &&
    ["sprout", "garden", "care"].includes(String(value.icon)) &&
    isText(value.titleEn, 240) &&
    isText(value.titleAr, 240) &&
    isText(value.descriptionEn, 1000) &&
    isText(value.descriptionAr, 1000)
  );
}

function validateSocialLink(value: unknown): value is SocialLink {
  if (!isRecord(value)) return false;
  const keys = ["id", "label", "url", "icon"];
  return (
    !Object.keys(value).some((key) => !keys.includes(key)) &&
    isText(value.id, 64, 1) &&
    isText(value.label, 100, 1) &&
    isSafeUrl(value.url) &&
    ["facebook", "instagram", "linkedin", "youtube", "website"].includes(
      String(value.icon),
    )
  );
}

function validateSettingsPatch(value: unknown): {
  patch?: Partial<SiteSettings>;
  error?: string;
} {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return { error: "Provide at least one site setting." };
  }
  if (Object.keys(value).some((key) => !SETTINGS_KEYS.has(key))) {
    return { error: "Unknown site setting." };
  }
  const patch: Record<string, unknown> = {};
  const stringLimits: Record<string, number> = {
    brandNameEn: 120,
    brandNameAr: 120,
    phone: 40,
    logoUrl: 2048,
    heroTitleEn: 500,
    heroTitleAr: 500,
    heroDescriptionEn: 2000,
    heroDescriptionAr: 2000,
  };
  for (const [key, max] of Object.entries(stringLimits)) {
    if (!(key in value)) continue;
    const item = value[key];
    if (
      !isText(item, max) ||
      (key === "phone" && item && !/^[+\d ()-]+$/.test(item))
    ) {
      return { error: `Invalid ${key}.` };
    }
    if (key === "logoUrl" && !isSafeUrl(item))
      return { error: "Invalid logoUrl." };
    patch[key] = item;
  }
  if ("primaryColor" in value) {
    if (
      typeof value.primaryColor !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(value.primaryColor)
    ) {
      return { error: "Invalid primaryColor." };
    }
    patch.primaryColor = value.primaryColor;
  }
  if ("heroMotionEnabled" in value) {
    if (typeof value.heroMotionEnabled !== "boolean") {
      return { error: "Invalid heroMotionEnabled." };
    }
    patch.heroMotionEnabled = value.heroMotionEnabled;
  }
  if ("heroMotionScenes" in value) {
    if (
      !Array.isArray(value.heroMotionScenes) ||
      value.heroMotionScenes.length > 3 ||
      !value.heroMotionScenes.every(validateScene)
    ) {
      return {
        error: "Invalid heroMotionScenes (at most three scenes are allowed).",
      };
    }
    patch.heroMotionScenes = value.heroMotionScenes;
  }
  if ("socialLinks" in value) {
    if (
      !Array.isArray(value.socialLinks) ||
      value.socialLinks.length > 20 ||
      !value.socialLinks.every(validateSocialLink)
    ) {
      return { error: "Invalid socialLinks." };
    }
    patch.socialLinks = value.socialLinks;
  }
  return { patch: patch as Partial<SiteSettings> };
}

function publicSettings(payload: unknown): SiteSettings {
  const result: SiteSettings = { ...DEFAULT_SETTINGS };
  if (!isRecord(payload)) return result;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const candidate = payload[key];
    if (key === "heroMotionScenes") {
      if (
        Array.isArray(candidate) &&
        candidate.length <= 3 &&
        candidate.every(validateScene)
      ) {
        result.heroMotionScenes = candidate;
      }
    } else if (key === "socialLinks") {
      if (
        Array.isArray(candidate) &&
        candidate.length <= 20 &&
        candidate.every(validateSocialLink)
      ) {
        result.socialLinks = candidate;
      }
    } else if (key === "heroMotionEnabled") {
      if (typeof candidate === "boolean") result.heroMotionEnabled = candidate;
    } else if (key === "primaryColor") {
      if (typeof candidate === "string" && /^#[0-9a-fA-F]{6}$/.test(candidate))
        result.primaryColor = candidate;
    } else if (key === "logoUrl") {
      if (isSafeUrl(candidate)) result.logoUrl = candidate;
    } else if (key === "phone") {
      if (
        isText(candidate, 40) &&
        (!candidate || /^[+\d ()-]+$/.test(candidate))
      )
        result.phone = candidate;
    } else if (
      isText(
        candidate,
        key.startsWith("heroDescription")
          ? 2000
          : key.startsWith("heroTitle")
            ? 500
            : 120,
      )
    ) {
      result[key] = candidate;
    }
  }
  return result;
}

async function ensureSettingsRow(): Promise<Record<string, unknown>> {
  await db
    .insert(siteSettingsTable)
    .values({ key: "global", payload: DEFAULT_SETTINGS })
    .onConflictDoNothing({ target: siteSettingsTable.key });
  const [row] = await db
    .select({ payload: siteSettingsTable.payload })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "global"))
    .limit(1);
  return row?.payload ?? DEFAULT_SETTINGS;
}

router.get("/site/settings", async (_req, res): Promise<void> => {
  try {
    res.json(publicSettings(await ensureSettingsRow()));
  } catch {
    res.status(500).json({ error: "Unable to load site settings." });
  }
});

router.patch(
  "/admin/site-settings",
  requireAdmin,
  async (req, res): Promise<void> => {
    const validation = validateSettingsPatch(req.body);
    if (!validation.patch) {
      res
        .status(400)
        .json({ error: validation.error ?? "Invalid site settings." });
      return;
    }
    try {
      await ensureSettingsRow();
      const [row] = await db
        .update(siteSettingsTable)
        .set({
          payload: sql`coalesce(${siteSettingsTable.payload}, '{}'::jsonb) || ${JSON.stringify(validation.patch)}::jsonb`,
          updatedBy: req.authUserId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(siteSettingsTable.key, "global"))
        .returning({ payload: siteSettingsTable.payload });
      res.json(publicSettings(row?.payload));
    } catch {
      res.status(500).json({ error: "Unable to update site settings." });
    }
  },
);

function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);
  return cleaned || "image";
}

function matchesImageSignature(mimeType: string, bytes: Buffer): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      );
    case "image/gif":
      return (
        bytes.length >= 6 &&
        ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))
      );
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

router.post("/admin/assets", requireAdmin, async (req, res): Promise<void> => {
  const body: unknown = req.body;
  if (!isRecord(body)) {
    res.status(400).json({ error: "Invalid asset upload." });
    return;
  }
  const allowedKeys = new Set([
    "fileName",
    "mimeType",
    "altText",
    "data",
    "byteSize",
  ]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    res.status(400).json({ error: "Unexpected asset upload field." });
    return;
  }
  if (
    !isText(body.fileName, 512, 1) ||
    !isText(body.mimeType, 40, 1) ||
    !ALLOWED_IMAGE_TYPES.has(body.mimeType) ||
    !isText(body.altText, 300) ||
    typeof body.data !== "string" ||
    body.data.length === 0 ||
    body.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4
  ) {
    res.status(400).json({ error: "Invalid asset upload fields." });
    return;
  }
  if (
    body.byteSize !== undefined &&
    (typeof body.byteSize !== "number" ||
      !Number.isSafeInteger(body.byteSize) ||
      body.byteSize < 1)
  ) {
    res.status(400).json({ error: "Invalid declared byteSize." });
    return;
  }
  const base64 = body.data;
  if (
    base64.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  ) {
    res.status(400).json({ error: "Image data must be valid base64." });
    return;
  }
  const bytes = Buffer.from(base64, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_IMAGE_BYTES ||
    bytes.toString("base64") !== base64 ||
    (body.byteSize !== undefined && body.byteSize !== bytes.length) ||
    !matchesImageSignature(body.mimeType, bytes)
  ) {
    res
      .status(400)
      .json({ error: "Image bytes, size, or MIME type are invalid." });
    return;
  }
  try {
    const [asset] = await db
      .insert(siteAssetsTable)
      .values({
        fileName: sanitizeFileName(body.fileName),
        mimeType: body.mimeType,
        byteSize: bytes.length,
        bytes,
        altText: body.altText,
        isPublic: true,
        uploadedBy: req.authUserId ?? null,
      })
      .returning({
        id: siteAssetsTable.id,
        fileName: siteAssetsTable.fileName,
        mimeType: siteAssetsTable.mimeType,
        byteSize: siteAssetsTable.byteSize,
        altText: siteAssetsTable.altText,
      });
    res.status(201).json({ ...asset, url: `/api/assets/${asset.id}` });
  } catch {
    res.status(500).json({ error: "Unable to save asset." });
  }
});

function sendAsset(
  res: Response,
  asset: { mimeType: string; bytes: Buffer; isPublic: boolean },
): void {
  res
    .set("Content-Type", asset.mimeType)
    .set("X-Content-Type-Options", "nosniff")
    .set(
      "Cache-Control",
      asset.isPublic ? "public, max-age=86400, immutable" : "private, no-store",
    )
    .status(200)
    .send(asset.bytes);
}

router.get(
  "/assets/:id",
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      res.status(400).json({ error: "Invalid asset id." });
      return;
    }
    try {
      const [asset] = await db
        .select({
          mimeType: siteAssetsTable.mimeType,
          bytes: siteAssetsTable.bytes,
          isPublic: siteAssetsTable.isPublic,
        })
        .from(siteAssetsTable)
        .where(eq(siteAssetsTable.id, id))
        .limit(1);
      if (!asset) {
        res.status(404).json({ error: "Asset not found." });
        return;
      }
      if (asset.isPublic) {
        sendAsset(res, asset);
        return;
      }
      requireAdmin(req, res, () => sendAsset(res, asset));
    } catch {
      res.status(500).json({ error: "Unable to load asset." });
    }
  },
);

export default router;
