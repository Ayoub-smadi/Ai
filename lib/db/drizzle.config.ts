import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: "./migrations",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
