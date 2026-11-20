# DMI College Hostel Management PWA — Architecture Specification

## 1. System Topology & Abstraction Layer

The DMI Hostel Management system is architected as an offline-capable Progressive Web App (PWA) with a **strict Service-Layer Abstraction Pattern**. No UI component interacts directly with databases, network transports, or mock storage.

```
┌────────────────────────────────────────────────────────┐
│                   UI Presentation Layer                │
│    (Next.js 16 App Router · Tailwind CSS · Lucide)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    React Query Hooks                   │
│   (usePasses, useStudents, useAccounts, useReports)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Service Layer Contract               │
│ (authService, passService, gateService, accountService)│
└─────────────┬────────────────────────────┬─────────────┘
              │ (Current Phase 0-6)        │ (Phase 7+ Backend Plug-in)
┌─────────────▼──────────────┐ ┌───────────▼─────────────┐
│ Client-Side Deterministic  │ │ Supabase / PostgreSQL   │
│ Mock Store & Storage Persist│ │ REST / RPC / Realtime   │
└────────────────────────────┘ └─────────────────────────┘
```

---

## 2. Zero-Rewrite Migration Guarantee

The service functions located in `src/lib/services/*.js` return standard response envelopes:
```typescript
interface ServiceResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}
```

To plug in a real backend (e.g. Supabase, Firebase, or Node.js/PostgreSQL):
1. **Zero UI modifications are required**. Not a single page, component, or hook needs to change.
2. Inside `src/lib/services/*Service.js`, replace the mock read/write calls with `supabase.from('table').select(...)` or fetch calls.
3. Keep the return shape `{ ok: true, data }` or `{ ok: false, message }`.

---

## 3. Technology Stack

- **Framework**: Next.js 16.4.6 with Turbopack bundler.
- **State & Server Cache**: `@tanstack/react-query` v5 with `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister`.
- **Styling**: Tailwind CSS with custom glassmorphism design tokens, full dark mode, and high-contrast typography.
- **Forms & Validation**: `react-hook-form` paired with `zod` validation schemas (`/src/lib/validators.js`).
- **PWA Runtime**: Custom Service Worker (`/public/sw.js`), Web App Manifest (`/public/manifest.json`), install prompts, and offline cache fallbacks.
- **Visualizations**: `recharts` (dynamically code-split) and `qrcode.react`.
- **Export Engine**: `xlsx` (SheetJS) (dynamically imported on-demand).
