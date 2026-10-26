import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  db,
  priceQuotesTable,
  siteAssetsTable,
  storeOrdersTable,
  storeProductsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MONEY_UNITS = 999_999_999_999n; // numeric(12,4) maximum
const ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
const QUOTE_STATUSES = new Set([
  "requested",
  "reviewing",
  "quoted",
  "accepted",
  "declined",
  "expired",
]);

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

function parseMoney(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && (!Number.isFinite(value) || value < 0))
    return null;
  const text = String(value).trim();
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,4}))?$/.exec(text);
  if (!match) return null;
  return `${match[1]}${match[2] ? `.${match[2]}` : ""}`;
}

function moneyToUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
}

function unitsToMoney(units: bigint): string {
  const whole = units / 10_000n;
  const fractional = (units % 10_000n)
    .toString()
    .padStart(4, "0")
    .replace(/0+$/, "");
  return fractional ? `${whole}.${fractional}` : whole.toString();
}

function validEmail(value: unknown): value is string {
  return (
    isText(value, 254, 3) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
    !value.includes("..")
  );
}

function validCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function validOptionalEmail(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "")
    return value === undefined ? undefined : null;
  return validEmail(value) ? value : undefined;
}

function imageUrl(imageId: string | null): string | null {
  return imageId ? `/api/assets/${imageId}` : null;
}

function mapProduct(product: typeof storeProductsTable.$inferSelect) {
  return { ...product, imageUrl: imageUrl(product.imageId) };
}

const PRODUCT_FIELDS = new Set([
  "nameArabic",
  "nameEnglish",
  "description",
  "category",
  "price",
  "currency",
  "sku",
  "stockQuantity",
  "imageId",
  "isPublished",
]);

function validateProductBody(
  input: unknown,
  partial: boolean,
): { values?: Record<string, unknown>; error?: string } {
  if (
    !isRecord(input) ||
    Object.keys(input).some((key) => !PRODUCT_FIELDS.has(key))
  ) {
    return { error: "Invalid product fields." };
  }
  if (!partial && !("nameArabic" in input))
    return { error: "nameArabic is required." };
  if (partial && Object.keys(input).length === 0)
    return { error: "Provide at least one product field." };
  const values: Record<string, unknown> = {};
  const textFields: Record<string, number> = {
    nameArabic: 200,
    nameEnglish: 200,
    description: 4000,
    category: 120,
    sku: 120,
  };
  for (const [key, max] of Object.entries(textFields)) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === "sku" && value === null) {
      values.sku = null;
      continue;
    }
    if (!isText(value, max, key === "nameArabic" ? 1 : 0))
      return { error: `Invalid ${key}.` };
    values[key] = value;
  }
  if ("price" in input) {
    const price = parseMoney(input.price);
    if (price === null)
      return {
        error:
          "price must be a nonnegative decimal with at most four fractional digits.",
      };
    values.price = price;
  } else if (!partial) {
    values.price = "0";
  }
  if ("currency" in input) {
    if (
      typeof input.currency !== "string" ||
      !/^[A-Za-z]{3}$/.test(input.currency)
    ) {
      return { error: "currency must be a three-letter code." };
    }
    values.currency = input.currency.toUpperCase();
  } else if (!partial) {
    values.currency = "JOD";
  }
  if ("stockQuantity" in input) {
    if (
      !Number.isSafeInteger(input.stockQuantity) ||
      (input.stockQuantity as number) < 0 ||
      (input.stockQuantity as number) > 2_147_483_647
    ) {
      return { error: "stockQuantity must be a nonnegative 32-bit integer." };
    }
    values.stockQuantity = input.stockQuantity;
  } else if (!partial) {
    values.stockQuantity = 0;
  }
  if ("imageId" in input) {
    if (
      input.imageId !== null &&
      (typeof input.imageId !== "string" || !UUID_RE.test(input.imageId))
    ) {
      return { error: "imageId must be a valid asset id or null." };
    }
    values.imageId = input.imageId;
  }
  if ("isPublished" in input) {
    if (typeof input.isPublished !== "boolean")
      return { error: "isPublished must be boolean." };
    values.isPublished = input.isPublished;
  } else if (!partial) {
    values.isPublished = false;
  }
  return { values };
}

