import { and, eq, ilike, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { db, productsTable } from "@workspace/db";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use("/products", requireAuth);

router.get("/products", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product search." });
    return;
  }

  const filters = [eq(productsTable.workspaceId, context.workspaceId)];
  if (parsed.data.category) {
    filters.push(eq(productsTable.category, parsed.data.category));
  }
  if (parsed.data.availability) {
    filters.push(eq(productsTable.availability, parsed.data.availability));
  }
  if (parsed.data.search?.trim()) {
    const term = `%${parsed.data.search.trim()}%`;
    filters.push(
      or(
        ilike(productsTable.nameArabic, term),
        ilike(productsTable.nameEnglish, term),
        ilike(productsTable.description, term),
        ilike(productsTable.sku, term),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(and(...filters))
    .orderBy(productsTable.createdAt);
  res.json(ListProductsResponse.parse(rows));
});

router.post("/products", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      workspaceId: context.workspaceId,
      nameArabic: data.nameArabic ?? null,
      nameEnglish: data.nameEnglish ?? null,
      aliases: data.aliases ?? [],
      description: data.description ?? null,
      category: data.category ?? null,
      price: data.price ?? null,
      currency: data.currency.toUpperCase(),
      unit: data.unit ?? null,
      packageSize: data.packageSize ?? null,
      availability: data.availability,
      stockQuantity: data.stockQuantity ?? null,
      sku: data.sku ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json(CreateProductResponse.parse(product));
});

router.patch("/products/:productId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid product update." });
    return;
  }
  const [product] = await db
    .update(productsTable)
    .set({
      ...parsed.data,
      currency: parsed.data.currency?.toUpperCase(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.workspaceId, context.workspaceId),
      ),
    )
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(UpdateProductResponse.parse(product));
});

router.delete("/products/:productId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid product." });
    return;
  }
  const [product] = await db
    .delete(productsTable)
    .where(
      and(
        eq(productsTable.id, params.data.productId),
        eq(productsTable.workspaceId, context.workspaceId),
      ),
    )
    .returning({ id: productsTable.id });
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;
