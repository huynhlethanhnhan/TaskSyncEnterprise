# Phase 4.8 Runtime Verification Report

**Audit window:** 2026-07-22 21:45–22:25 Asia/Saigon  
**Scope:** independent runtime verification, evidence review, and certification decision  
**Verdict:** **Phase 4.8 Partial**

## 1. Executive summary

The production Compose stack is healthy, database migration state is current, frontend source gates pass, 25 targeted backend tests pass, Chrome/actual Edge/Firefox layout suites execute successfully, the corrected responsive suite passes 32 settled-content cases, and the two-session notification test delivers one matching WebSocket notification in 540 ms.

Phase 4 is **not certified**. The deployed dashboard does not match the current source (four KPI cards are visible in runtime while the audited source defines six), 15 manual workflows lack runtime evidence, and two stated acceptance behaviors are unsupported: Kanban drag/drop and avatar propagation into the Sidebar. Mandatory avatar-restart, three-role RBAC, complete leave, and dashboard value-traceability checks were not executed. Per the certification rule, `PHASE_4_FINAL_CERTIFICATION.md` was not created.

## 2. Environment

| Item | Observed |
|---|---|
| Host | Windows 11, Asia/Saigon |
| Docker Desktop | 4.81.0 |
| Docker Engine client/server | 29.6.1 / 29.6.1 |
| Docker Compose | 5.2.0 |
| Gateway | `http://127.0.0.1` / Nginx |
| Chrome | 150.0.7871.181 |
| Microsoft Edge | 150.0.4078.83, native `msedge.exe` |
| Firefox | Playwright Firefox 151.0 |

Evidence: `docs/evidence/phase-4/docker/docker_version.txt`, `compose_version.txt`.

## 3. Container health

All eight services were Up and healthy: backend, frontend, nginx, SQL Server, Redis, Prometheus, Grafana, and cAdvisor. `/healthz`, `/health`, `/api/v1/health`, and `/api/v1/health/ready` returned HTTP 200. Redis returned `PONG`; SQL connectivity returned `1`.

Evidence: `docs/evidence/phase-4/docker/ps_output.txt`, `health_endpoints.json`, `redis_ping.txt`, `sqlserver_reachability_and_counts.txt`, `backend_logs.txt`, `nginx_logs.txt`. Evidence files were sanitized; no tokens or secret values were captured.

## 4. Alembic and database status

`alembic current` and `alembic heads` both returned `7b31f6e4c2a0 (head)`. History was captured and no drift was observed. Live counts were 37 employees, 73 tasks, 14 vacations, and 120 notifications. These are runtime counts, not claimed seed counts: the seed was not rerun and no reset was performed.

Evidence: `docs/evidence/phase-4/alembic/current.txt`, `heads.txt`, `history.txt`; `docs/evidence/phase-4/docker/sqlserver_reachability_and_counts.txt`.

## 5. Automated test results

| Command | Exit | Result | Skipped | Evidence/notes |
|---|---:|---|---:|---|
| `npm run check:utf8` | 0 | Pass | 0 | UTF-8 source check passed |
| `npm run typecheck` | 0 | Pass | 0 | TypeScript check passed |
| `npm run lint` | 0 | Pass | 0 | ESLint passed |
| `npm run test` | 0 | 7 passed | 0 | Node test suite |
| `npm run build` | 0 | Pass | 0 | 971 modules; non-failing large-chunk warning |
| `npm run test:e2e:chrome` | 0 | 8 route rows passed | 0 | `chrome/layout_matrix.json` |
| `npm run test:e2e:edge` | 0 | 8 route rows passed | 0 | `edge/layout_matrix.json` |
| `npm run test:e2e:firefox` | 0 | 8 route rows passed | 0 | `firefox/layout_matrix.json` |
| `npm run test:e2e:responsive` | 0 | 32 route/viewport rows passed | 0 | Rerun after fixing skeleton-state race; `responsive/viewport_matrix.json` |
| `npm run test:e2e:notifications` | 0 | Pass, 540 ms, one match | 0 | `notifications/latency_benchmark.json` |
| `npm run test:e2e:evidence` | 0 | 83 files validated in the final run | 0 | Required JSON parsed and secret-pattern scan passed |
| Targeted backend pytest command | 0 | 25 passed | 0 | Auth/RBAC, dashboard, Phase 4.6 contracts, notifications, Unicode |

Backend command:

```text
uv run python -m pytest -q tests/test_auth_runtime_fix.py tests/test_auth_rbac.py tests/test_dashboard.py tests/test_phase_4_6_contracts.py tests/test_notification_crud_realtime.py tests/test_notifications.py tests/test_unicode_pipeline.py
```

Dedicated runtime avatar/profile/leave test suites were not present/executed; they must not be inferred from the 25-test result. The first combined backend run exposed schema-qualified SQL leakage in the SQLite harness. The harness was fixed by normalizing metadata before application mapper import and clearing the compiled cache; the exact combined rerun then passed 25/25.

## 6. Manual acceptance

The manual document was corrected from an inaccurate 25-test/mostly-Pass summary to the actual 28 cases:

| Status | Count |
|---|---:|
| Pass | 10 |
| Fail | 3 |
| Blocked | 0 |
| Not Executed | 15 |

