# TaskSyncEnterprise — Dashboard Overview Design

**Status:** implemented in source; Chrome visual verification pending.

## Target structure

1. Breadcrumb and compact welcome block.
2. Date/context subtitle and functional refresh control.
3. Four compact, equal KPI cards using real dashboard API values.
4. Primary work-attention panel beside a narrow role-aware action/activity rail.
5. Dense lower project progress and department summary panels.

No export or date-filter control is shown because those workflows are not implemented. The refresh action calls the analytics query refetch. Quick actions open working drawers and remain permission-gated.

## Reference-derived layout tokens

| Token | Target |
|---|---:|
| expanded sidebar | 208 px |
| topbar | 64 px |
| desktop content padding | 24 px |
| section gap | 16 px |
| KPI gap | 12 px |
| KPI minimum height | 112 px |
| main/secondary ratio | approximately 2:0.8 |
| card radius | 8–12 px |
| card border | 1 px neutral |

## Data and RBAC

- KPIs use `/dashboard/analytics` values; no trend percentage is invented.
- urgent work uses task deadline and priority.
- project progress, task status, department headcount, and notifications come from existing query hooks.
- employee creation stays Admin-only; project/task actions follow current permission helpers and backend dependencies.

## Remaining verification

At 2026-07-22 the running production backend cannot resolve SQL Server because the containers do not share a network. Therefore 1440×900, 1280×720, 1024×768, 768×1024, and 390×844 screenshots have not been captured after these changes. The design is **not** declared pixel-perfect or complete.
