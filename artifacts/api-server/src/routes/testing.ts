import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  SendAgentTestMessageBody,
  SendAgentTestMessageParams,
  SendAgentTestMessageResponse,
} from "@workspace/api-zod";
import {
  agentsTable,
  db,
  testMessagesTable,
  testSessionsTable,
} from "@workspace/db";
import { getWorkspaceContext, requireAuth } from "../middlewares/auth";
import { generateAgentTestReply } from "../lib/ai";

const router: IRouter = Router();
router.use("/agents", requireAuth);

router.post("/agents/:agentId/test-messages", async (req, res): Promise<void> => {
  const context = await getWorkspaceContext(req, res);
  if (!context) return;
  const params = SendAgentTestMessageParams.safeParse(req.params);
  const parsed = SendAgentTestMessageBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Enter a valid test message." });
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

  let conversationId = parsed.data.conversationId ?? null;
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (conversationId) {
    const [session] = await db
      .select({ id: testSessionsTable.id })
      .from(testSessionsTable)
      .where(
        and(
          eq(testSessionsTable.id, conversationId),
          eq(testSessionsTable.workspaceId, context.workspaceId),
          eq(testSessionsTable.agentId, agent.id),
        ),
      )
      .limit(1);
    if (!session) {
      res.status(404).json({ error: "Test conversation not found." });
      return;
    }
    const messages = await db
      .select({
        role: testMessagesTable.role,
        content: testMessagesTable.content,
      })
      .from(testMessagesTable)
      .where(eq(testMessagesTable.sessionId, session.id))
      .orderBy(asc(testMessagesTable.id));
    history = messages
      .filter(
        (message): message is typeof message & { role: "user" | "assistant" } =>
          message.role === "user" || message.role === "assistant",
      )
      .map((message) => ({ role: message.role, content: message.content }));
  }

  try {
    const result = await generateAgentTestReply({
      workspaceId: context.workspaceId,
      agentId: agent.id,
      message: parsed.data.content,
      conversationId,
      history,
    });
    if (!conversationId) {
      conversationId = randomUUID();
      await db.insert(testSessionsTable).values({
        id: conversationId,
        workspaceId: context.workspaceId,
        agentId: agent.id,
      });
    }
    await db.insert(testMessagesTable).values([
      {
        sessionId: conversationId,
        workspaceId: context.workspaceId,
        role: "user",
        content: parsed.data.content,
      },
      {
        sessionId: conversationId,
        workspaceId: context.workspaceId,
        role: "assistant",
        content: result.answer,
      },
    ]);
    res.json(
      SendAgentTestMessageResponse.parse({
        conversationId,
        userMessage: parsed.data.content,
        assistantMessage: result.answer,
        sources: result.sources,
        handoff: result.handoff,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") {
      res.status(503).json({ error: "AI responses are not configured yet." });
      return;
    }
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      res.status(404).json({ error: "Agent not found." });
      return;
    }
    req.log.error(
      { requestId: req.id },
      "AI test response failed",
    );
    res.status(503).json({
      error: "The AI provider could not complete this response. Try again shortly.",
    });
  }
});

export default router;
