import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Compatibility storage for the legacy public/admin UI.
 * Values remain strings to preserve localStorage semantics, including data URLs
 * used by the existing image and document editors.
 */
export const clientStorageTable = pgTable(
  "ayoub_client_storage",
  {
    scope: text("scope").notNull().default("shared"),
    storageKey: text("storage_key").notNull(),
    storageValue: text("storage_value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.scope, table.storageKey],
      name: "ayoub_client_storage_scope_key_pk",
    }),
    index("ayoub_client_storage_scope_idx").on(table.scope),
  ],
);

export type ClientStorageEntry = typeof clientStorageTable.$inferSelect;
