# TaskSyncEnterprise — Figma & Technical Design System Specification

**Document Version:** 1.0.0  
**Phase:** 4.1 Enterprise UI Foundation & Design System  
**Target:** Frontend Engineering & Product Design Teams  

---

## 1. Introduction & Figma Architecture

This specification defines the foundation of the TaskSyncEnterprise Design System. It serves as both the architectural blueprint for developers and the exact design file specification to be mirrored in **Figma**.

### Figma File & Token Structure
- **Figma Local Variables**: Organized into `Primitives` (HSL values), `Semantic Tokens` (Light/Dark themes), and `Component Tokens`.
- **Auto Layout Standard**: Every frame, card, button, and component in Figma MUST utilize Figma Auto-Layout (`Shift + A`) with strict adherence to the 8pt spacing tokens.
- **Component Variants**: Component sets in Figma use standardized property keys (`Variant`, `Size`, `State`, `Theme`, `Icon`).

---

## 2. Layout Grid Architecture

TaskSyncEnterprise uses a responsive 12-column grid system paired with a fixed/collapsible enterprise shell structure (Sidebar + Topbar Navbar + Main Content Viewport).

```
+-----------------------------------------------------------------------------------+
|  LOGO | TOP NAV BAR (Global Search Cmd+K | Notifications | User Avatar)           |
+--------------+--------------------------------------------------------------------+
| SIDEBAR      | BREADCRUMB / PAGE TITLE HEADER                                     |
| (Collapsible |--------------------------------------------------------------------|
|  260px /     | MAIN VIEWPORT GRID (12 Columns)                                    |
|  72px)       | [Card 1: 4 cols] [Card 2: 4 cols] [Card 3: 4 cols]                 |
|              | [Table Surface: 12 cols                                          ] |
+--------------+--------------------------------------------------------------------+
```

### Grid Metrics

| Breakpoint | Screen Range | Margin | Gutter | Columns | Max Content Width |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Mobile (`sm`)** | 375px - 767px | 16px | 16px | 4 | Fluid (100%) |
| **Tablet (`md`)** | 768px - 1023px | 24px | 20px | 8 | 720px |
| **Desktop (`lg`)** | 1024px - 1279px | 32px | 24px | 12 | 960px |
| **Desktop Wide (`xl`)** | 1280px - 1535px | 32px | 24px | 12 | 1200px |
| **Ultra-Wide (`2xl`)** | 1536px+ | 40px | 32px | 12 | 1440px |

---

## 3. Typography System Specification

### Font Stack
- **Primary Body & UI**: `Inter` (Google Fonts)
- **Display Headings**: `Outfit` (Google Fonts)
- **Code & Monospace**: `JetBrains Mono`

### Responsive Typography Scaling Rules

| Scale Name | Mobile Font / Leading | Desktop Font / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display 2XL** | 32px / 40px | 48px / 56px | 700 | Dashboard KPI Key Figures |
| **Heading H1** | 24px / 32px | 30px / 38px | 700 | Page Title Header |
| **Heading H2** | 20px / 28px | 24px / 32px | 600 | Section Headers, Drawer Titles |
| **Heading H3** | 18px / 26px | 20px / 28px | 600 | Card Title Header |
| **Title LG** | 15px / 22px | 16px / 24px | 600 | Table Column Headers, Group Titles |
| **Title MD** | 13px / 18px | 14px / 20px | 600 | Form Field Labels, Tab Nav items |
| **Body MD** | 13px / 18px | 14px / 20px | 400 | Standard Paragraphs, Table Rows |
| **Body SM** | 12px / 16px | 12px / 16px | 400 | Secondary Metadata, Sub-text |
| **Caption** | 11px / 15px | 11px / 15px | 500 | Badges, Timestamps, Footers |
| **Monospace** | 12px / 16px | 13px / 18px | 400 | Transaction IDs, API Keys, Logs |

---

## 4. Color Palette & Dark Mode Architecture

### Palette Classification

1. **Primary (`Blue-600` / `#2563EB`)**: Brand identity, primary action buttons, active navigation indicators, checked state highlights.
2. **Secondary (`Slate-100` / `#F1F5F9`)**: Neutral action buttons, card pill backgrounds, subtle toggles.
3. **Accent (`Blue-50` / `#EFF6FF`)**: Highlighted row background, focused selection state, active badge background.
4. **Success (`Emerald-600` / `#059669`)**: Approved states, active statuses, positive metrics (+12.4%).
5. **Warning (`Amber-500` / `#F59E0B`)**: Pending reviews, warnings, soft deadlines.
6. **Danger (`Rose-600` / `#E11D48`)**: System errors, destructive actions (Delete, Reject), overdue alerts.
7. **Info (`Sky-500` / `#0EA5E9`)**: System announcements, informatory banners, tooltips.
8. **Neutral Base (`Slate-50` to `Slate-950`)**: Text colors, surfaces, borders, dividers.

### Theme Switching Engine Architecture

Theme selection operates in 3 modes: `light`, `dark`, and `system`.

```ts
// Theme Store / Context Logic
type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  root.classList.toggle('dark', isDark);
  localStorage.setItem('tasksync_theme', theme);
}
```

#### FOUC (Flash of Unstyled Content) Prevention
To prevent dark-mode flash during page hydration, the following inline script must be embedded in `<head>` of `index.html`:

