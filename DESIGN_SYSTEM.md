# DMI College Hostel Management PWA - Design System & Component Catalog

Welcome to the official Design System specification for the **DMI College Hostel Management PWA** ("Fully Human & Fully Alive"). This design system delivers a secure, accessible, role-aware, and responsive frontend foundation.

---

## 1. Design Principles

1. **Role-Tailored Context**: Layout shells adapt seamlessly to the user's role—mobile-first phone mockup for students, high-density dashboard for administration, and distraction-free kiosk for gate security.
2. **Glassmorphism & Depth**: Soft gradients, `backdrop-blur`, and subtle shadows reflect a premium, modern campus atmosphere without sacrificing legibility or contrast.
3. **Deterministic State**: Built with TanStack React Query and strict service contracts, enabling zero-latency UI testing and seamless backend swapping.
4. **Accessibility First**: WCAG 2.1 AA compliant color contrast, focus rings, keyboard navigability (ESC, Tab, Ctrl+K), and responsive touch targets (&ge; 44px).

---

## 2. Color Palette & Token Definitions

All tokens are defined in `tailwind.config` and `src/app/globals.css`.

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `primary` | `#2B2FE0` | `#3B40FF` | Primary buttons, active indicators, brand highlights |
| `primary-gradient` | `#2438E8` &rarr; `#6D28D9` | `#2438E8` &rarr; `#6D28D9` | Top banners, hero headings, login card accents |
| `accent-lavender` | `#8FA2FF` &rarr; `#B7A6FF` | `#8FA2FF` &rarr; `#B7A6FF` | Highlighted words in hero typography |
| `accent-gold` | `#FFC83D` | `#F59E0B` | Handwritten quotes, underlines, badges |
| `success` | `#16A34A` | `#22C55E` | Approved passes, verified entries, valid gates |
| `warning` | `#F59E0B` | `#FBBF24` | Pending requests, curfew warnings, reminders |
| `danger` | `#DC2626` | `#EF4444` | Rejected passes, overdue returns, curfew alerts |
| `text-dark` | `#111936` | `#F8FAFC` | Primary text headings |
| `text-muted` | `#5B6485` | `#94A3B8` | Subtitles, labels, metadata |
| `glass-light` | `rgba(255,255,255,0.72)` | `rgba(15,20,50,0.60)` | Card containers with `backdrop-blur-2xl` |

---

## 3. Typography Hierarchy

Fonts are loaded via `next/font`:
- **UI & Content**: `"Plus Jakarta Sans"` (weights: 400, 500, 600, 700, 800)
- **Monospace IDs & Codes**: `"JetBrains Mono"` (weights: 400, 500, 600, 700)
- **Campus Motto Quote**: `"Caveat"` (weights: 600, 700)

| Style | Size / Leading | Weight | Font Family | Usage |
|---|---|---|---|---|
| Display / H1 | `clamp(2rem, 4vw, 3rem)` | 800 (Extrabold) | Plus Jakarta Sans | Hero headings, Kiosk status |
| H2 | `1.5rem / 2rem` | 700 (Bold) | Plus Jakarta Sans | Section headers, page titles |
| H3 | `1.125rem / 1.75rem` | 600 (Semibold) | Plus Jakarta Sans | Card headings, table titles |
| Body | `0.875rem / 1.25rem` | 400 / 500 | Plus Jakarta Sans | Default text, form labels |
| Caption / Meta | `0.75rem / 1rem` | 500 (Medium) | Plus Jakarta Sans | Badges, timestamps, hints |
| Code / ID | `0.8125rem` | 600 (Semibold) | JetBrains Mono | Student IDs (`CSE-3-001`), Pass IDs |
| Quote | `1.25rem` | 700 (Bold) | Caveat | *"Fully Human & Fully Alive"* |

---

## 4. Status Chips (All 9 Pass Lifecycles)

Defined centrally in `src/config/status.js`.

| Status Key | Label | Dot Color | Badge Background | Meaning |
|---|---|---|---|---|
| `pending` | Pending | Amber (`bg-amber-500`) | `bg-amber-50` | Awaiting warden/staff review |
| `recommended` | Recommended | Sky (`bg-sky-500`) | `bg-sky-50` | Staff advisor endorsed |
| `approved` | Approved | Emerald (`bg-emerald-500`) | `bg-emerald-50` | Warden approved, gate ready |
| `rejected` | Rejected | Rose (`bg-rose-500`) | `bg-rose-50` | Denied by warden or staff |
| `gate_pass_issued` | Gate Pass Issued | Indigo (`bg-indigo-500`) | `bg-indigo-50` | Active digital QR code ready |
| `out` | Out of Campus | Blue (`bg-blue-500`) | `bg-blue-50` | Verified checkout at gate |
| `returned` | Returned | Emerald (`bg-emerald-600`) | `bg-emerald-100` | Returned safely to campus |
| `overdue` | Overdue Return | Red (**Pulsing Dot**) | `bg-red-50 text-red-700` | Exceeded return curfew |
| `cancelled` | Cancelled | Slate (`bg-slate-400`) | `bg-slate-100` | Cancelled by student |

