# TaskSyncEnterprise — Component Library Specification

**Document Version:** 1.0.0  
**Phase:** 4.1 Enterprise UI Foundation & Design System  
**Target:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui Primitives  

---

## 1. Overview

This document specifies the exact component contract, API props, visual variants, interaction behaviors, spacing rules, and accessibility standards for all 21 core components in the TaskSyncEnterprise Design System.

Each component is built using functional React 19 components, styled with Tailwind v4 utilities, and powered by accessible headless primitives (`@radix-ui/react-*` or shadcn patterns).

---

## 2. Component Specifications (1 - 21)

### 1. Button

- **Purpose**: Triggers an instant action, submits a form, or opens a modal dialog.
- **Variants**:
  - `primary`: Solid `--primary` background with white text.
  - `secondary`: `--secondary` background with `--text-primary` text.
  - `outline`: 1px `--border` with transparent background.
  - `ghost`: Transparent background, highlights on hover with `--slate-100` / `--slate-800`.
  - `danger`: Solid `--destructive` background for destructive actions (Delete, Purge).
  - `link`: Borderless text button with hover underline.
- **Sizes**:
  - `sm`: Height 32px (`h-8 px-3 text-xs`), icon 14px.
  - `md`: Height 40px (`h-10 px-4 text-sm`), icon 16px. (Default)
  - `lg`: Height 48px (`h-12 px-6 text-base`), icon 20px.
  - `icon`: Square button (`w-10 h-10 p-0`).
