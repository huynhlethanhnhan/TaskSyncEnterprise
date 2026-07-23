# TaskSyncEnterprise — Design System Handbook

This document outlines the core architecture and guidelines for the **TaskSyncEnterprise** design system. The styling relies on TailwindCSS v4 utility classes and semantic CSS custom properties to maintain a polished, Figma-level SaaS presentation.

---

## 📐 Core Architecture & Layout Rules

1. **Vanilla CSS Standard:** All theme values are declared as standard HSL CSS variables inside `frontend/src/index.css`. Inline styles (`style={{ ... }}`) are prohibited inside JSX elements unless calculating dynamic layouts.
2. **Relative Sizing:** Component measurements (spacing, borders, typography) are defined using relative standard properties (`rem`, `em`, `%`) or Tailwind numeric classes.
3. **Corner Radii Hierarchy:**
   - `rounded-md`: Used for buttons, inputs, dropdown list selections, and badge capsules.
   - `rounded-xl`: Used for dashboards charts, statistics cards, and grid sections.
   - `rounded-2xl`: Used for modals, dialog overlays, and bottom drawers.
   - `rounded-full`: Used for avatars and online indicator badges.

---

## 📏 Spacing Scale Rules

The design system implements a strict 4px grid spacing system. Avoid using arbitrary pixel dimensions (e.g. `mt-[13px]`) in layouts.

| Size Value | Tailwind Class | Pixel Value | Typical Application |
|---|---|---|---|
| **4** | `p-1` / `m-1` | 4px | Small indicator dots, close button margins. |
| **8** | `p-2` / `m-2` | 8px | Button icons, badge spacing, checkbox labels. |
| **12** | `p-3` / `m-3` | 12px | Input labels padding, item dividers. |
| **16** | `p-4` / `m-4` | 16px | KPI cards margins, layout lists padding. |
| **20** | `p-5` / `m-5` | 20px | Header bounds, modal titles spacing. |
| **24** | `p-6` / `m-6` | 24px | Main dashboard layout grid padding. |
| **32** | `p-8` / `m-8` | 32px | Empty states wrapper margins. |
| **40** | `p-10` / `m-10` | 40px | Empty lists illustration layout padding. |
| **48** | `p-12` / `m-12` | 48px | Outer page section boundaries. |
| **64** | `p-16` / `m-16` | 64px | Main dashboard main header alignment gap. |

---

## ⚡ Ambient Shadows

Ambient shadows provide elevated depths and are mapped in Tailwind `@theme` to adapt automatically between light and dark modes:

- `shadow-sm` (`--shadow-el-1`): Card surface separation.
- `shadow-md` (`--shadow-el-2`): Secondary interactive highlights.
- `shadow-lg` (`--shadow-el-3`): Context menu dropdown panels.
- `shadow-xl` (`--shadow-el-4`): Overlays, details drawers.
- `shadow-2xl` (`--shadow-el-5`): Confirmation modals and dialog boxes.
