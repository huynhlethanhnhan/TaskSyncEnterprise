# TaskSyncEnterprise — Visual Comparison Report

**Audit date:** 2026-07-22  
**Reference target:** `docs/image/...d7767b81...jpg` for Dashboard  
**Overall status:** **partially aligned; runtime verification pending**

| Area | Gap found | Change made | Evidence status |
|---|---|---|---|
| Route resolution | Extensionless imports could resolve legacy `.jsx` before canonical `.tsx` | Router now imports canonical TSX pages explicitly | build verified |
| Sidebar | 260 px implementation was wider than the ~200 px reference | expanded width reduced to 208 px; one canonical `ApplicationShell` remains | source verified; screenshot pending |
| Top search/profile | search was narrow and profile omitted name/role | responsive search widened; desktop name and role added | source verified; screenshot pending |
| Content container | `max-w-7xl` plus 32 px padding changed density by viewport | shell now owns full-width 24 px desktop padding | source verified; screenshot pending |
| Dashboard spacing | 24 px gaps and tall cards produced excessive whitespace | 16 px section gaps, 12 px KPI gaps, compact KPI padding and ~112 px minimum height | source verified; screenshot pending |
| Main hierarchy | generic equal three-column grid did not match reference hierarchy | two-column ratio changed to approximately 2:0.8 with narrow secondary rail | source verified; screenshot pending |
| Font | requested Inter/Outfit were not bundled, so actual font was an undocumented fallback | centralized stack is now `Segoe UI`, `Noto Sans`, Arial | CSS/build verified; computed font pending |
| Vietnamese text | literal `?` existed before rendering | SQL Server business columns migrated to NVARCHAR and four canonical seed values repaired | database verified |

## Page status

- `/dashboard`: **partially aligned**. Structural source changes are complete; Chrome screenshot comparison is pending.
- `/tasks`: **Unicode data fixed** and canonical TSX route selected; visual verification pending. There is no direct Tasks reference image in the supplied set.
- application shell: **source-aligned**, runtime pending.
- other routes: **not reassessed for pixel fidelity** because most supplied references have no direct product-route match.

## Chrome and Eagle

Chrome was not re-verified after this pass because the running production backend and SQL Server containers are on separate Docker networks. Login returns HTTP 500 until runtime networking is explicitly corrected. Eagle was not tested. No UA sniffing, browser-specific class, or Eagle branch was introduced.

This report supersedes prior claims that all routes were Chrome-verified or exactly aligned.
