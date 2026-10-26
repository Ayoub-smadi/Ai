import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export type StoreLineItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export const appUsersTable = pgTable("ayoub_app_users", {
  openId: text("open_id").primaryKey(),
  email: text("email"),
  name: text("name"),
  role: text("role").notNull().default("member"),
  preferredLanguage: text("preferred_language").notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteSettingsTable = pgTable("ayoub_site_settings", {
  key: text("key").primaryKey().default("global"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedBy: text("updated_by").references(() => appUsersTable.openId, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteAssetsTable = pgTable(
  "ayoub_site_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    bytes: bytea("bytes").notNull(),
    altText: text("alt_text").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(true),
    uploadedBy: text("uploaded_by").references(() => appUsersTable.openId, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_site_assets_public_idx").on(table.isPublic)],
);

export const storeProductsTable = pgTable(
  "ayoub_store_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameArabic: text("name_arabic").notNull(),
    nameEnglish: text("name_english").notNull().default(""),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 4 }).notNull().default("0"),
    currency: text("currency").notNull().default("JOD"),
    sku: text("sku"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    imageId: uuid("image_id").references(() => siteAssetsTable.id, { onDelete: "set null" }),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ayoub_store_products_published_idx").on(table.isPublished),
    index("ayoub_store_products_category_idx").on(table.category),
  ],
);

export const storeOrdersTable = pgTable(
  "ayoub_store_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    deliveryAddress: text("delivery_address").notNull().default(""),
    items: jsonb("items").$type<StoreLineItem[]>().notNull().default(sql`'[]'::jsonb`),
    total: numeric("total", { precision: 12, scale: 4 }).notNull().default("0"),
    currency: text("currency").notNull().default("JOD"),
    status: text("status").notNull().default("pending"),
    customerNote: text("customer_note").notNull().default(""),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_store_orders_status_created_idx").on(table.status, table.createdAt)],
);

export const priceQuotesTable = pgTable(
  "ayoub_price_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    request: text("request").notNull(),
    items: jsonb("items").$type<StoreLineItem[]>().notNull().default(sql`'[]'::jsonb`),
    quotedTotal: numeric("quoted_total", { precision: 12, scale: 4 }),
    currency: text("currency").notNull().default("JOD"),
    status: text("status").notNull().default("requested"),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ayoub_price_quotes_status_created_idx").on(table.status, table.createdAt)],
);
