# Phase 4.6 Independent Audit

**Audit date:** 2026-07-22  
**Verdict:** Phase 4.6 Partial  
**Phase 4.7:** May start as a stabilization phase; Phase 4.8 certification may not start.

## Scope and method

The audit inspected the current dirty working tree without resetting pre-existing Phase 4.5 work. Source, schemas, role dependencies, storage, dashboard queries, leave workflow, WebSocket routing, Docker/Nginx, E2E scripts, README, frontend documentation, reports, and roadmap files were checked before corrections were made.

## Claim validation

| Phase 4.5 claim | Evidence | Result |
|---|---|---|
| Inter is locally bundled | `frontend/src/main.jsx`, `@fontsource-variable/inter`, production build WOFF2 output | Supported statically; computed cross-browser equality not executed |
| Chrome/Edge/Firefox parity | Edge script used real `msedge.exe`; Firefox script and installation were absent | Unsupported |
| Full responsive coverage | No suite for the eight required viewports existed | Unsupported; harness added, execution blocked by runtime |
| Avatar everywhere | Present in navbar, profile, employee views, department detail; absent from task assignee source, notification rows, comments, approval history, and sidebar | Unsupported |
| Avatar persistence verified | Production volume maps `/app/uploads`; no restart experiment was available | Configuration supported, runtime claim unverified |
| Dashboard has no mock/static analytics | `monthly_activity` was derived from constants and counts rather than time-series rows | False; corrected to real task creations only |
| Leave workflow complete | Manager/admin service accepted arbitrary states; employee list path referenced an unimported constant; no rejection comment field | False; transitions/import corrected, comment remains missing |
| All pages share responsive tables | Shared wrapper is used by employee/task pages only; other named modules are card/list surfaces or bespoke tables | Unsupported |
| Reduced motion supported | No `prefers-reduced-motion` rule or hook existed | False; global reduction rule added |

## Evidence-backed corrections

- Added explicit vacation schemas and role/state transitions; added six contract tests.
- Removed the synthetic dashboard completion series and calculated task-creation history from real `created_at` rows.
- Limited upcoming deadlines to the next 14 days and upcoming leave to future approved leave.
- Replaced the hardcoded `12 / 12` leave allowance with a real rejected-request count.
- Added avatar MIME validation and cleanup of replaced/deleted physical files.
- Removed unsupported self-service job-title updates from the profile request and marked the field administrator-managed.
- Added a reduced-motion CSS policy.
- Added real Chrome, Edge, Firefox, and eight-viewport evidence scripts plus required package commands.
- Reconciled README, Phase 4 roadmap/tracker, and report indexes.

## Validation results

| Check | Exact result |
|---|---|
| `npm run check:utf8` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | Pass: 7/7 |
| `npm run build` | Pass: 971 modules; warning for 1,148.60 kB JS chunk |
| Targeted backend tests | Pass: 15/15 in 23.14s |
| `docker compose config --quiet` | Pass |
| Production Compose config | Pass; Docker config permission warnings only |
| Chrome E2E | Blocked: `ERR_CONNECTION_REFUSED`, application unavailable |
| Actual Edge E2E | Blocked: `ERR_CONNECTION_REFUSED`, application unavailable |
| Firefox E2E | Blocked: Firefox executable not installed |
| Responsive E2E | Blocked: `ERR_CONNECTION_REFUSED` |
| Notification multi-session E2E | Blocked: `ERR_CONNECTION_REFUSED` |
| Docker health | Blocked: Docker Desktop daemon not running |
| Alembic heads | Previously observed `7b31f6e4c2a0 (head)`; final rerun blocked by local uv cache permission failure |
| Alembic current | Blocked: no database runtime and uv cache permission failure |
| Upload restart persistence | Blocked: Docker daemon/runtime unavailable |

## Open gaps

1. Execute and retain browser evidence for Chrome, actual Edge, Firefox, and all viewports.
2. Install a Playwright-compatible Firefox browser and record its version.
3. Start the production stack and verify container health, Alembic current, avatar reload/logout/restart persistence, and WebSocket delivery.
4. Add rejection/comment storage to the leave model if the product requires auditable reviewer reasons.
5. Implement task comment API/UI; current models alone are not a product capability.
6. Add a reports backend/API/UI or remove reports from product claims.
7. Complete avatar propagation to task assignees, notifications, comments (after comments exist), and approval history.
8. Add direct backend avatar/profile tests and full leave endpoint/RBAC integration tests.

No `PHASE_4_FINAL_CERTIFICATION.md` was created because mandatory evidence is incomplete.
