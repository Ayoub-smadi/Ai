# AYOUB AI Business Assistant

AYOUB AI is a bilingual (English/Arabic) business-assistant platform. The WebDev project runs the React/Vite frontend and Express API, with Neon PostgreSQL as the durable source of truth for application records and uploaded store images.

## Platform and security

- The app is hosted and previewed through Manus WebDev; it does not depend on Replit.
- `DATABASE_URL` is configured as a protected, server-only WebDev secret. Never commit it or expose it to browser code.
- Sign-in uses Manus OAuth and server-verified application sessions. Administrator permissions are enforced by the API, not only by the frontend.
- Clerk configuration and browser-local persistence are not used for application data.
- Customer orders, price-quote requests, site settings, products and image bytes are stored in Neon.
- Uploaded images are validated by the API and stored as PostgreSQL `bytea`; the frontend reads them through API asset URLs.

## Development

The root `pnpm run dev` starts Vite on the configured preview port and the Express API on its service port. Vite proxies `/api` to the API. Install dependencies with pnpm 10 and use `pnpm run typecheck` and `pnpm run build` for checks.

For a separate local development environment, use a non-production Neon database and set `DATABASE_URL` only in a server-side environment file that is excluded from version control. Do not use a production database for destructive experiments.

## Database migrations

Drizzle schema lives in `lib/db/src/schema`. Generate migrations with `pnpm --filter @workspace/db run generate`, review the SQL, then apply with `pnpm --filter @workspace/db run migrate` using the configured server-side Neon connection. Do not use force-push schema operations or destructive migrations against existing data.

## AI agent testing

Live OpenAI-backed agent test responses require `OPENAI_API_KEY` on the API server. Without that optional provider key, the API returns an explicit unavailable error; no key is included in the browser bundle.
