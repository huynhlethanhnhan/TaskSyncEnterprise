# TaskSyncEnterprise — Component Runtime Testing & Verification Guide

**Document Version:** 1.0.0  
**Phase:** 4.3 Runtime Integration  
**Route:** `/dev/components`  

---

## 1. Interactive Component Showcase

The development component showcase route at `/dev/components` provides a live runtime environment for verifying all 25 Phase 4.2 UI components under real browser conditions.

### Test Environment Launch
To start the local development server:

```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173/dev/components` (or log in as `thanhnhan1807@gmail.com`).

---

## 2. Manual Test Matrix & Verification Checklist

| Component | Target Location on Showcase | Manual Verification Step | Expected Runtime Behavior | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Button** | Section 1 | Click variants, size buttons, loading button | Focus ring displays on Tab, active scale animation triggers, loading button renders `Loader2` spinner | **PASS** |
| **Input** | Section 2 | Type text, view prefix search icon, test error state | Focus ring glows blue, error message renders in red below input | **PASS** |
| **Textarea** | Section 2 | Type long text, drag resize handle | Text wraps, border highlights on focus | **PASS** |
| **Select** | Section 2 | Click dropdown, select role option | Chevron icon displays, selected value updates | **PASS** |
| **Checkbox** | Section 2 | Click standard, indeterminate, disabled boxes | Check mark renders, indeterminate minus icon shows | **PASS** |
| **RadioGroup** | Section 2 | Navigate radio options with arrow keys | Radio dot fills, single option selected | **PASS** |
| **Switch** | Section 2 | Click toggle switch, press Space key | Thumb animates smoothly across track | **PASS** |
| **Badge** | Section 3 | Inspect default, primary, success, warning, danger tags | Status dot circle renders, colors match dark/light tokens | **PASS** |
| **Avatar** | Section 3 | View sm, md, lg, xl sizes & status dots | Initials `"TN"` render, green online dot displays at bottom-right | **PASS** |
| **Card** | Sections 1-7 | Inspect card elevation, borders, header/content padding | Crisp slate border (`slate-200` / `slate-800`), smooth hover shadow lift | **PASS** |
| **Modal** | Section 4 | Click `"Open Dialog Modal"`, press `Escape` | Opaque backdrop overlay opens with blur, dialog scales in, Escape key dismisses | **PASS** |
| **Drawer** | Section 4 | Click `"Open Slide-Over Drawer"` | Panel slides in from right (`x: 100% -> 0`), backdrop click closes panel | **PASS** |
| **Dropdown** | Section 4 | Click `"Context Dropdown"` | Popover menu opens, item shortcuts (`Cmd+E`) render, destructive item highlights red | **PASS** |
| **Toast** | Section 4 | Click `"Trigger Success Toast"` and `"Trigger Error Toast"` | Top-right toast notification slides in, auto-dismisses after 4000ms | **PASS** |
| **Tabs** | Section 5 | Click `"Overview"`, `"Analytics"`, `"Audit Logs"` tabs | Underline bar slides smoothly (Framer Motion spring), pill segment highlights | **PASS** |
| **Breadcrumb** | Page Header | Inspect root home icon and path chevrons | `Home` icon displays, chevron chevrons divide levels | **PASS** |
| **Skeleton** | Section 6 | View Card Skeleton preview | Smooth CSS pulse animation runs (`animate-pulse`) | **PASS** |
| **LoadingSpinner** | Section 6 | View sm, md, lg inline spinners | Spinning `Loader2` icon rotates seamlessly | **PASS** |
| **EmptyState** | Section 6 | View `"No Tasks Assigned"` box | Artwork icon circle displays, CTA button renders | **PASS** |
| **ErrorState** | Section 6 | View `"Database Connection Timeout"` card | Red alert triangle displays, `"Try Again"` button triggers callback | **PASS** |
| **Navbar** | Shell Header | Click `Cmd+K` trigger, theme toggle, profile avatar | Search toast fires, theme toggles between Light & Dark, profile menu reveals | **PASS** |
| **Sidebar** | Shell Left | Click collapse chevron icon | Sidebar collapses from 260px to 72px width gracefully | **PASS** |
| **PageHeader** | Shell Top | Inspect page title & action button bar | Title text renders in bold H1, action CTAs align to right | **PASS** |
| **Pagination** | Section 7 | Click Next/Previous arrows & per-page select | Record summary updates (`"Showing 1 to 10 of 48 records"`), page changes | **PASS** |
| **DataTableWrapper** | Section 7 | Click column headers, click selection checkboxes | Sort arrow toggles ascending/descending, row checkboxes select rows | **PASS** |

---

## 3. Responsive Breakpoint Checklist

- **375px (Mobile Viewport)**: Navbar collapses into hamburger menu; sidebar hides behind drawer; table scrolls horizontally without layout overflow.
- **768px (Tablet Viewport)**: 2-column KPI card grid; forms adapt smoothly.
- **1024px+ (Desktop Viewport)**: Full 12-column grid; sidebar expands; topbar shows `Cmd+K` hotkey badge.
