CREATE TABLE "ayoub_app_users" (
	"open_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"preferred_language" text DEFAULT 'ar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_price_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"request" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quoted_total" numeric(12, 4),
	"currency" text DEFAULT 'JOD' NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_site_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_site_settings" (
	"key" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_store_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"delivery_address" text DEFAULT '' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total" numeric(12, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_note" text DEFAULT '' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_store_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_arabic" text NOT NULL,
	"name_english" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"price" numeric(12, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"sku" text,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"image_id" uuid,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ayoub_site_assets" ADD CONSTRAINT "ayoub_site_assets_uploaded_by_ayoub_app_users_open_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."ayoub_app_users"("open_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_site_settings" ADD CONSTRAINT "ayoub_site_settings_updated_by_ayoub_app_users_open_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."ayoub_app_users"("open_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_store_products" ADD CONSTRAINT "ayoub_store_products_image_id_ayoub_site_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."ayoub_site_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ayoub_price_quotes_status_created_idx" ON "ayoub_price_quotes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ayoub_site_assets_public_idx" ON "ayoub_site_assets" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "ayoub_store_orders_status_created_idx" ON "ayoub_store_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ayoub_store_products_published_idx" ON "ayoub_store_products" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "ayoub_store_products_category_idx" ON "ayoub_store_products" USING btree ("category");