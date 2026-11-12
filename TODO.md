# AYOUB AI Webdev migration

## Open the existing GitHub project in Webdev
- [x] Preserve the existing bilingual AYOUB AI codebase and workspace structure from GitHub repository `Ayoub-smadi/Ai`.
- [x] Keep the existing Clerk, workspace, agent, knowledge, CSV, profile, and saved AI test-response flows intact.
- [ ] Verify the frontend and API run on the Webdev runtime ports.

## External Neon readiness
- [ ] Keep PostgreSQL connection settings compatible with the repository's `DATABASE_URL` and optional `MIGRATION_DATABASE_URL` variables.
- [ ] Provide Neon connection values through protected Webdev secret input before running migrations.
- [ ] Apply the checked-in Drizzle migrations only after the Neon connection is confirmed.

## Scope boundaries
- Do not add live WhatsApp, Instagram, Messenger, customer inbox, public chat widget, document retrieval, invitations, or role administration in this migration.
