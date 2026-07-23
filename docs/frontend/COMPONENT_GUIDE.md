# TaskSyncEnterprise — Component Guide

This guide details usage patterns, customization variants, and accessibility expectations for the core UI elements.

---

## 🔘 1. Buttons & Action Components

### Properties & Configurations
- **variant:** `primary` | `secondary` | `outline` | `ghost` | `danger` | `link`
- **size:** `sm` | `md` | `lg` | `icon`
- **isLoading:** `boolean` (displays an active spin loader, disabling interaction)
- **leftIcon / rightIcon:** `React.ReactNode`

### Standard Example
```tsx
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

<Button variant="primary" size="md" leftIcon={<Plus />}>
  Create Record
</Button>
```

---

## 📝 2. Forms & User Inputs

### Inputs & Textarea
Both inputs and textarea controls support dynamic error styles and required visual indicator dots:

```tsx
import { Input } from '@/components/ui/Input';
import { Mail } from 'lucide-react';

<Input
  type="email"
  label="Email Address"
  required
  leftIcon={<Mail className="h-4 w-4" />}
  placeholder="name@company.com"
  error={formErrors.email}
/>
```

- **Password Toggling:** The `Input` component automatically mounts show/hide actions when the `type="password"` prop is provided.

---

## 🗃️ 3. Modals & Side Panels (Drawers)

Both overlays handle the following standard actions:
- Auto focus locking upon render.
- Scroll locks on the document body (`overflow: hidden`).
- Background overlays styled with `backdrop-blur-sm` and custom animations.
- Dismissals on `Escape` key actions or clicks outside content areas.

### Drawer Example
```tsx
import { Drawer } from '@/components/common/Drawer';

<Drawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Inspector Panel"
  position="right"
  size="md"
  footer={<Button onClick={() => setIsOpen(false)}>Save changes</Button>}
>
  <p>Detail records go here...</p>
</Drawer>
```
