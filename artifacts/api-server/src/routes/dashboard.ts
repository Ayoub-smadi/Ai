import { Router, type IRouter } from "express";
import { count, desc, eq } from "drizzle-orm";
import { GetDashboardResponse } from "@workspace/api-zod";
import {
  agentsTable,
  db,
  faqsTable,
  productsTable,
  testMessagesTable,
  testSessionsTable,
} from "@workspace/db";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use("/dashboard", requireAuth);

router.get("/dashboard", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const workspaceId = context.workspaceId;
  const [
    agentCount,
    activeAgentCount,
    productCount,
    faqCount,
    sessionCount,
    messageCount,
    agents,
    products,
    faqs,
  ] = await Promise.all([
    db.select({ value: count() }).from(agentsTable).where(eq(agentsTable.workspaceId, workspaceId)),
    db.select({ value: count() }).from(agentsTable).where(
      eq(agentsTable.workspaceId, workspaceId),
    ).then(async (rows) => {
      const active = await db
        .select({ value: count() })
        .from(agentsTable)
        .where(eq(agentsTable.workspaceId, workspaceId));
      return rows.length ? active : [];
    }),
    db.select({ value: count() }).from(productsTable).where(eq(productsTable.workspaceId, workspaceId)),
    db.select({ value: count() }).from(faqsTable).where(eq(faqsTable.workspaceId, workspaceId)),
    db.select({ value: count() }).from(testSessionsTable).where(eq(testSessionsTable.workspaceId, workspaceId)),
    db.select({ value: count() }).from(testMessagesTable).where(eq(testMessagesTable.workspaceId, workspaceId)),
    db.select({ id: agentsTable.id, name: agentsTable.name, createdAt: agentsTable.createdAt })
      .from(agentsTable)
      .where(eq(agentsTable.workspaceId, workspaceId))
      .orderBy(desc(agentsTable.createdAt))
      .limit(4),
    db.select({ id: productsTable.id, name: productsTable.nameEnglish, createdAt: productsTable.createdAt })
      .from(productsTable)
      .where(eq(productsTable.workspaceId, workspaceId))
      .orderBy(desc(productsTable.createdAt))
      .limit(4),
    db.select({ id: faqsTable.id, question: faqsTable.question, createdAt: faqsTable.createdAt })
      .from(faqsTable)
      .where(eq(faqsTable.workspaceId, workspaceId))
      .orderBy(desc(faqsTable.createdAt))
      .limit(4),
  ]);

  const activeCount = await db
    .select({ value: count() })
    .from(agentsTable)
    .where(eq(agentsTable.workspaceId, workspaceId));
  const statusRows = await db
    .select({ status: agentsTable.status })
    .from(agentsTable)
    .where(eq(agentsTable.workspaceId, workspaceId));
  const realActiveCount = statusRows.filter((row) => row.status === "active").length;
  const activities = [
    ...agents.map((agent) => ({
      id: `agent-${agent.id}`,
      title: "Agent created",
      detail: agent.name,
      createdAt: agent.createdAt,
    })),
    ...products.map((product) => ({
      id: `product-${product.id}`,
      title: "Product added",
      detail: product.name ?? "Unnamed product",
      createdAt: product.createdAt,
    })),
    ...faqs.map((faq) => ({
      id: `faq-${faq.id}`,
      title: "Approved answer added",
      detail: faq.question,
      createdAt: faq.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);
  void activeAgentCount;
  void activeCount;
  res.json(
    GetDashboardResponse.parse({
      agents: agentCount[0]?.value ?? 0,
      activeAgents: realActiveCount,
      products: productCount[0]?.value ?? 0,
      faqs: faqCount[0]?.value ?? 0,
      testSessions: sessionCount[0]?.value ?? 0,
      aiMessages: messageCount[0]?.value ?? 0,
      channels: 0,
      recentActivity: activities,
    }),
  );
});

export default router;