async function imageExists(imageId: unknown): Promise<boolean> {
  if (imageId === null || imageId === undefined) return true;
  const [asset] = await db
    .select({ id: siteAssetsTable.id })
    .from(siteAssetsTable)
    .where(eq(siteAssetsTable.id, imageId as string))
    .limit(1);
  return Boolean(asset);
}

router.get("/store/products", async (_req, res): Promise<void> => {
  try {
    const products = await db
      .select()
      .from(storeProductsTable)
      .where(eq(storeProductsTable.isPublished, true))
      .orderBy(desc(storeProductsTable.createdAt))
      .limit(100);
    res.json(products.map(mapProduct));
  } catch {
    res.status(500).json({ error: "Unable to load products." });
  }
});

router.get(
  "/admin/store/products",
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      const products = await db
        .select()
        .from(storeProductsTable)
        .orderBy(desc(storeProductsTable.createdAt))
        .limit(100);
      res.json(products.map(mapProduct));
    } catch {
      res.status(500).json({ error: "Unable to load products." });
    }
  },
);

router.post(
  "/admin/store/products",
  requireAdmin,
  async (req, res): Promise<void> => {
    const validation = validateProductBody(req.body, false);
    if (!validation.values) {
      res.status(400).json({ error: validation.error ?? "Invalid product." });
      return;
    }
    try {
      if (!(await imageExists(validation.values.imageId))) {
        res.status(400).json({ error: "imageId does not refer to an asset." });
        return;
      }
      const [product] = await db
        .insert(storeProductsTable)
        .values(validation.values as typeof storeProductsTable.$inferInsert)
        .returning();
      res.status(201).json(mapProduct(product));
    } catch {
      res.status(500).json({ error: "Unable to create product." });
    }
  },
);

router.patch(
  "/admin/store/products/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : "";
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid product id." });
      return;
    }
    const validation = validateProductBody(req.body, true);
    if (!validation.values) {
      res
        .status(400)
        .json({ error: validation.error ?? "Invalid product update." });
      return;
    }
    try {
      if (!(await imageExists(validation.values.imageId))) {
        res.status(400).json({ error: "imageId does not refer to an asset." });
        return;
      }
      const [product] = await db
        .update(storeProductsTable)
        .set({
          ...(validation.values as Partial<
            typeof storeProductsTable.$inferInsert
          >),
          updatedAt: new Date(),
        })
        .where(eq(storeProductsTable.id, id))
        .returning();
      if (!product) {
        res.status(404).json({ error: "Product not found." });
        return;
      }
      res.json(mapProduct(product));
    } catch {
      res.status(500).json({ error: "Unable to update product." });
    }
  },
);

function parseListLimit(value: unknown): number | null {
  if (value === undefined) return 50;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= 100
    ? limit
    : null;
}

