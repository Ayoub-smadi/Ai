CREATE TABLE "ayoub_client_storage" (
	"scope" text DEFAULT 'shared' NOT NULL,
	"storage_key" text NOT NULL,
	"storage_value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ayoub_client_storage_scope_key_pk" PRIMARY KEY("scope","storage_key")
);
--> statement-breakpoint
CREATE INDEX "ayoub_client_storage_scope_idx" ON "ayoub_client_storage" USING btree ("scope");