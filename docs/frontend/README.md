# TaskSyncEnterprise — Frontend Architecture & Design System Documentation

Welcome to the central frontend documentation hub for **TaskSyncEnterprise**.

This directory contains the complete specifications, design tokens, component library contracts, theme system architecture, and accessibility standards established in **Phase 4.1 (Enterprise UI Foundation & Design System)**.

---

## 📖 Master Documentation Index

| Document | Focus Area | Description |
| :--- | :--- | :--- |
| **[UI/UX Audit](file:///e:/TaskSyncEnterprise/docs/frontend/UI_UX_AUDIT.md)** | Gap Analysis | Comprehensive audit of legacy frontend inconsistencies, typography, color gaps, and accessibility deficits. |
| **[Design System Spec](file:///e:/TaskSyncEnterprise/docs/frontend/DESIGN_SYSTEM_SPEC.md)** | Figma & Architecture | 12-column grid layout, icon system (Lucide), state system, theme engine (Light/Dark/System), and motion rules. |
| **[Design Tokens](file:///e:/TaskSyncEnterprise/docs/frontend/DESIGN_TOKENS.md)** | Tokens & CSS Vars | Complete HSL color palette, WCAG AA contrast matrix, 8pt spacing scale, typography scale, radii, shadows, and z-index layers. |
| **[Component Spec](file:///e:/TaskSyncEnterprise/docs/frontend/COMPONENT_LIBRARY_SPEC.md)** | Component Library | Specifications for all 21 core components (Button, Input, Select, Checkbox, Radio, Switch, Modal, Drawer, Toast, Badge, Avatar, Card, Dropdown, Navbar, Sidebar, Breadcrumb, Tabs, Table, Pagination, Loading, Empty/Error States). |
| **[Phase 4.2 Roadmap](file:///e:/TaskSyncEnterprise/docs/roadmap/PHASE_4_2_ROADMAP.md)** | Execution Plan | Screen-by-screen modernization roadmap to refactor views using the Phase 4.1 Design System. |
| **[Troubleshooting Guide](file:///e:/TaskSyncEnterprise/docs/frontend/FRONTEND_TROUBLESHOOTING.md)** | Operations & Debug | Operational guide for diagnosing blank pages, CORS issues, JWT expiration, and state hydration issues. |

---

## 🛠️ Technology Stack & Compatible Libraries

Every component and screen in TaskSyncEnterprise adheres to the following technology constraints:

```
                  ┌──────────────────────────────────────────┐
                  │          React 19 + TypeScript           │
                  └────────────────────┬─────────────────────┘
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      │                                │                                │
┌─────┴──────────────┐      ┌──────────┴───────────┐      ┌─────────────┴─────────────┐
│  Tailwind CSS v4   │      │ Radix Primitives /   │      │       Framer Motion       │
│  (Design Tokens)   │      │      shadcn/ui       │      │     (Enterprise Motion)   │
└────────────────────┘      └──────────────────────┘      └───────────────────────────┘
      │                                │                                │
┌─────┴──────────────┐      ┌──────────┴───────────┐      ┌─────────────┴─────────────┐
│  TanStack Query /  │      │   React Hook Form    │      │       Lucide Icons        │
│   TanStack Table   │      │   + Zod Validation   │      │    (1.75px Fixed Stroke)  │
└────────────────────┘      └──────────────────────┘      └───────────────────────────┘
```

---

## 🎨 Enterprise Design System Rules

1. **No Code Placeholders**: Never write code with `// TODO: implement later`. All component code and specs must be complete.
2. **Strict Design Token Usage**: Never use magic pixel numbers or arbitrary color hex values in components (e.g. avoid `bg-[#1e293b]` or `p-[13px]`). Always use semantic Tailwind token classes (`bg-surface`, `p-4`, `text-text-primary`).
3. **Accessibility First (WCAG AA)**:
   - Target minimum 4.5:1 text contrast.
   - All custom controls must support full keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`).
   - Modals and drawers must lock focus and restore focus on exit.
4. **Theme Cascading**: Maintain zero flash of unstyled content (FOUC) when toggling between Light, Dark, and System modes.

---

---

## 📁 Phase 4.2 Component Taxonomy Structure

All 25 reusable components have been implemented under `frontend/src/components/` in 6 architectural directories:

```
frontend/src/
├── utils/
│   └── cn.ts                    # Class merging helper (clsx + tailwind-merge)
├── components/
│   ├── ui/                      # Base Form & Control Primitives
│   │   ├── Button.tsx           # Button (CVA variants: primary, secondary, outline, ghost, danger, link)
│   │   ├── Input.tsx            # Text input with icon prefix/suffix slots
│   │   ├── Textarea.tsx         # Styled textarea with helper text
│   │   ├── Select.tsx           # Select dropdown with chevron indicator
│   │   ├── Checkbox.tsx         # Checkbox (standard & indeterminate)
│   │   ├── RadioGroup.tsx       # Radio group & radio items
│   │   └── Switch.tsx           # Toggle switch
│   ├── common/                  # Atomic Common Surfaces
│   │   ├── Badge.tsx            # Status badge (default, primary, success, warning, danger, outline, dot)
│   │   ├── Avatar.tsx           # Profile avatar with fallback initials & status dot
│   │   ├── Card.tsx             # Card container (Header, Title, Description, Content, Footer)
│   │   ├── Modal.tsx            # Accessible dialog modal (backdrop blur, focus trap, Escape key)
│   │   ├── Drawer.tsx           # Slide-over panel (Right, Left, Bottom)
│   │   └── Dropdown.tsx         # Context dropdown menu
│   ├── feedback/                # Feedback & State Indicators
│   │   ├── Skeleton.tsx         # Pulse loading skeleton wrappers (Card & Table)
│   │   ├── LoadingSpinner.tsx   # Inline & full-screen overlay spinners
│   │   ├── EmptyState.tsx       # Empty view graphic artwork CTA
│   │   ├── ErrorState.tsx       # Error alert message & retry CTA
│   │   └── Toast.tsx            # Toast notification container
│   ├── navigation/              # Navigational Primitives
│   │   ├── Tabs.tsx             # Line & Pill tabs with animated indicator line
│   │   └── Breadcrumb.tsx       # Path breadcrumb list navigator
│   ├── layout/                  # Page Shell & Structure
│   │   ├── Navbar.tsx           # Top navigation header with Cmd+K search trigger & theme toggle
│   │   ├── Sidebar.tsx          # Vertical navigation menu with collapse/expand state
│   │   └── PageHeader.tsx       # Standardized page title header with actions bar
│   └── data-display/            # Data Tables & Pagination
│       ├── Pagination.tsx       # Table page selector & record counter
│       └── DataTableWrapper.tsx # Enterprise wrapper for TanStack Table (sticky header, sort, select)
```