---

## 5. Role Accents & Shell Matrix

Defined in `src/config/roles.js`.

| Role | Key | Shell Type | Accent Color | Primary Home Route |
|---|---|---|---|---|
| **Student** | `student` | `StudentShell` | `#2B2FE0` (Indigo/Blue) | `/student/dashboard` |
| **Chief Warden** | `warden` | `DashboardShell` | `#4F46E5` (Indigo) | `/warden/dashboard` |
| **Faculty Advisor** | `staff` | `DashboardShell` | `#0D9488` (Teal) | `/staff/dashboard` |
| **HOD** | `hod` | `DashboardShell` | `#7C3AED` (Violet) | `/hod/dashboard` |
| **Principal** | `principal` | `DashboardShell` | `#D97706` (Amber/Gold) | `/principal/overview` |
| **Correspondent** | `correspondent` | `DashboardShell` | `#0284C7` (Sky/Gold) | `/correspondent/overview` |
| **Gate Device** | `gate` | `KioskShell` | `#059669` (Emerald) | `/gate` |

---

## 6. Layout Shell Architecture

### 6.1 `StudentShell.jsx`
- **Mobile (< 1024px)**: Full viewport mobile web application with sticky top bar, slide-out hamburger drawer, and 4-tab bottom navigation (`Home`, `Apply`, `My Passes`, `Profile`).
- **Desktop (&ge; 1024px)**: Renders a centered **480px simulated mobile device frame** with status bar notch, soft drop shadow (`0 25px 70px rgba(36,56,232,0.25)`), and ambient college branding on the flanks.

### 6.2 `DashboardShell.jsx`
- **Collapsible Sidebar**: Expands to `264px`, collapses to `76px` with tooltips; preference persisted in `localStorage.getItem("dmi_sidebar_collapsed")`.
- **Top Command Bar**: `Ctrl+K` searchable command palette, role badge, notification bell with unread count, dark mode toggle, and avatar profile dropdown.
- **Role Accent Border**: Top bar highlights with role-specific accent tones.

### 6.3 `KioskShell.jsx`
- **Station Mode**: High-contrast, touch-optimized full-screen kiosk for main campus gate terminals.
- **Hardware Simulation**: Live ticking 12-hour/24-hour clock, screen wake-lock requester, and network online/offline sensor.
- **Hidden Exit**: Long-press DMI college shield logo for 3 seconds &rarr; triggers supervisor PIN prompt (`1234`) to exit kiosk safely.
- **Ambient Feedback**: `KioskResultOverlay` covers screen in Emerald (Pass Approved) or Rose (Access Denied).

---

## 7. Component Library Catalog (`src/components/ui/`)

| Component | Props | Description |
|---|---|---|
| `Button` | `variant`, `size`, `isLoading`, `leftIcon`, `rightIcon` | Primary, secondary, outline, ghost, danger, glass |
| `IconButton` | `icon`, `size`, `variant`, `aria-label` | Circular or rounded icon button |
| `Input` | `label`, `error`, `helperText`, `leftIcon`, `rightIcon` | Accessible text input with label and validation |
| `PasswordInput`| `label`, `error`, `helperText` | Password input with toggleable visibility eye |
| `SearchInput` | `placeholder`, `onClear`, `value`, `onChange` | Search box with clear button |
| `Textarea` | `label`, `error`, `rows`, `helperText` | Multi-line text field |
| `Select` | `label`, `options`, `value`, `onChange` | Standard select dropdown |
| `Checkbox` | `label`, `checked`, `onChange` | Custom styled checkbox |
| `RadioGroup` | `options`, `value`, `onChange` | Radio button group |
| `Switch` | `checked`, `onChange`, `label` | Toggle switch |
| `SegmentedControl` | `options`, `value`, `onChange` | Sliding pill tab selector |
| `StatusChip` | `status`, `size`, `showDot` | Colored badge for 9 outpass statuses |
| `RoleBadge` | `role`, `size` | Role indicator badge with icon |
| `StatCard` | `title`, `value`, `subtitle`, `icon`, `variant` | Metric display card |
| `Avatar` | `name`, `src`, `size`, `status` | User profile avatar with online/offline dot |
| `Modal` | `isOpen`, `onClose`, `title`, `description` | Accessible dialog with ESC dismissal |
| `Drawer` | `isOpen`, `onClose`, `title`, `position` | Animated slide-out side drawer |
| `Timeline` | `items [{ title, description, time, isCompleted }]` | Step-by-step audit history |
| `QrPlaceholder`| `value`, `size` | High-resolution SVG QR code renderer |
| `NotificationBell` | `count`, `onClick` | Header notification icon with badge |

---

## 8. Interactive QA & Testing

Visit `/design-system` in any browser to interact with every token, atom, molecule, and shell component.