router.post("/public/orders", async (req, res): Promise<void> => {
  const body: unknown = req.body;
  if (!isRecord(body)) {
    res.status(400).json({ error: "Invalid order." });
    return;
  }
  const allowed = new Set([
    "customerName",
    "phone",
    "email",
    "address",
    "items",
    "note",
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    res.status(400).json({ error: "Unexpected order field." });
    return;
  }
  const email = validOptionalEmail(body.email);
  if (
    !isText(body.customerName, 160, 1) ||
    !isText(body.phone, 40, 1) ||
    !/^[+\d ()-]+$/.test(body.phone) ||
    (body.email !== undefined && email === undefined) ||
    !isText(body.address, 1200) ||
    !isText(body.note ?? "", 2000) ||
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 50
  ) {
    res.status(400).json({ error: "Invalid order details." });
    return;
  }
  const items: { productId: string; quantity: number }[] = [];
  const seen = new Set<string>();
  for (const item of body.items) {
    if (
      !isRecord(item) ||
      Object.keys(item).some(
        (key) => key !== "productId" && key !== "quantity",
      ) ||
      typeof item.productId !== "string" ||
      !UUID_RE.test(item.productId) ||
      !Number.isSafeInteger(item.quantity) ||
      (item.quantity as number) < 1 ||
      (item.quantity as number) > 10_000 ||
      seen.has(item.productId)
    ) {
      res.status(400).json({
        error:
          "Each order item must have a unique published productId and valid quantity.",
      });
      return;
    }
    seen.add(item.productId);
    items.push({
      productId: item.productId,
      quantity: item.quantity as number,
    });
  }
  try {
    const products = await db
      .select()
      .from(storeProductsTable)
      .where(
        and(
          inArray(
            storeProductsTable.id,
            items.map((item) => item.productId),
          ),
          eq(storeProductsTable.isPublished, true),
        ),
      );
    if (products.length !== items.length) {
      res.status(400).json({ error: "One or more products are unavailable." });
      return;
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    const currencies = new Set(
      products.map((product) => product.currency.toUpperCase()),
    );
    if (currencies.size !== 1) {
      res
        .status(400)
        .json({ error: "Products in one order must use the same currency." });
      return;
    }
    let totalUnits = 0n;
    const snapshots: {
      productId: string;
      name: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
    }[] = [];
    for (const item of items) {
      const product = byId.get(item.productId)!;
      if (product.stockQuantity < item.quantity) {
        res.status(409).json({ error: "Requested quantity exceeds available stock." });
        return;
      }
      const unitPrice = parseMoney(product.price);
      if (unitPrice === null) {
        res.status(409).json({
          error: "A product has an invalid price and cannot be ordered.",
        });
        return;
      }
      const unitUnits = moneyToUnits(unitPrice);
      const lineUnits = unitUnits * BigInt(item.quantity);
      totalUnits += lineUnits;
      if (lineUnits > MAX_MONEY_UNITS || totalUnits > MAX_MONEY_UNITS) {
        res
          .status(400)
          .json({ error: "Order total exceeds the supported amount." });
        return;
      }
      snapshots.push({
        productId: product.id,
        name: product.nameEnglish || product.nameArabic,
        quantity: item.quantity,
        unitPrice: unitsToMoney(unitUnits),
        lineTotal: unitsToMoney(lineUnits),
      });
    }
    const [order] = await db
      .insert(storeOrdersTable)
      .values({
        customerName: body.customerName,
        phone: body.phone,
        email: email ?? null,
        deliveryAddress: body.address,
        items: snapshots,
        total: unitsToMoney(totalUnits),
        currency: [...currencies][0],
        customerNote: (body.note as string | undefined) ?? "",
      })
      .returning({
        id: storeOrdersTable.id,
        status: storeOrdersTable.status,
        total: storeOrdersTable.total,
        currency: storeOrdersTable.currency,
        createdAt: storeOrdersTable.createdAt,
      });
    res.status(201).json(order);
  } catch {
    // Customer contact details are intentionally never logged.
    res.status(500).json({ error: "Unable to submit order." });
  }
});

router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  const limit = parseListLimit(req.query.limit);
  if (limit === null) {
    res.status(400).json({ error: "limit must be an integer from 1 to 100." });
    return;
  }
  try {
    const orders = await db
      .select()
      .from(storeOrdersTable)
      .orderBy(desc(storeOrdersTable.createdAt))
      .limit(limit);
    res.json(orders);
  } catch {
    res.status(500).json({ error: "Unable to load orders." });
  }
});

router.patch(
  "/admin/orders/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : "";
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid order id." });
      return;
    }
    const body: unknown = req.body;
    if (
      !isRecord(body) ||
      Object.keys(body).length === 0 ||
      Object.keys(body).some((key) => key !== "status" && key !== "adminNote")
    ) {
      res.status(400).json({ error: "Invalid order update." });
      return;
    }
    const update: Record<string, unknown> = {};
    if ("status" in body) {
      if (typeof body.status !== "string" || !ORDER_STATUSES.has(body.status)) {
        res.status(400).json({ error: "Invalid order status." });
        return;
      }
      update.status = body.status;
    }
    if ("adminNote" in body) {
      if (!isText(body.adminNote, 5000)) {
        res.status(400).json({ error: "Invalid adminNote." });
        return;
      }
      update.adminNote = body.adminNote;
    }
    try {
      const [order] = await db
        .update(storeOrdersTable)
        .set({
          ...(update as Partial<typeof storeOrdersTable.$inferInsert>),
          updatedAt: new Date(),
        })
        .where(eq(storeOrdersTable.id, id))
        .returning();
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      res.json(order);
    } catch {
      res.status(500).json({ error: "Unable to update order." });
    }
  },
);