```html
<script>
  (function() {
    try {
      var t = localStorage.getItem('tasksync_theme');
      var isDark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
</script>
```

---

## 5. Icon System Specification

The design system exclusively adopts **Lucide React** (`lucide-react`) for all UI iconography to maintain visual unity and optimal bundle tree-shaking.

### Icon Rules
1. **Stroke Width**: Fixed at `1.75px` across all standard icons. Set to `2px` for small icons (14px) or active navigation states.
2. **Standard Icon Sizes**:
   - `xs` (14px): Micro indicators, inline badge icons, table sort chevrons.
   - `sm` (16px): Input prefix/suffix icons, button icons, dropdown menu items.
   - `md` (20px): Sidebar menu items, page header icons, notification bell.
   - `lg` (24px): Empty state artwork, card banner icons, modal header icons.
   - `xl` (32px): Hero section features, file dropzone icons.
3. **Color Rule**: Icons MUST inherit text color (`currentColor`) from their parent container to automatically adapt to hover, focus, and dark mode states.

---

## 6. Interaction Matrix & States

Every interactive element in TaskSyncEnterprise MUST strictly implement 5 visual states:

```
[ Default State ] ──(Hover)──> [ Hover State ]
       │                               │
   (Focus Ring)                  (Mouse Press)
       ▼                               ▼
[ Focus Visible ]               [ Pressed State ]
       │                               │
       └─────────> [ Loading / Disabled ] <────────┘
```

1. **Default**: Base state with `--border` and `--text-primary`.
2. **Hover**: 
   - Primary Buttons: Scale `1.01`, background lightens to `--primary-hover`.
   - Cards: Soft elevation transition (`shadow-sm` -> `shadow-md`), border color darkens to `--slate-300` / `--slate-700`.
3. **Focus Visible**: Dual-ring accessibility indicator:
   - Inner gap: 2px offset (`ring-offset-2 ring-offset-background`).
   - Outer ring: 2px solid primary color (`ring-2 ring-ring`).
4. **Pressed / Active**: Scale `0.98` scale feedback, active color tint (`--primary-active`).
5. **Disabled**:
   - Opacity reduced to `38%` (`opacity-38` or `opacity-50`).
   - Pointer events suppressed (`pointer-events-none`).
   - Cursor set to `cursor-not-allowed`.
   - `aria-disabled="true"` attribute attached.

---

## 7. State System (Skeletons, Empty, Error, Success)

### 7.1 Skeleton Loading Architecture
Skeletons use dynamic CSS pulses to reduce perceived load times.

```css
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.skeleton-pulse {
  animation: pulse-subtle 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: var(--muted);
  border-radius: var(--radius-md);
}
```

### 7.2 Empty State Pattern
- **Icon / Illustration**: 48px circle with `--accent` background & Lucide icon.
- **Title**: `title-md` text in `--text-primary`.
- **Description**: `body-md` text in `--text-muted` limited to 320px max width.
- **Action**: Primary CTA button (e.g. `"Create First Project"`).

### 7.3 Error & Success Feedback
- **Form Error**: Inline 12px text in `--destructive` with a 14px `AlertCircle` icon + input red border (`border-destructive`).
- **Global Toast**: Top-right floating banner using Framer Motion slide-in animation.

---

## 8. Motion Foundation Specification

To ensure a refined, enterprise-grade feel, animations are quick, subtle, and purpose-driven. Heavy, slow 3D transitions are strictly forbidden.

### Framer Motion Preset Variants

```ts
// Standard Motion Presets
export const motionPresets = {
  // Page Transition (Fade in + slide slightly up)
  pageFade: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } }
  },

  // Modal Backdrop Fade
  backdropFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  },

  // Modal Dialog Scale & Fade
  modalScale: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.15 } }
  },

  // Dropdown / Popover Reveal
  dropdownReveal: {
    initial: { opacity: 0, scale: 0.95, y: -4 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.1 } }
  },

  // Slide-over Drawer
  drawerSlideRight: {
    initial: { x: '100%' },
    animate: { x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { x: '100%', transition: { duration: 0.25 } }
  }
};
```

### Reduced Motion Compliance
All motion components MUST respect `@media (prefers-reduced-motion: reduce)`:

```ts
import { useReducedMotion } from "framer-motion";
const shouldReduceMotion = useReducedMotion();
const animation = shouldReduceMotion ? {} : motionPresets.pageFade;
```

---

## 9. Accessibility (WCAG AA) Specification

1. **Target**: WCAG 2.1 Level AA compliance across all components.
2. **Keyboard Navigation & Focus Management**:
   - `Tab` / `Shift+Tab`: Focus rotates sequentially through focusable elements.
   - `Escape`: Closes open Modals, Drawers, Dropdown menus, and Popovers.
   - `ArrowUp` / `ArrowDown`: Navigates within Select options, Radio groups, and Tab lists.
   - `Focus Trap`: Implemented on all Modal dialogs (trapping focus within the active dialog using `@radix-ui/react-focus-scope` or custom hook).
3. **Screen Reader Support**:
   - Inputs bound to `<label htmlFor="id">`.
   - Modals tagged with `role="dialog"` and `aria-modal="true"`.
   - Decorative icons marked with `aria-hidden="true"`.
   - Dynamic content updates wrapped in `aria-live="polite"`.
