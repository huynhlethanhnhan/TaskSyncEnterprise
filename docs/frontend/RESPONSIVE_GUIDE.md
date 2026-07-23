# TaskSyncEnterprise — Responsive & Mobile Layout Guidelines

The TaskSyncEnterprise client interface uses responsive rules to ensure layouts scale cleanly on mobile, tablet, laptop, and desktop screens.

---

## 📱 Layout Screen Width Bounds

TaskSyncEnterprise aligns spacing elements based on standard tailwind breakpoints:

- **Mobile Viewports (< 640px):** Single-column grid lists, hidden dashboard indicators, top bar hamburger menu navigation triggers, and full-screen overlay dialogs.
- **Tablets (640px - 1024px):** Dual-column KPI grids, side details overlays restricted to slide-over drawers, and responsive charts showing aggregated metrics.
- **Desktop/Laptops (>= 1024px):** Three-column workspace formats, visible sidebar navigations (collapsible to mini width), sticky tables with paginator footer controls.

---

## 📐 Layout Grid Guidelines

1. **Grids Configuration:** Use flexible column numbers:
   - KPI Cards: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3`. This ensures card listings scale between small screens and high-density screens.
2. **Horizontal Scrolling:** Avoid visual table overflow by wrapping `<table>` lists inside `<div className="overflow-x-auto">`.
3. **Paddings and Gaps:** Paddings automatically adjust:
   - Desktop standard layouts use `p-6` or `p-5`.
   - Small viewports scale down to `p-4` or `p-3` to maximize readable space.
