# TaskSyncEnterprise — Phase 4.2 Roadmap
# UI Modernization & Page Redesign Execution Plan

**Document Version:** 1.0.0  
**Phase:** 4.2 Implementation Roadmap  
**Prerequisite:** Phase 4.1 Enterprise UI Foundation & Design System (`docs/frontend/*`)  

---

## 1. Executive Summary

Phase 4.2 translates the design system foundation, tokens, and component specifications produced in Phase 4.1 into production-ready UI code across all application screens. 

The objective is to systematically modernize the user interface without altering existing backend API contracts, database schemas, or business logic. All redesigned components will be built in `frontend/src/components/ui/` using React 19, TypeScript, Tailwind CSS v4, shadcn primitives, Framer Motion, and Lucide React icons.

---

## 2. Implementation Milestones & Timeline

```
+-----------------------------------------------------------------------------------+
| MILESTONE 1: Atomic Primitives & CSS Engine Setup                               |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 2: Application Shell (Sidebar, Navbar, Layout Container, Breadcrumbs)   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 3: Authentication & Portal Landing Screens Redesign                     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 4: Module Screen Modernization (Dashboard, Tasks, Employees, Settings)  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 5: Data Tables, Modals, Drawers & Notification Center Integration        |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 6: Accessibility Verification, Dark Mode Polish & E2E Testing           |
+-----------------------------------------------------------------------------------+
```

---

### Milestone 1: Atomic Primitives & CSS Theme Engine Setup
- **Goal**: Configure Tailwind v4 `@theme` directives in `src/index.css` and create the foundational UI component library.
- **Tasks**:
  1. Replace legacy global `!important` dark mode overrides in `src/index.css` with CSS custom property token bindings (`var(--background)`, `var(--surface)`, `var(--primary)`).
  2. Implement FOUC-prevention script in `index.html`.
  3. Create atomic component primitives in `src/components/ui/`:
     - `Button.jsx` / `Button.tsx` (cva variants: primary, secondary, outline, ghost, danger, link)
     - `Input.jsx` (with icon prefix/suffix slots and error helper text)
     - `Select.jsx` (Combobox with search filter)
     - `Checkbox.jsx` & `RadioGroup.jsx`
     - `Switch.jsx`
     - `Badge.jsx`
     - `Avatar.jsx`
     - `Card.jsx` (`CardHeader`, `CardTitle`, `CardContent`, `CardFooter`)
     - `Skeleton.jsx` & `Spinner.jsx`

---

### Milestone 2: Application Shell Modernization
- **Goal**: Refactor `MainLayout.jsx` into modular layout components conforming to the 12-column grid.
- **Tasks**:
  1. Refactor `Sidebar.jsx`:
     - Implement smooth collapsing transition (260px expanded -> 72px collapsed).
     - Add Lucide icon navigation with tooltips in collapsed state.
     - Add active route indicator bar.
  2. Refactor `Navbar.jsx`:
     - Embed `Cmd+K` global command search trigger.
     - Integrate notification bell badge with red unread counter.
     - Add user profile dropdown menu (Profile settings, Theme toggle, Logout).
  3. Implement `Breadcrumb.jsx` path generator connected to React Router location.

---

### Milestone 3: Authentication & Portal Landing Redesign
- **Goal**: Rebuild login, registration, and onboarding flows with enterprise aesthetics inspired by modern B2B portals.
- **Tasks**:
  1. Redesign `Login.jsx` & `Register.jsx`:
     - Two-column split layout (Left: brand illustration/metrics summary, Right: sleek white/dark card with form controls).
     - Full React Hook Form integration with Zod validation feedback.
     - Password visibility toggle suffix icon.

---

### Milestone 4: Module Screen Modernization

#### 4.1 Dashboard Page (`src/pages/Dashboard.jsx`)
- **Key Metrics Row**: 4 metric cards (KPI figure, percentage badge trend, background sparkline chart).
- **Task Overview Chart**: Recharts integration with dark mode color tokens.
- **Recent Activity Feed**: Structured list item layout with status avatars and relative timestamps.

#### 4.2 Tasks Module (`src/pages/Tasks.jsx`)
- **Dual View Modes**:
  - Table View: Powered by TanStack Table with column sorting, filtering, selection checkboxes, and sticky header.
  - Kanban Board View: Column cards with drag/drop feedback, priority tags, avatar assignees.

#### 4.3 Employee Directory (`src/pages/Employees.jsx`)
- **Employee Table & Grid View**: Search bar, department filter dropdown, employee cards with online status indicator, role badges.

#### 4.4 Attendance & Leave Management (`src/pages/Attendance.jsx`, `src/pages/Leave.jsx`)
- **Attendance Time Clock Card**: Large digital clock, Clock-In / Clock-Out primary action buttons, status badge.
- **Leave Requests Calendar**: Monthly planner visualization with color-coded status badges (Annual, Sick, Personal).

#### 4.5 Performance & Settings (`src/pages/Performance.jsx`, `src/pages/Settings.jsx`)
- **Performance Radar & Matrix**: Rating badges, OKR progress bars, feedback cards.
- **Settings Portal**: Tabbed interface (General, Security, Permissions, Integrations, Billing, Danger Zone card).

---

### Milestone 5: Complex Modals, Drawers & Notifications
- **Goal**: Decouple inline popups from `MainLayout.jsx` into reusable Radix Dialog primitives.
- **Tasks**:
  1. Create `ProjectModal.jsx`: Modal for creating and editing projects.
  2. Create `TaskDrawer.jsx`: Right slide-over panel for task details, comments, and file attachments.
  3. Create `NotificationPanel.jsx`: Floating popover drawer showing real-time notifications with mark-as-read triggers.
  4. Create `ToastContainer.jsx`: Framer Motion toast stack for instant system alerts.

---

### Milestone 6: Accessibility, Dark Mode Polish & E2E Testing
- **Goal**: Ensure flawless visual quality, zero dark-mode glitches, and full accessibility compliance.
- **Tasks**:
  1. Conduct full keyboard navigation walkthrough (Tab key focus trap verification on modals).
  2. Verify dark mode across all screens (confirm zero text readability issues, 4.5:1 contrast).
  3. Perform mobile and tablet responsive view tests (375px, 768px, 1024px, 1440px).
  4. Execute automated end-to-end user flow testing.

---

## 3. Verification Criteria & Success Metrics

| Metric | Target Standard | Verification Method |
| :--- | :--- | :--- |
| **Component Code Quality** | Zero `// TODO` comments, 100% complete JSX/TSX components | Automated Linter / CI check |
| **Dark Mode Compliance** | 0% FOUC (flash of unstyled content), 100% CSS token coverage | Manual & automated theme test |
| **Accessibility (a11y)** | WCAG 2.1 AA compliant, 0 critical accessibility violations | axe-core / Lighthouse audit |
| **Responsive Integrity** | Flawless rendering across 375px, 768px, 1024px, 1280px, 1536px | Multi-viewport automated testing |
