CREATE TABLE "ayoub_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"tone" text DEFAULT 'Friendly and professional' NOT NULL,
	"greeting" text DEFAULT 'Hello! How can I help you?' NOT NULL,
	"fallback" text DEFAULT 'I don''t have that information yet. I can connect you with a person.' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_business_profiles" (
	"workspace_id" integer PRIMARY KEY NOT NULL,
	"introduction" text DEFAULT '' NOT NULL,
	"branches" text DEFAULT '' NOT NULL,
	"contact_info" text DEFAULT '' NOT NULL,
	"working_hours" text DEFAULT '' NOT NULL,
	"delivery_policy" text DEFAULT '' NOT NULL,
	"payment_methods" text DEFAULT '' NOT NULL,
	"return_policy" text DEFAULT '' NOT NULL,
	"exchange_policy" text DEFAULT '' NOT NULL,
	"warranty_policy" text DEFAULT '' NOT NULL,
	"promotions" text DEFAULT '' NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"alternatives" text[] DEFAULT '{}'::text[] NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"category" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name_arabic" text,
	"name_english" text,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"category" text,
	"price" numeric(12, 4),
	"currency" text DEFAULT 'JOD' NOT NULL,
	"unit" text,
	"package_size" text,
	"availability" text DEFAULT 'unknown' NOT NULL,
	"stock_quantity" integer,
	"sku" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_test_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"workspace_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_workspace_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ayoub_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ayoub_agents" ADD CONSTRAINT "ayoub_agents_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_business_profiles" ADD CONSTRAINT "ayoub_business_profiles_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_faqs" ADD CONSTRAINT "ayoub_faqs_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_products" ADD CONSTRAINT "ayoub_products_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_test_messages" ADD CONSTRAINT "ayoub_test_messages_session_id_ayoub_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ayoub_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_test_messages" ADD CONSTRAINT "ayoub_test_messages_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_test_sessions" ADD CONSTRAINT "ayoub_test_sessions_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_test_sessions" ADD CONSTRAINT "ayoub_test_sessions_agent_id_ayoub_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ayoub_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ayoub_workspace_members" ADD CONSTRAINT "ayoub_workspace_members_workspace_id_ayoub_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ayoub_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ayoub_agents_workspace_idx" ON "ayoub_agents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ayoub_faqs_workspace_idx" ON "ayoub_faqs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ayoub_products_workspace_idx" ON "ayoub_products" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ayoub_products_workspace_category_idx" ON "ayoub_products" USING btree ("workspace_id","category");--> statement-breakpoint
CREATE INDEX "ayoub_test_messages_session_idx" ON "ayoub_test_messages" USING btree ("session_id","id");--> statement-breakpoint
CREATE INDEX "ayoub_test_messages_workspace_idx" ON "ayoub_test_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ayoub_test_sessions_workspace_idx" ON "ayoub_test_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ayoub_workspace_members_workspace_user_uq" ON "ayoub_workspace_members" USING btree ("workspace_id","user_id");