Each row now records actual outcome, status, evidence, time, browser/environment, and notes. See `docs/testing/PHASE_4_MANUAL_ACCEPTANCE_TEST.md`.

## 7. Cross-browser results

Chrome, native Edge, and Firefox each completed eight authenticated routes: dashboard, profile, employees, projects, tasks, departments, vacations, and notifications. The matrices record computed family/size/line-height, body/document dimensions, horizontal overflow candidates, console errors, failed requests, and screenshots. Inter Variable loaded and there were no document-level overflow, console errors, or relevant failed requests.

This supports **functional layout parity**, not exact pixel identity. Modal/drawer interaction, focus-ring keyboard traversal, and Kanban drag behavior were not proven by these route-level runs.

## 8. Responsive results

The suite covered 1920×1080, 1584×900, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, and 375×667 across dashboard, employees, tasks, and vacations. An initial pass was rejected after manual image review found loading skeletons. The harness was changed to wait for React Query content to settle and to fail when skeletons remain; the final 32-row rerun passed with no document-level horizontal overflow.

Mobile navigation/touch interaction was not exercised, so the corresponding manual interaction case remains Not Executed.

## 9. Avatar persistence

Not verified. The Compose file maps `backend_uploads:/app/uploads`, but a volume declaration is not lifecycle evidence. No real-account upload, invalid MIME, oversized upload, refresh/login persistence, replacement, delete, broken-image, or container/full-stack restart sequence was executed. Source inspection also found no avatar binding in `Sidebar.tsx`, so the stated topbar-and-sidebar propagation expectation cannot currently pass.

## 10. RBAC

Admin login and targeted backend RBAC tests passed. Runtime sessions for Manager and Employee were not executed, and direct API rejection plus role-specific navigation/action matrices were not captured. RBAC therefore remains a mandatory certification gap despite source/unit coverage.

## 11. Leave workflow

Not executed. No request was created and advanced through the exact backend statuses, no invalid transition was attempted, and no workflow notification was reconciled. The earlier three-stage and leave-balance claims remain unproven and are not certified.

## 12. Realtime notifications

Passed for the acceptance case that was actually exercised: two independent Chrome contexts, one task-assignment event, one matching WebSocket notification, 540 ms measured latency, and cleanup. This evidence must not be described as Web Push. Reconnect behavior, polling fallback, mark-as-read, and related-entity navigation were not exercised and remain limitations beyond `TC-NTF-01`.

## 13. Dashboard traceability

Backend dashboard tests pass and the runtime dashboard uses live APIs, but every displayed KPI/chart was not reconciled value-by-value to API and SQL. More importantly, the production screenshot contains four KPI cards while current `DashboardPage.tsx` defines six, proving deployed-source drift. This is a High release defect because the cross-browser runtime is not the exact frontend source being certified.

## 14. Defects fixed

| Defect | Severity | Root cause | Fix and regression result |
|---|---|---|---|
| Responsive evidence captured loading skeletons yet passed | Medium (evidence integrity) | SPA data requests began after the navigation load-state check | Harness now waits after mount for `.animate-pulse` to disappear and records `visibleLoadingSkeletons`; final 32/32 pass |
| Intentional route navigation produced false `ERR_ABORTED` failures | Low (test harness) | Browser cancels in-flight requests on deliberate navigation | Aborted-by-navigation requests are recorded separately; relevant failures remain gating |
| Combined backend suite generated stale `dbo.employees` SQL under SQLite | Medium (test infrastructure) | ORM aliases/compiled SQL captured production schema before SQLite normalization | Normalize metadata before `app.main` import and clear compiled cache; 25/25 rerun passed |
| Evidence command/reporting gap | Low | Phase 4.7 claimed a command that did not exist | Added `test:e2e:evidence` and validator; evidence set passed validation |

## 15. Remaining limitations and open defects

| Item | Severity | Required closure |
|---|---|---|
| Deployed frontend differs from audited source (dashboard four vs six KPI cards) | High | Rebuild/redeploy production frontend from the audited tree, then rerun all browser and dashboard traceability tests |
| Avatar does not propagate to Sidebar and lifecycle/restart proof is absent | Medium + mandatory gap | Add the smallest avatar binding fix, test MIME/size/lifecycle, inspect volume, restart backend/frontend/full stack, and clean up |
| Kanban acceptance expects drag/drop but implementation exposes a status select | Medium | Implement and test drag/drop, or formally change the acceptance requirement to the supported status control |
| Manager/Employee RBAC runtime matrix absent | Mandatory verification gap | Execute UI and direct-API authorization tests for all three roles |
| Full leave workflow absent | Mandatory verification gap | Execute submit → manager action → final supported action, invalid transitions, notifications, and cleanup |
| Dashboard KPI/chart/API/SQL reconciliation absent | Mandatory verification gap | Capture API payloads and assert every displayed business value/empty state by role |
| Profile edits, password flow, employee filters/detail, project creation, task controls, mobile interactions not executed | Acceptance gap | Execute and attach current runtime evidence or retain Not Executed |

No Critical defect was found. One High and two Medium product/release defects remain.

## 16. Final verdict

**Phase 4.8 Partial**

The healthy stack and automated gates are meaningful progress, but the final certification rules are not met. No final certification document was created.
