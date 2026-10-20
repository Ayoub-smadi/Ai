import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const workspacesTable = pgTable("ayoub_workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembersTable = pgTable(
  "ayoub_workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ayoub_workspace_members_workspace_user_uq").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const agentsTable = pgTable(
  "ayoub_agents",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    language: text("language").notNull().default("ar"),
    tone: text("tone").notNull().default("Friendly and professional"),
    greeting: text("greeting").notNull().default("Hello! How can I help you?"),
    fallback: text("fallback")
      .notNull()
      .default("I don't have that information yet. I can connect you with a person."),
    instructions: text("instructions").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_agents_workspace_idx").on(table.workspaceId)],
);

export const productsTable = pgTable(
  "ayoub_products",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    nameArabic: text("name_arabic"),
    nameEnglish: text("name_english"),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    description: text("description"),
    category: text("category"),
    price: numeric("price", { precision: 12, scale: 4 }),
    currency: text("currency").notNull().default("JOD"),
    unit: text("unit"),
    packageSize: text("package_size"),
    availability: text("availability").notNull().default("unknown"),
    stockQuantity: integer("stock_quantity"),
    sku: text("sku"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ayoub_products_workspace_idx").on(table.workspaceId),
    index("ayoub_products_workspace_category_idx").on(table.workspaceId, table.category),
  ],
);

export const faqsTable = pgTable(
  "ayoub_faqs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    alternatives: text("alternatives").array().notNull().default(sql`'{}'::text[]`),
    language: text("language").notNull().default("ar"),
    category: text("category"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_faqs_workspace_idx").on(table.workspaceId)],
);

export const businessProfilesTable = pgTable("ayoub_business_profiles", {
  workspaceId: integer("workspace_id")
    .primaryKey()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  introduction: text("introduction").notNull().default(""),
  branches: text("branches").notNull().default(""),
  contactInfo: text("contact_info").notNull().default(""),
  workingHours: text("working_hours").notNull().default(""),
  deliveryPolicy: text("delivery_policy").notNull().default(""),
  paymentMethods: text("payment_methods").notNull().default(""),
  returnPolicy: text("return_policy").notNull().default(""),
  exchangePolicy: text("exchange_policy").notNull().default(""),
  warrantyPolicy: text("warranty_policy").notNull().default(""),
  promotions: text("promotions").notNull().default(""),
  terms: text("terms").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testSessionsTable = pgTable(
  "ayoub_test_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    agentId: integer("agent_id")
      .notNull()
      .references(() => agentsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_test_sessions_workspace_idx").on(table.workspaceId)],
);

export const testMessagesTable = pgTable(
  "ayoub_test_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessionsTable.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ayoub_test_messages_session_idx").on(table.sessionId, table.id),
    index("ayoub_test_messages_workspace_idx").on(table.workspaceId),
  ],
);

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({
  id: true,
  createdAt: true,
});
export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFaqSchema = createInsertSchema(faqsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;
export type Agent = typeof agentsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Faq = typeof faqsTable.$inferSelect;
