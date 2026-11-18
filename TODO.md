# AYOUB AI Webdev migration

## Open the existing GitHub project in Webdev
- [x] Preserve the existing bilingual AYOUB AI codebase and workspace structure from GitHub repository `Ayoub-smadi/Ai`.
- [x] Keep the existing Clerk, workspace, agent, knowledge, CSV, profile, and saved AI test-response flows intact.
- [x] Verify the frontend runs on the Webdev runtime port: Vite serves the site on the declared Preview port 3000 with `BASE_PATH=/`, and `GET /manus-routes.json` plus every page route returns HTTP 200.
- [x] Keep the workspace commands working on the Webdev runtime: `pnpm install --frozen-lockfile` and `pnpm run typecheck` pass for all nine workspace packages.
- [ ] Run the API on its Webdev port 5000 behind the Vite `/api` proxy. Blocked until a PostgreSQL connection is configured.

## External Neon readiness
- [x] Keep PostgreSQL connection settings compatible with the repository's `DATABASE_URL` and optional `MIGRATION_DATABASE_URL` variables; `lib/db` reads `NEON_DATABASE_URL` first and falls back to `DATABASE_URL`.
- [ ] Provide Neon connection values through protected Webdev secret input before running migrations.
- [ ] Apply the checked-in Drizzle migrations (`pnpm --filter @workspace/db run migrate`) only after the Neon connection is confirmed; never use `push-force` against production.
- [ ] Supply `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` so sign-in uses the real Clerk instance instead of the public preview router. Without them the public site works and protected API requests are rejected with 401.
- [ ] Supply `OPENAI_API_KEY` for agent test responses and plant photo diagnosis. Without it those endpoints return an explicit unavailable error rather than a simulated answer.

## Homepage founder identity card
- [x] Show the supplied Eng. Thamer Al-Qadri business card inside the homepage typewriter section (`FounderBiographyTicker`), next to the paragraph that is typed and deleted, as a distinct panel rather than a plain image.
- [x] Recolor the card to the site palette: deep green `#315c3c`, navy `#020618`, paper white and the existing soft green band tints; the lime-green artwork of the source image is replaced by recolored SVG arcs.
- [x] Keep every contact value from the supplied card and make them live links: `tel:+962777772211`, `mailto:tamerqadri@gmail.com`, `https://www.alqadrioffers.online`, and Jerash — Jordan as plain text.
- [x] Cut the portrait out of the supplied card and fade its lower edge so it blends into the panel, with bilingual labels for English and Arabic visitors and reduced-motion fallbacks.

## Scope boundaries
- Do not add live WhatsApp, Instagram, Messenger, customer inbox, public chat widget, document retrieval, invitations, or role administration in this migration.
