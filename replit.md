# AYOUB AI

AYOUB AI is a bilingual business-assistant platform for maintaining product and policy knowledge, configuring customer-service agents, and testing grounded answers.

## Run and operate

Install dependencies with `pnpm install --frozen-lockfile`, then start the full development app with `pnpm run dev`. The command starts the Vite web app on port 5173 and the Express API on port 5000. Vite proxies same-origin `/api` requests to the internal API port; only the web port is exposed by the Replit configuration.

Before starting the API, add these values to Replit Secrets: `DATABASE_URL` for PostgreSQL, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` for real sign-in, and `OPENAI_API_KEY` for agent test responses. `OPENAI_MODEL` and `VITE_CLERK_PROXY_URL` are optional. Without Clerk keys, the public homepage and health endpoint still work, sign-in shows a setup message, and protected API requests are rejected with 401. Without the OpenAI key, AI test responses return an explicit unavailable error rather than a simulated answer.

Run `pnpm run typecheck` to check all packages, `pnpm run build` to build the workspace, and `pnpm --filter @workspace/db run push` only when intentionally applying the Drizzle schema to a development database. The API package can be checked independently with `pnpm --filter @workspace/api-server run typecheck`.

## Current product capabilities

The app includes a public bilingual landing page, Clerk-gated workspace access, a data-backed dashboard, agent CRUD and configuration, product and FAQ management, business-profile policies, channel-status cards, and an authenticated AI test conversation with saved test history and source references. Product management supports category/availability filters, CSV template download, CSV export, and CSV import with row validation and a report. Imports accept up to 500 rows and 2 MB per file; use `|` between aliases in a cell. Potential name, alias, or SKU duplicates are skipped and reported.

Channel cards are status-only and report `not_configured`; live WhatsApp, Instagram, and Messenger connections are not implemented yet. The product does not yet have a customer conversation inbox, a public website chat widget, or document upload and retrieval. Do not describe these as operational integrations.

## Project map and notes

- `artifacts/ayoub-ai/src/App.tsx`: React pages, navigation, workspace flow, and product import/export actions.
- `artifacts/ayoub-ai/src/lib/product-csv.ts`: CSV parser, validation, template, and exporter.
- `artifacts/ayoub-ai/vite.config.ts`: Vite port/base-path validation and development proxy to the API.
- `artifacts/api-server/src/routes`: Express endpoints; workspace authorization is checked server-side.
- `artifacts/api-server/src/lib/ai.ts`: server-side answer retrieval and response safeguards.
- `lib/api-spec/openapi.yaml`: source of truth for API contracts; regenerate clients with `pnpm --filter @workspace/api-spec run codegen` after contract changes.
- `lib/db/src/schema/ayoub.ts`: Drizzle database schema; monetary product prices use PostgreSQL `numeric` and are carried as decimal strings.

Keep secrets in Replit Secrets or a local ignored `.env` file, never in source control. Database schema push is for development; do not use it as a production migration strategy.
