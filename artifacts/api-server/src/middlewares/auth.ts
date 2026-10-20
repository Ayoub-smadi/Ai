import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { db, workspaceMembersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  req.authUserId = userId;
  next();
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
