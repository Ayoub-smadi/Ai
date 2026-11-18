import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  agentsTable,
  db,
  faqsTable,
  productsTable,
  businessProfilesTable,
} from "@workspace/db";
import {
  CreateAgentBody,
  CreateAgentResponse,
  DeleteAgentParams,
  GetAgentParams,
  GetAgentResponse,
  ListAgentsResponse,
  SetAgentActivationBody,
  SetAgentActivationParams,
  SetAgentActivationResponse,
  UpdateAgentBody,
  UpdateAgentParams,
  UpdateAgentResponse,
} from "@workspace/api-zod";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use("/agents", requireAuth);

router.get("/agents", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const rows = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.workspaceId, context.workspaceId))
    .orderBy(agentsTable.createdAt);
  res.json(ListAgentsResponse.parse(rows));
});

router.post("/agents", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [agent] = await db
    .insert(agentsTable)
    .values({
      ...parsed.data,
      description: parsed.data.description ?? null,
      workspaceId: context.workspaceId,
    })
    .returning();
  res.status(201).json(CreateAgentResponse.parse(agent));
});

router.get("/agents/:agentId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = GetAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent." });
    return;
  }
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(
      and(
        eq(agentsTable.id, params.data.agentId),
        eq(agentsTable.workspaceId, context.workspaceId),
      ),
    )
    .limit(1);
  if (!agent) {
    res.status(404).json({ error: "Agent not found." });
    return;
  }
  res.json(GetAgentResponse.parse(agent));
});

router.patch("/agents/:agentId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = UpdateAgentParams.safeParse(req.params);
  const parsed = UpdateAgentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid agent update." });
    return;
  }
  const [agent] = await db
    .update(agentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(agentsTable.id, params.data.agentId),
        eq(agentsTable.workspaceId, context.workspaceId),
      ),
    )
    .returning();
  if (!agent) {
    res.status(404).json({ error: "Agent not found." });
    return;
  }
  res.json(UpdateAgentResponse.parse(agent));
});

router.post("/agents/:agentId/activation", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = SetAgentActivationParams.safeParse(req.params);
  const parsed = SetAgentActivationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid activation request." });
    return;
  }
  const [current] = await db
    .select()
    .from(agentsTable)
    .where(
      and(
        eq(agentsTable.id, params.data.agentId),
        eq(agentsTable.workspaceId, context.workspaceId),
      ),
    )
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Agent not found." });
    return;
  }
  if (parsed.data.status === "active") {
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.workspaceId, context.workspaceId))
      .limit(1);
    const [faq] = await db
      .select({ id: faqsTable.id })
      .from(faqsTable)
      .where(and(eq(faqsTable.workspaceId, context.workspaceId), eq(faqsTable.enabled, true)))
      .limit(1);
    const [profile] = await db
      .select({ introduction: businessProfilesTable.introduction })
      .from(businessProfilesTable)
      .where(eq(businessProfilesTable.workspaceId, context.workspaceId))
      .limit(1);
    const hasKnowledge =
      Boolean(product) ||
      Boolean(faq) ||
      Boolean(profile?.introduction.trim());
    if (!process.env.OPENAI_API_KEY || !hasKnowledge || !current.instructions.trim()) {
      res.status(400).json({
        error:
          "Add agent instructions and at least one saved product, FAQ, or business introduction, and configure AI before activating.",
      });
      return;
    }
  }
  const [agent] = await db
    .update(agentsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(agentsTable.id, current.id))
    .returning();
  res.json(SetAgentActivationResponse.parse(agent));
});

router.delete("/agents/:agentId", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = DeleteAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent." });
    return;
  }
  const [agent] = await db
    .select({ id: agentsTable.id })
    .from(agentsTable)
    .where(
      and(
        eq(agentsTable.id, params.data.agentId),
        eq(agentsTable.workspaceId, context.workspaceId),
      ),
    )
    .limit(1);
  if (!agent) {
    res.status(404).json({ error: "Agent not found." });
    return;
  }
  await db
    .delete(agentsTable)
    .where(
      and(
        eq(agentsTable.id, agent.id),
        eq(agentsTable.workspaceId, context.workspaceId),
      ),
    );
  res.sendStatus(204);
});

export default router;
