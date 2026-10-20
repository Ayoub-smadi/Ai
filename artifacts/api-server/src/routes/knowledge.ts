import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateFaqBody,
  CreateFaqResponse,
  DeleteFaqParams,
  GetBusinessProfileResponse,
  ListFaqsResponse,
  SaveBusinessProfileBody,
  SaveBusinessProfileResponse,
  UpdateFaqBody,
  UpdateFaqParams,
  UpdateFaqResponse,
} from "@workspace/api-zod";
import { businessProfilesTable, db, faqsTable } from "@workspace/db";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use("/faqs", requireAuth);
router.use("/business-profile", requireAuth);

router.get("/faqs", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const rows = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.workspaceId, context.workspaceId))
    .orderBy(faqsTable.createdAt);
  res.json(ListFaqsResponse.parse(rows));
});

router.post("/faqs", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const parsed = CreateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [faq] = await db
    .insert(faqsTable)
    .values({
      workspaceId: context.workspaceId,
      question: data.question,
      answer: data.answer,
      alternatives: data.alternatives ?? [],
      language: data.language,
      category: data.category ?? null,
      enabled: data.enabled,
    })
    .returning();
  res.status(201).json(CreateFaqResponse.parse(faq));
});

router.patch("/faqs/:faqId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = UpdateFaqParams.safeParse(req.params);
  const parsed = UpdateFaqBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid FAQ update." });
    return;
  }
  const [faq] = await db
    .update(faqsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(faqsTable.id, params.data.faqId),
        eq(faqsTable.workspaceId, context.workspaceId),
      ),
    )
    .returning();
  if (!faq) {
    res.status(404).json({ error: "FAQ not found." });
    return;
  }
  res.json(UpdateFaqResponse.parse(faq));
});

router.delete("/faqs/:faqId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = DeleteFaqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid FAQ." });
    return;
  }
  const [faq] = await db
    .delete(faqsTable)
    .where(
      and(
        eq(faqsTable.id, params.data.faqId),
        eq(faqsTable.workspaceId, context.workspaceId),
      ),
    )
    .returning({ id: faqsTable.id });
  if (!faq) {
    res.status(404).json({ error: "FAQ not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/business-profile", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const [profile] = await db
    .select()
    .from(businessProfilesTable)
    .where(eq(businessProfilesTable.workspaceId, context.workspaceId))
    .limit(1);
  const emptyProfile = {
    workspaceId: context.workspaceId,
    introduction: "",
    branches: "",
    contactInfo: "",
    workingHours: "",
    deliveryPolicy: "",
    paymentMethods: "",
    returnPolicy: "",
    exchangePolicy: "",
    warrantyPolicy: "",
    promotions: "",
    terms: "",
    updatedAt: null,
  };
  res.json(GetBusinessProfileResponse.parse(profile ?? emptyProfile));
});

router.put("/business-profile", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const parsed = SaveBusinessProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db
    .insert(businessProfilesTable)
    .values({
      workspaceId: context.workspaceId,
      ...parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: businessProfilesTable.workspaceId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.json(SaveBusinessProfileResponse.parse(profile));
});

export default router;
