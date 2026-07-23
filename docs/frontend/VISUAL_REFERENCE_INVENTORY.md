# TaskSyncEnterprise — Visual Reference Inventory

**Status:** Re-audited from the original JPEG files on 2026-07-22.  
**Source:** `E:\TaskSyncEnterprise\docs\image`  
**Important:** The images are HRIMS concept references. They are not screenshots of TaskSyncEnterprise and several have no matching product route.

| Reference file (suffix) | Size | Actual reference screen | Closest runtime route | Target viewport | Main components | Mapping status |
|---|---:|---|---|---:|---|---|
| `...3e87f2c4.jpg` | 1280×853 | Attendance | none | 1280×853 | sidebar, KPI row, attendance table, summary rail | no direct route |
| `...9b49ee10.jpg` | 1280×720 | Settings | `/settings` | 1280×720 | settings tabs, system controls, health rail | conceptual |
| `...9d99bd69.jpg` | 1280×720 | Leave Management | `/vacations`, `/calendar` | 1280×720 | KPI row, leave planner, approval rail | conceptual |
| `...eefc84c4.jpg` | 1280×720 | Sign in | `/login` | 1280×720 | split illustration, login card | conceptual |
| `...cb462123.jpg` | 1280×720 | Performance | none | 1280×720 | KPI row, radar, timeline, rankings | no direct route |
| `...371f52f7.jpg` | 1280×720 | Recruitment | none | 1280×720 | KPI row, campaign banner, hiring Kanban | no direct route |
| `...30636e10.jpg` | 1280×853 | Marketing landing page | none | 1280×853 | hero, product preview, feature cards | no direct route |
| `...871597b0.jpg` | 1280×720 | Reports | none | 1280×720 | report builder, preview, exports | no direct route |
| `...d7767b81.jpg` | 1280×720 | Dashboard | `/dashboard` | 1280×720 | shell, four KPIs, two-column overview, activity/event rail | direct visual target |
| `...1ca469dc.jpg` | 1280×720 | Payroll | none | 1280×720 | KPI row, payroll table, summary rail | no direct route |

## Dashboard measurements used

Measurements are estimates from the 1280×720 raster and must be validated with an after screenshot:

- expanded sidebar: approximately 196–208 px;
- topbar: approximately 64–68 px;
- content outer padding: approximately 24 px;
- KPI cards: four equal cards, approximately 112 px high, 12–16 px gaps;
- main content split: approximately 2:1;
- card radius: approximately 8–12 px;
- border: light neutral 1 px with low-strength shadow;
- typography: compact title hierarchy; most labels 11–14 px.

## Runtime evidence status

- Source inspection: complete.
- Chrome after screenshots: **not captured**; production backend cannot currently resolve the SQL Server container because they are on different Docker networks.
- Eagle: **not tested**. No Eagle-specific UA branch was added.
- No claim of exact alignment or 100% completion is made.