- **States**: Default, Hover, Focus-visible ring, Active/Pressed scale (0.98), Disabled (`opacity-38 cursor-not-allowed`), Loading (shows `Loader2` spinner icon, disables interaction).
- **Accessibility**: Native `<button>`, `type="button|submit"`, `aria-disabled`, `aria-busy` during loading. Focus ring via `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.

---

### 2. Input

- **Purpose**: Accepts text, number, email, or password input from the user.
- **Variants**: `default`, `error`, `success`, `disabled`.
- **Elements**: Left prefix icon slot, Right suffix icon slot (e.g. eye toggle for password, clear button for search), Helper text, Error text.
- **Spacing**: Height 40px (`h-10 px-3 py-2`), 8px gap between icon and text.
- **Accessibility**: Bound to `<label htmlFor="...">`, `aria-invalid={hasError}`, `aria-describedby="{id}-error"`. Focus state uses primary ring indicator.

---

### 3. Select (Combobox)

- **Purpose**: Allows selecting one item from a dropdown list, with optional search filtering.
- **Variants**: `single`, `multi-select`, `with-search`.
- **States**: Closed, Open (popover revealed), Item Hover, Item Selected (check icon indicator), Disabled.
- **Spacing**: Trigger height 40px; dropdown popover max-height 280px with custom scrollbar.
- **Accessibility**: WAI-ARIA Combobox pattern (`role="combobox"`, `aria-expanded`, `aria-autocomplete`), keyboard navigation (`ArrowUp`/`ArrowDown` to navigate, `Enter` to select, `Escape` to close).

---

### 4. Checkbox

- **Purpose**: Toggles a binary option or multi-selection item in lists and tables.
- **Variants**: `default`, `indeterminate` (for table header select-all).
- **States**: Unchecked, Checked (check icon), Indeterminate (minus icon), Disabled.
- **Spacing**: 18px x 18px box (`w-4.5 h-4.5 rounded-sm border-border`).
- **Accessibility**: Built with Radix Checkbox primitive (`role="checkbox"`, `aria-checked="true|false|mixed"`), `Space` key toggle.

---

### 5. Radio & Radio Group

- **Purpose**: Enables single selection from a mutually exclusive list of options.
- **Variants**: `standard-list`, `card-selector` (visual card radio button).
- **States**: Unselected, Selected (inner dot filled), Hover, Focus ring, Disabled.
- **Spacing**: Radio circle 18px x 18px (`rounded-full`); card selector has 16px internal padding.
- **Accessibility**: `role="radiogroup"`, `role="radio"`, `ArrowKey` navigation between radio options within the group.

---

### 6. Switch

- **Purpose**: Instant toggle for turning system settings, notifications, or modes ON or OFF.
- **Variants**: `default` (md: 44px x 24px), `small` (sm: 36px x 20px).
- **States**: Off (`bg-slate-200` / `bg-slate-700`), On (`bg-primary`), Disabled. Thumb animates smoothly (`transition-transform duration-200`).
- **Accessibility**: Radix Switch primitive (`role="switch"`, `aria-checked`), `Space` key toggle.

---

### 7. Modal (Dialog)

- **Purpose**: Displays critical content or forms requiring immediate user interaction over an opaque overlay.
- **Variants**: `sm` (400px), `md` (540px), `lg` (720px), `xl` (960px), `destructive-confirm`.
- **Structure**:
  - Header: Title (`heading-h2`), Description (`body-md`), Close button (`X` icon in top-right).
  - Body: Scrollable content container (`max-h-[70vh] overflow-y-auto`).
  - Footer: Action buttons right-aligned (Cancel secondary, Confirm primary/danger).
- **States**: Entrance (Framer Motion scale + fade), Open, Exit.
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, focus trap enabled, `Escape` key dismisses modal.

---

### 8. Drawer (Slide-Over Panel)

- **Purpose**: Side panel sliding in from screen edge for complex detail viewing, filtering, or sub-forms.
- **Variants**: `right` (default, 420px width), `left`, `bottom` (sheet view for mobile).
- **States**: Closed, Opening (slide in from right `x: 100% -> 0`), Open, Closing.
- **Accessibility**: Focus trap, backdrop overlay click dismisses, `Escape` key close.

---

### 9. Toast (Notification Stack)

- **Purpose**: Non-modal feedback message popping up at viewport corner.
- **Variants**: `success` (green check), `error` (red alert), `warning` (amber warning), `info` (blue info).
- **Behavior**: Auto-dismisses after 4000ms; hover pauses auto-dismiss timer; manual close action (`X`).
- **Spacing**: Floating container positioned top-right or bottom-right (`z-toast`), gap 8px between stacked toasts.
- **Accessibility**: `aria-live="polite"` for info/success, `aria-live="assertive"` for error toasts.

---

### 10. Badge

- **Purpose**: Visual tag indicating entity status, count, or categorical label.
- **Variants**:
  - `default`: `--slate-100` background, `--slate-800` text.
  - `primary`: `--blue-50` background, `--blue-700` text.
  - `success`: `--emerald-50` background, `--emerald-700` text.
  - `warning`: `--amber-50` background, `--amber-700` text.
  - `danger`: `--rose-50` background, `--rose-700` text.
  - `outline`: 1px border with transparent background.
  - `dot`: Includes a 6px status indicator circle.
- **Spacing**: Height 22px (`px-2.5 py-0.5 text-xs font-medium rounded-full`).

---

### 11. Avatar & Avatar Group

- **Purpose**: Displays user profile image, fallback initials, or team avatars.
- **Variants**: `sm` (28px), `md` (36px), `lg` (48px), `xl` (64px).
- **Elements**: Profile image (`<img>`), Fallback initials (e.g. `"TN"` on `--primary` background), Online status badge dot (green 8px dot at bottom-right corner).
- **Avatar Group**: Stacked avatars with `-space-x-2` overlap and `+N` overflow counter indicator.

---

### 12. Card

- **Purpose**: Content container grouping related information, metrics, or actions into a single visual surface.
- **Variants**:
  - `default`: Surface background (`--surface`), 1px `--border`, subtle elevation (`shadow-sm`).
  - `interactive`: Adds hover scale/elevation lift (`hover:shadow-md hover:border-slate-300 transition-all cursor-pointer`).
  - `flat`: Subtle background (`--slate-50` / `--slate-900`) without shadow.
- **Sub-components**: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Spacing**: 16px padding on mobile (`p-4`), 24px padding on desktop (`p-6`).

---

### 13. Dropdown Menu

- **Purpose**: Contextual menu displaying a list of options triggered by a button click.
- **Variants**: `standard`, `with-icons`, `with-shortcuts` (displaying `Cmd+K`, `Del` hotkeys), `with-submenus`.
- **Elements**: Menu item, Menu header title, Separator line (`h-px bg-border my-1`), Destructive menu item (red text).
- **Accessibility**: Radix Dropdown Menu primitive, `role="menu"`, full keyboard navigation (`ArrowUp`/`ArrowDown`, `Enter`, `Escape`).

---

### 14. Navbar (Top Navigation Header)

- **Purpose**: Global application header containing breadcrumb/branding, global command search input trigger (`Cmd+K`), quick action buttons, notification bell badge, and user profile avatar dropdown.
- **Spacing**: Fixed height 64px (`h-16 px-6`), sticky positioning at top (`sticky top-0 z-header`), bottom border 1px (`border-b border-border`).

---

### 15. Sidebar (Vertical Navigation Menu)

- **Purpose**: Primary application navigation menu supporting collapse/expand states.
- **Variants**:
  - `expanded`: Width 260px (`w-65`), displays navigation section headers, menu icon, label text, and badge counts.
  - `collapsed`: Width 72px (`w-18`), hides label text, displays icons only with hover tooltips.
- **Interaction**: Active route item highlights with primary background (`bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400`) and left 3px indicator line.

---

### 16. Breadcrumb

- **Purpose**: Displays hierarchical path navigation from home root to current page.
- **Elements**: Link item (`Link` tag), Separator chevron icon (`ChevronRight` 14px), Active current page text (`font-semibold text-text-primary`).
- **Truncation**: Collapses middle path items to `...` dropdown when breadcrumb exceeds 4 levels.
- **Accessibility**: `<nav aria-label="Breadcrumb">`, `<ol>`, active page has `aria-current="page"`.

---

### 17. Tabs

- **Purpose**: Navigates between view segments within the same context without page reload.
- **Variants**:
  - `line`: Bottom border underline active indicator (Framer Motion sliding indicator line).
  - `pills`: Segmented control pill background (`bg-muted p-1 rounded-lg`).
- **States**: Active tab (`text-primary font-semibold`), Inactive tab (`text-text-secondary hover:text-text-primary`), Disabled tab.
- **Accessibility**: WAI-ARIA Tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`), `ArrowLeft`/`ArrowRight` key switching.

