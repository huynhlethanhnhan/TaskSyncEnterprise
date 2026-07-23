# Phase 4.4 Final Audit Report

**Audit date:** 2026-07-22  
**Recommendation:** **do not close Phase 4.4 yet**.

## Status matrix

| Area | Status | Evidence |
|---|---|---|
| Vietnamese source encoding | verified | repository UTF-8 checker passes |
| SQL Server Unicode schema | fixed and verified | Alembic `7b31f6e4c2a0`; live NVARCHAR metadata |
| canonical damaged seed rows | fixed and verified | four exact before/after repairs |
| frontend JSON/source round trip | verified | Node tests 3/3 pass |
| backend JSON/NVARCHAR assertions | verified | direct assertions pass in backend image |
| ESLint | verified | zero errors/warnings |
| TypeScript | verified | `tsc --noEmit` passes |
| production frontend build | verified | Vite 516 modules, build passes |
| Dashboard source hierarchy | fixed; partially aligned | route locked to TSX; compact shell/KPI/grid changes |
| Chrome runtime/DOM/font/screenshots | not tested | backend and SQL Server container networks differ |
| Eagle | not tested | no UA hack added |
| RBAC regression | partially tested | source unchanged; old suite produced mixed results because harness DB paths were invalid |
| Redis regression | partially tested | Redis source was not changed; combined old suite did not finish cleanly |

## Test detail

- `npm run check:utf8`: pass.
- `npm run test`: 3/3 pass.
- `npm run typecheck`: pass.
- `npx eslint "src/**/*.{js,jsx,ts,tsx}"`: pass.
- `npm run build`: pass in 1.80 s, 516 modules.
- backend focused container attempt: 11 tests passed; 5 failed and 6 errored because legacy tests either wrote SQLite into a read-only source mount or bypassed the fixture and connected to `127.0.0.1` from inside the container. These are recorded as harness failures, not product passes.

## Confirmed root cause

Business models used `String`/`Text`; SQL Server created VARCHAR columns. Correct UTF-8 seed strings lost Vietnamese characters at insert and literal `?` values were then returned unchanged through later layers.

## Remaining closure gates

1. Explicitly correct/approve runtime Docker network connectivity.
2. Rebuild/restart backend and frontend from the current source.
3. Capture Chrome before/after evidence at all required viewports.
4. Compare DB → API JSON → React Query cache → DOM textContent.
5. Record actual rendered font and 400/500/600/700 loading.
6. Run RBAC, Redis fallback, auth, employee, task, and dashboard tests in a correctly isolated harness.
7. Test Eagle after Chrome passes.

Any previous statement that this phase was 100% complete, exactly aligned, or Chrome-verified is superseded by this report.