router.post("/public/quotes", async (req, res): Promise<void> => {
  const body: unknown = req.body;
  if (
    !isRecord(body) ||
    Object.keys(body).some(
      (key) => !["customerName", "phone", "email", "request"].includes(key),
    )
  ) {
    res.status(400).json({ error: "Invalid quote request." });
    return;
  }
  const email = validOptionalEmail(body.email);
  if (
    !isText(body.customerName, 160, 1) ||
    !isText(body.phone, 40, 1) ||
    !/^[+\d ()-]+$/.test(body.phone) ||
    (body.email !== undefined && email === undefined) ||
    !isText(body.request, 5000, 1)
  ) {
    res.status(400).json({ error: "Invalid quote details." });
    return;
  }
  try {
    const [quote] = await db
      .insert(priceQuotesTable)
      .values({
        customerName: body.customerName,
        phone: body.phone,
        email: email ?? null,
        request: body.request,
      })
      .returning({
        id: priceQuotesTable.id,
        status: priceQuotesTable.status,
        createdAt: priceQuotesTable.createdAt,
      });
    res.status(201).json(quote);
  } catch {
    // Customer contact details are intentionally never logged.
    res.status(500).json({ error: "Unable to submit quote request." });
  }
});

router.get("/admin/quotes", requireAdmin, async (req, res): Promise<void> => {
  const limit = parseListLimit(req.query.limit);
  if (limit === null) {
    res.status(400).json({ error: "limit must be an integer from 1 to 100." });
    return;
  }
  try {
    const quotes = await db
      .select()
      .from(priceQuotesTable)
      .orderBy(desc(priceQuotesTable.createdAt))
      .limit(limit);
    res.json(quotes);
  } catch {
    res.status(500).json({ error: "Unable to load quotes." });
  }
});

router.patch(
  "/admin/quotes/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : "";
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Invalid quote id." });
      return;
    }
    const body: unknown = req.body;
    const allowed = new Set(["status", "quotedTotal", "currency", "adminNote"]);
    if (
      !isRecord(body) ||
      Object.keys(body).length === 0 ||
      Object.keys(body).some((key) => !allowed.has(key))
    ) {
      res.status(400).json({ error: "Invalid quote update." });
      return;
    }
    const update: Record<string, unknown> = {};
    if ("status" in body) {
      if (typeof body.status !== "string" || !QUOTE_STATUSES.has(body.status)) {
        res.status(400).json({ error: "Invalid quote status." });
        return;
      }
      update.status = body.status;
    }
    if ("quotedTotal" in body) {
      if (body.quotedTotal === null) update.quotedTotal = null;
      else {
        const amount = parseMoney(body.quotedTotal);
        if (amount === null) {
          res.status(400).json({
            error:
              "quotedTotal must be a nonnegative decimal with at most four fractional digits, or null.",
          });
          return;
        }
        update.quotedTotal = amount;
      }
    }
    if ("currency" in body) {
      if (
        typeof body.currency !== "string" ||
        !/^[A-Za-z]{3}$/.test(body.currency)
      ) {
        res
          .status(400)
          .json({ error: "currency must be a three-letter code." });
        return;
      }
      update.currency = body.currency.toUpperCase();
    }
    if ("adminNote" in body) {
      if (!isText(body.adminNote, 5000)) {
        res.status(400).json({ error: "Invalid adminNote." });
        return;
      }
      update.adminNote = body.adminNote;
    }
    try {
      const [quote] = await db
        .update(priceQuotesTable)
        .set({
          ...(update as Partial<typeof priceQuotesTable.$inferInsert>),
          updatedAt: new Date(),
        })
        .where(eq(priceQuotesTable.id, id))
        .returning();
      if (!quote) {
        res.status(404).json({ error: "Quote not found." });
        return;
      }
      res.json(quote);
    } catch {
      res.status(500).json({ error: "Unable to update quote." });
    }
  },
);

export default router;