---

### 18. Table (Data Table for TanStack Table)

- **Purpose**: Renders high-density tabular data with sorting, filtering, selection, and custom row actions.
- **Features**:
  - Sticky header (`sticky top-0 z-sticky bg-surface`).
  - Sortable column headers (with active sort arrow indicator icon).
  - Row selection checkbox column (`w-12`).
  - Hoverable zebra row striping option (`hover:bg-slate-50/50 dark:hover:bg-slate-800/50`).
  - Cell formatting presets (Text, Badge status, Date/Time, User Avatar, Action Dropdown).
- **Accessibility**: Standard HTML `<table>`, `<thead>`, `<tbody>`, `<th> scope="col"`.

---

### 19. Pagination

- **Purpose**: Controls navigation across paged records in data tables.
- **Elements**: Record counter text (`"Showing 1 to 10 of 248 records"`), Page size select dropdown (`"10 / page"`), First/Previous/Next/Last icon buttons, Page number buttons with active state (`bg-primary text-white`).
- **Accessibility**: `<nav aria-label="Pagination">`, disabled state on `Previous` button when on page 1.

---

### 20. Loading (Spinners & Skeletons)

- **Purpose**: Provides visual feedback during data fetching or background execution.
- **Variants**:
  - `inline-spinner`: Animated spinning icon (`Loader2` icon with `animate-spin text-primary`).
  - `skeleton-card`: Pulse container mirroring card layout.
  - `skeleton-table`: Pulse rows for data table loading state.
  - `fullscreen-overlay`: Opaque overlay with centered brand spinner and loading message.

---

### 21. Empty & Error States

- **Purpose**: Informs users when a view contains no records or when a system/network error occurs.
- **Components**:
  - `EmptyState`: Centered graphic/icon, title, description, primary CTA button (`"Create New Task"`).
  - `ErrorState`: Danger icon (`AlertTriangle`), error message banner, retry action button (`"Retry Request"`).
  - `ErrorBoundary`: Class boundary catching React runtime errors, rendering a clean fallback card without breaking the whole layout.

---

## 3. Summary Component Matrix

| Component | Prim. Utility | Radix Primitive | Dark Mode Surface | Keyboard Accessible |
| :--- | :--- | :--- | :--- | :---: |
| **Button** | Action | Native | `--primary` / `--secondary` | Yes |
| **Input** | Form | Native | `--slate-800` border `--slate-700` | Yes |
| **Select** | Dropdown | `@radix-ui/react-select` | Popover `--slate-900` | Yes |
| **Checkbox** | Selection | `@radix-ui/react-checkbox` | `--slate-800` | Yes |
| **Radio** | Selection | `@radix-ui/react-radio-group` | `--slate-800` | Yes |
| **Switch** | Toggle | `@radix-ui/react-switch` | `--slate-800` / `--primary` | Yes |
| **Modal** | Overlay | `@radix-ui/react-dialog` | Dialog `--slate-900` | Yes (Focus Trap) |
| **Drawer** | Slide-over | `@radix-ui/react-dialog` | Sheet `--slate-900` | Yes (Focus Trap) |
| **Toast** | Alert | `@radix-ui/react-toast` | Surface `--slate-900` | Yes (aria-live) |
| **Badge** | Status | Custom | Accent Tint | N/A |
| **Avatar** | Profile | `@radix-ui/react-avatar` | Surface `--slate-800` | N/A |
| **Card** | Surface | Custom | `--slate-900` border `--slate-800` | Yes (when interactive) |
| **Dropdown** | Menu | `@radix-ui/react-dropdown-menu` | Menu `--slate-900` | Yes |
| **Navbar** | Header | Custom | Sticky `--slate-900` | Yes |
| **Sidebar** | Navigation | Custom | `--slate-900` border `--slate-800` | Yes |
| **Breadcrumb** | Path | Custom | Transparent | Yes |
| **Tabs** | Switcher | `@radix-ui/react-tabs` | Muted `--slate-800` | Yes |
| **Table** | Data Grid | Custom / TanStack | Header `--slate-900` | Yes |
| **Pagination** | Table Nav | Custom | Surface `--slate-900` | Yes |
| **Loading** | Feedback | Custom | Skeleton `--slate-800` | N/A |
| **Empty/Error** | Feedback | Custom | Card Surface | Yes |
