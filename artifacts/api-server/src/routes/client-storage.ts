import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "../../../../lib/api-zod/node_modules/zod/index.js";
import { clientStorageTable, db } from "@workspace/db";

const router: IRouter = Router();
const MAX_VALUE_BYTES = 12 * 1024 * 1024;
const scopeSchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{1,64}$/).default("shared");
const entrySchema = z.object({
  key: z.string().min(1).max(512),
  value: z.string().max(MAX_VALUE_BYTES),
});

function parseScope(value: unknown): string {
  const parsed = scopeSchema.safeParse(value ?? "shared");
  return parsed.success ? parsed.data : "shared";
}

router.get("/client-storage", async (req, res): Promise<void> => {
  const scope = parseScope(req.query.scope);
  const entries = await db
    .select({ key: clientStorageTable.storageKey, value: clientStorageTable.storageValue })
    .from(clientStorageTable)
    .where(eq(clientStorageTable.scope, scope));
  res.json({ scope, entries });
});

router.put("/client-storage", async (req, res): Promise<void> => {
  const scope = parseScope(req.body?.scope);
  const parsed = entrySchema.safeParse(req.body?.entry ?? req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid storage entry" });
    return;
  }

  await db
    .insert(clientStorageTable)
    .values({
      scope,
      storageKey: parsed.data.key,
      storageValue: parsed.data.value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [clientStorageTable.scope, clientStorageTable.storageKey],
      set: {
        storageValue: parsed.data.value,
        updatedAt: new Date(),
      },
    });

  res.status(204).end();
});

router.put("/client-storage/bulk", async (req, res): Promise<void> => {
  const scope = parseScope(req.body?.scope);
  const parsed = z.array(entrySchema).max(500).safeParse(req.body?.entries);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid storage entries" });
    return;
  }

  await db.transaction(async (tx) => {
    for (const entry of parsed.data) {
      await tx
        .insert(clientStorageTable)
        .values({
          scope,
          storageKey: entry.key,
          storageValue: entry.value,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [clientStorageTable.scope, clientStorageTable.storageKey],
          set: {
            storageValue: entry.value,
            updatedAt: new Date(),
          },
        });
    }
  });

  res.status(204).end();
});

router.delete("/client-storage", async (req, res): Promise<void> => {
  const scope = parseScope(req.query.scope);
  const key = typeof req.query.key === "string" ? req.query.key : "";
  if (!key || key.length > 512) {
    res.status(400).json({ error: "A valid storage key is required" });
    return;
  }

  await db
    .delete(clientStorageTable)
    .where(and(eq(clientStorageTable.scope, scope), eq(clientStorageTable.storageKey, key)));
  res.status(204).end();
});

export default router;
