# TaskSyncEnterprise — Typography Specification

TaskSyncEnterprise targets maximum text legibility and structural hierarchy across various screen widths.

---

## 🔤 Primary Font Families

1. **Sans-Serif (sans):** `'Inter Variable', 'Segoe UI', Arial, sans-serif`. Used for all body text, dashboard KPI cards, sidebar items, lists, and forms.
2. **Display font (display):** `'Inter Variable', 'Segoe UI', Arial, sans-serif`. Handled for page headings and numbers to maintain visual hierarchy.
3. **Monospace (mono):** `'JetBrains Mono', 'Fira Code', monospace`. Handled in table lists, search prompts, and database keys (e.g. employee IDs: `EMP-1001`).

---

## 📐 Font Scale & Line Heights

Hierarchy is controlled via text size classes in Tailwind:

| Class Name | Font Size | Line Height | Usage Context |
|---|---|---|---|
| `text-[11px]` | 11px | 16px | Sidebar section groupings, mini action badges. |
| `text-xs` | 12px | 18px | Descriptive captions, form labels, tooltips. |
| `text-sm` | 14px | 20px | Table cell records, input forms text values. |
| `text-base` | 16px | 24px | Default text descriptions, dialogue paragraphs. |
| `text-lg` | 18px | 28px | Card headers titles, section descriptions. |
| `text-xl` | 20px | 30px | Standard page subheadings, modal titles. |
| `text-2xl` | 24px | 32px | Main workspace headers (e.g. `Executive Dashboard`). |
