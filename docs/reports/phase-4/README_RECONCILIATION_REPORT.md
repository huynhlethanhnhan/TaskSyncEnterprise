# README Reconciliation Report

The root README was rewritten as a concise operational entry point.

## Changes

- Reduced duplicated startup sections to one production Docker flow and one local development flow.
- Defined `.env.production` as the production Compose secret file and `.env` as local development configuration.
- Explained Alembic once and seed behavior once, including the destructive nature of `--reset`.
- Documented the `backend_uploads` volume and what persistence does and does not guarantee.
- Documented authenticated realtime in-app notifications through `/ws/notifications`.
- Added the five required browser commands and all required responsive viewports.
- Removed all `file:///` links and used repository-relative Markdown links.
- Reconciled Phase 4.4 and 4.5 to Partial and kept 4.6 In Progress/Partial pending runtime evidence.
- Kept detailed endpoint, browser, and gap evidence in `docs/reports` rather than expanding the README into an audit log.

## Verification

`rg 'file:///' README.md` returns no links. Phase 4.7 and Phase 4.8 remain open, and the README does not claim final Phase 4 completion.
