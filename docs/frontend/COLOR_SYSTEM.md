# TaskSyncEnterprise — Color System Specification

TaskSyncEnterprise implements a semantic, HSL-based color token system designed to support seamless rendering and accessibility targets. 

---

## 🎨 Theme Tokens mapping (HSL)

| Token Name | Light Value | Dark Value | CSS Variable | Semantic Application |
|---|---|---|---|---|
| **Background** | `210 40% 98%` | `222.2 84% 4.9%` | `--background` | Page background body color. |
| **Surface** | `0 0% 100%` | `217.2 32.6% 17.5%` | `--surface` | Core card and element background containers. |
| **Primary** | `221.2 83.2% 53.3%` | `217 91% 60%` | `--primary` | Highlight buttons, checkboxes, active anchors. |
| **Secondary** | `210 40% 96.1%` | `215.3 25% 26.7%` | `--secondary` | Inactive pills, muted button backgrounds. |
| **Border** | `214.3 31.8% 91.4%` | `215.3 25% 26.7%` | `--border` | Dividers, boundaries, cards container borders. |
| **Ring** | `221.2 83.2% 53.3%` | `217 91% 60%` | `--ring` | Keyboard focus accessibility highlights. |

---

## 🚦 Status Indicators

Status color bounds align with standard accessibility color-contrast limits:

- **Success (`--success`):** Mapped to emerald scales (Light: `160 84% 39%` / Dark: `152 81% 96%`). Indicates finished tasks, active employees, and approved leave items.
- **Warning (`--warning`):** Mapped to amber scales (Light/Dark: `38 92% 50%`). Represents pending review tasks and items needing review.
- **Danger (`--destructive`):** Mapped to rose scales (Light: `346 87% 59%` / Dark: `355 100% 97%`). Used for overdue notifications, deletion actions, and error dialog alerts.
- **Info (`--info`):** Mapped to sky scales (Light/Dark: `199 89% 48%`). Highlight general updates.
