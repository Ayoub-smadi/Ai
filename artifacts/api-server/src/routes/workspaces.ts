import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, workspaceMembersTable, workspacesTable } from "@workspace/db";
import {
  CreateWorkspaceBody,
  CreateWorkspaceResponse,
  ListWorkspacesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use("/workspaces", requireAuth);

router.get("/workspaces", async (req, res): Promise<void> => {
  const userId = req.authUserId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  const rows = await db
    .select({
      id: workspacesTable.id,
      name: workspacesTable.name,
      createdAt: workspacesTable.createdAt,
    })
    .from(workspacesTable)
    .innerJoin(
      workspaceMembersTable,
      and(
        eq(workspaceMembersTable.workspaceId, workspacesTable.id),
        eq(workspaceMembersTable.userId, userId),
      ),
    )
    .orderBy(workspacesTable.createdAt);
  res.json(ListWorkspacesResponse.parse(rows));
});

router.post("/workspaces", async (req, res): Promise<void> => {
  const userId = req.authUserId;
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const workspace = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workspacesTable)
      .values({ name: parsed.data.name.trim(), ownerId: userId })
      .returning();
    await tx.insert(workspaceMembersTable).values({
      workspaceId: created.id,
      userId,
      role: "owner",
    });
    return created;
  });

  res.status(201).json(
    CreateWorkspaceResponse.parse({
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
    }),
  );
});

export default router;
