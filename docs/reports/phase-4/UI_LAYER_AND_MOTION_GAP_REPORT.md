# UI Layer and Motion Gap Report

| Layer | Evidence | Status | Gap/action |
|---|---|---|---|
| Design tokens | HSL semantic tokens and Tailwind mappings in `frontend/src/index.css` | Complete | Token source is centralized |
| Primitives | Inputs, buttons, selects, switches, checkbox/radio under `components/ui` | Complete | Continue accessibility regression tests |
| Composite components | Card, Avatar, Modal, Drawer, Dropdown, Toast, DataTableWrapper | Partial | Mixed legacy JSX and canonical TSX variants remain |
| Layout system | `ApplicationShell`, `Navbar`, `Sidebar`; responsive mobile drawer | Partial | Runtime viewport evidence missing; `100vh`/`h-screen` must be measured on mobile |
| State system | React Query hooks/providers plus local UI state | Partial | Vacation and some legacy pages bypass typed query hooks |
| Data integration | Typed services for major modules | Partial | Reports/comments absent; some legacy direct Axios calls remain |
| Permission presentation | `usePermissions` controls create actions | Partial | Sidebar routes are not fully role-filtered; employee/audit pages can lead to 403 |
| Motion | Framer Motion modal/drawer/dropdown/toast; CSS transitions | Partial | No dedicated chart update, realtime arrival, avatar completion, approval result, or Kanban DnD motion contract |
| Accessibility | Skip link, focus rings, ARIA labels in primitives | Partial | No axe/keyboard/focus-trap runtime report from this audit |
| Frontend observability | E2E harness captures console and request failures | Partial | No production client telemetry/error boundary evidence |

## Motion audit

| Interaction | Current implementation | Finding |
|---|---|---|
| Modal/drawer entry and exit | `AnimatePresence`, opacity/transform | Appropriate and reversible |
| Dropdown | Opacity/translate motion | Appropriate |
| Toast | Framer Motion stack | Appropriate |
| Realtime notification arrival | Query invalidation; navbar ping | State updates, but arrival motion is not explicitly tested |
| Chart load/update | Recharts plus page skeleton | No explicit update transition contract |
| Avatar upload | Spinner/button state and preview | Communicates progress; runtime not verified |
| Form submit | Loading button states | Appropriate |
| Approval result | Toast after mutation | Appropriate but runtime not verified |
| Kanban drag/drop | No proven canonical drag/drop implementation | Gap |
| Reduced motion | Global `prefers-reduced-motion: reduce` rule added in Phase 4.6 | Static support added; runtime media emulation still required |

The code frequently uses `transition-all`; future stabilization should narrow this to opacity, transform, color, and shadow properties where practical. Motion must remain informational and must not gate input.
