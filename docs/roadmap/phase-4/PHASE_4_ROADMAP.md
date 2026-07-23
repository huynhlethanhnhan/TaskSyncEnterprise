# Phase 4 Roadmap

| Phase | Status | Exit evidence |
|---|---|---|
| 4.1 Enterprise UI Foundation | Complete | `docs/frontend/DESIGN_SYSTEM_SPEC.md`, `docs/frontend/DESIGN_TOKENS.md` |
| 4.2 Component Library | Complete | `frontend/src/components`, `frontend/ui-contract.test.mjs` |
| 4.3 Runtime Shell and Authentication | Complete | `frontend/src/layouts/ApplicationShell.tsx`, `frontend/src/pages/auth/LoginPage.tsx`, `docs/reports/PHASE_4_3_AUDIT_REPORT.md` |
| 4.4 Dashboard Focused Remediation | Partial | `docs/reports/PHASE_4_4_FINAL_AUDIT_REPORT.md`; independent runtime matrix incomplete |
| 4.5 Product Experience Redesign | Partial | Canonical TSX pages exist; unsupported claims listed in `docs/reports/PHASE_4_6_INDEPENDENT_AUDIT.md` |
| 4.6 Independent Backend-Driven UX Audit | Partial | Five Phase 4.6 reports, 15 targeted backend tests, frontend checks; browser/Docker evidence blocked |
| 4.7 Final Stabilization | Complete | `docs/reports/PHASE_4_7_FINAL_STABILIZATION_REPORT.md` |
| 4.8 Independent Runtime Verification | Partial | `docs/reports/PHASE_4_8_RUNTIME_VERIFICATION_REPORT.md` |
| 4.8.1 Final Gap Remediation | Ready for Final Runtime Retest | `docs/reports/PHASE_4_8_1_FINAL_REMEDIATION_REPORT.md`, `docs/reports/FRONTEND_DEPLOYED_SOURCE_ALIGNMENT.md`, `docs/testing/PHASE_4_RBAC_RUNTIME_MATRIX.md`, `docs/testing/PHASE_4_LEAVE_RUNTIME_SCENARIO.md`, `docs/reports/DASHBOARD_RUNTIME_TRACEABILITY_MATRIX.md` |
| Final Certification | Pending | Requires final runtime retest execution & evidence capture |



## Phase 4 certification backlog after Phase 4.8

1. Rebuild the production frontend from the audited tree and resolve the four-card/six-card dashboard drift.
2. Execute the complete avatar lifecycle and container/full-stack restart persistence sequence.
3. Execute Admin, Manager, and Employee UI plus direct-API RBAC matrices.
4. Execute the full backend-supported leave workflow, invalid transitions, notifications, and cleanup.
5. Reconcile every dashboard KPI/chart/empty state to live API and SQL responses by role.
6. Resolve or revise the Kanban drag/drop and Sidebar avatar acceptance requirements.
7. Execute the remaining 15 Not Executed manual cases and rerun evidence validation.

Phase 4 remains open until both 4.7 and 4.8 are Complete.
