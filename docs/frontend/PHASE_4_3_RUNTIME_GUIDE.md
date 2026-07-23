# TaskSyncEnterprise — Phase 4.3 Runtime Architecture & Provider Guide

**Document Version:** 1.0.0  
**Phase:** 4.3 Runtime Integration, Application Shell & Authentication UI  
**Target:** Engineering & QA Operations Teams  

---

## 1. Overview

Phase 4.3 integrates the reusable component library built in Phase 4.2 into a fully functional, runnable enterprise application shell (`ApplicationShell.tsx`) with global theme management, authentication state tracking, toast notification dispatching, client-side route protection, and a development component showcase (`/dev/components`).

---

## 2. Provider Hierarchy (`src/app/AppProviders.tsx`)

The application wraps all route components in a clean, strongly typed provider tree to avoid deeply nested JSX logic inside `App.tsx`:

```
┌──────────────────────────────────────────────────────────┐
│                   QueryClientProvider                    │
│    (TanStack Query - Caching, API retry & stale time)    │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│                      ThemeProvider                       │
│    (Light/Dark/System theme engine & localStorage)       │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│                      AuthProvider                        │
│     (JWT access token tracking, User identity, Login)    │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│                      ToastProvider                       │
│     (useToast hook context & ToastContainer renderer)     │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Theme Engine (`src/providers/ThemeProvider.tsx`)
- **Supported Modes**: `light`, `dark`, `system`.
- **Storage Key**: `tasksync_theme` in `localStorage`.
- **Class Toggle**: Automatically manages `.dark` class on `document.documentElement`.
- **System Preference**: Listens to `@media (prefers-color-scheme: dark)` changes dynamically.

### 2.2 Auth Provider (`src/providers/AuthProvider.tsx`)
- Integrates with `tokenService` (`getAccessToken`, `getRefreshToken`, `setTokens`, `clear`).
- Stores user profile object in `localStorage.setItem('user', ...)`.
- Preserves target location path when redirecting unauthenticated users to `/login`.

### 2.3 Toast Dispatcher (`src/providers/ToastProvider.tsx`)
- Exposes `useToast()` hook with 4 helper functions: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`.
- Renders `ToastContainer` with top-right floating stack and 4000ms auto-dismiss timer.

---

## 3. Route Architecture & Path Table

| Route Path | Type | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `/login` | Public | Unauthenticated | Enterprise login screen with password toggle & remember-me |
| `/forgot-password` | Public | Unauthenticated | Password reset link dispatcher |
| `/unauthorized` | Public | Any | 403 Access Denied error screen |
| `/404` | Public | Any | 404 Not Found error screen |
| `/dev/components` | Dev | Protected | Interactive showcase for all 25 Phase 4.2 UI components |
| `/dashboard` | Protected | Authenticated | Main enterprise dashboard shell with KPI metric cards |
| `/projects` | Protected | Authenticated | Project directory & detail view |
| `/tasks` | Protected | Authenticated | Task queue & Kanban board |
| `/employees` | Protected | Authenticated | Employee directory & profiles |
| `/departments` | Protected | Authenticated | Department breakdown |
| `/calendar` | Protected | Authenticated | Leave & calendar planner |
| `/notifications` | Protected | Authenticated | Notification inbox |
| `/settings` | Protected | Authenticated | System configuration settings |
| `/profile` | Protected | Authenticated | User account settings |
| `/audit` | Protected | Authenticated | Audit log stream |
| `*` | Catch-all | Any | Redirects to 404 Not Found page |

---

## 4. Application Shell (`src/layouts/ApplicationShell.tsx`)

The `ApplicationShell` provides a unified 12-column responsive viewport structure:

1. **Skip-to-Content Link**: Focusable anchor (`#main-content`) for screen readers.
2. **Desktop Sidebar**: Fixed vertical navigation menu supporting expanded (260px) and collapsed (72px) states with active route highlights.
3. **Mobile Navigation Drawer**: Slide-over drawer (< 1024px) triggered by top-left hamburger icon.
4. **Top Navbar Header**: Fixed 64px bar featuring `Cmd+K` global command search trigger, unread notification counter, theme toggle button, and user profile avatar dropdown.
5. **Main Viewport**: Padded content area with max width container (`max-w-7xl`).
