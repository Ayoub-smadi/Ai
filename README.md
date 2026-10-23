# AYOUB AI Business Assistant

AYOUB AI is a bilingual (English/Arabic) business-assistant platform. Teams can create AI agents, maintain workspace-scoped product and FAQ knowledge, save business policies, and test grounded responses.

## Current implementation status

- **Implemented:** Clerk-gated sign-in, workspace creation and selection, workspace-scoped agent/product/FAQ/profile APIs, product CSV import/export, and saved AI test conversations.
- **Implemented but requires credentials:** persistent PostgreSQL storage, Clerk API authentication, and OpenAI-backed test responses.
- **Not implemented:** live WhatsApp, Instagram, or Messenger connections; customer conversation inbox; public chat widget; document upload and retrieval; organization invitations and role administration.
- **Not verified:** production deployment, live Clerk/OpenAI requests, or a live Neon database connection.

Do not treat channel status cards as connected integrations. The application only reports them as unconfigured.

## Requirements

- Node.js 20
- pnpm 10
- PostgreSQL (Neon is suitable)
- An external Clerk instance for sign-in and protected API access
- An OpenAI API key for live agent test responses

## Local development

1. Install the locked workspace dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Copy `.env.example` to `.env` and fill in the credentials from your own services. Do not commit `.env`.

3. Load the local environment and start the frontend and API:

   ```bash
   set -a
   . ./.env
   set +a
   pnpm run dev
   ```

   The Vite frontend uses port 5173 and the API uses port 5000 when run from the repository root. In Replit, use the artifact-managed workflows; they provide the configured ports and routing.

4. Run checks:

   ```bash
   pnpm run typecheck
   pnpm run build
   ```

There is currently no automated test script or test suite in the workspace.

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API runtime | PostgreSQL URL. For Neon, use the pooled connection string for the running API. |
| `MIGRATION_DATABASE_URL` | Optional schema migrations | Use a direct Neon connection string when available; otherwise migrations use `DATABASE_URL`. |
| `CLERK_PUBLISHABLE_KEY` | API authentication | Publishable key for the same external Clerk instance as `CLERK_SECRET_KEY`. |
| `CLERK_SECRET_KEY` | API authentication | Server-only. Never prefix with `VITE_`. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser sign-in | Same Clerk instance as the API keys. |
| `OPENAI_API_KEY` | AI test responses and agent activation | Server-only. Without it, AI requests return an explicit unavailable error. |
| `OPENAI_MODEL` | Optional AI model selection | Defaults to `gpt-5-mini`. |
| `VITE_CLERK_PROXY_URL` | Optional production Clerk proxy | Set only when configuring a Clerk proxy for the deployed domain. |

In Replit, store private values in Secrets and set browser-safe publishable keys as shared environment variables. This project currently uses an external Clerk configuration; do not assume the development and production keys or users are interchangeable.

## Neon database setup

1. Create a PostgreSQL project in Neon.
2. Add the Neon pooled connection string as `DATABASE_URL` in the API environment.
3. If Neon provides a non-pooled/direct connection string, set it as `MIGRATION_DATABASE_URL` for migration commands.
4. Apply the checked-in schema migration:

   ```bash
   pnpm --filter @workspace/db run migrate
   ```

5. To create a later migration after changing the Drizzle schema:

   ```bash
   pnpm --filter @workspace/db run generate
   ```

   Review and commit the generated SQL before applying it. Do not use `push-force` against a production database. The application will not create tables automatically; it requires the migrations to have been applied first.

## Clerk and OpenAI setup

1. Configure an external Clerk instance and use its matching publishable and secret keys for `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
2. Add `OPENAI_API_KEY` to the server environment to enable actual test responses. No API key is exposed to the browser.
3. Restart the API after changing server secrets. AI responses are not available until the OpenAI key and database are configured.

## Deployment

### Replit

The workspace contains a static Vite web artifact and a separate Express API service. Configure the production database and external-service environment variables, apply the Neon migration, then publish through Replit. Live external integrations have not been tested from this repository.

### Vercel

The frontend can be built as a Vite static site, but the repository does not currently include a Vercel adapter for the separate Express API. A Vercel-only deployment is therefore not ready: either host the API as a separate long-running service and route `/api` to it, or implement and verify a Vercel-compatible API deployment before publishing. Do not point production frontend requests at the development API URL.
