# DMI College Hostel Management PWA — Backend Migration Checklist

Follow this checklist to replace client-side mock services with Supabase / PostgreSQL.

---

## Phase 1: Database Setup
- [ ] Create Supabase project or PostgreSQL database.
- [ ] Execute `docs/handoff/DATA_MODEL.md` schema DDL to create tables, enums, foreign keys, and indexes.
- [ ] Execute `docs/handoff/RLS_POLICIES.md` DDL to activate Row Level Security for all roles.
- [ ] Seed initial administrative accounts from `docs/handoff/TEST_ACCOUNTS.md`.

---

## Phase 2: Cloud Storage Setup
- [ ] Create public bucket `student-photos` and authenticated bucket `student-letters`.
- [ ] Configure CORS policy on buckets to allow origins (`http://localhost:3000`, production domain).
- [ ] Configure storage upload size limits (1 MB for photos, 2 MB for letters).

---

## Phase 3: Service Layer Adapter Implementation
In `src/lib/services/`:
- [ ] **`authService.js`**: Replace mock login with `supabase.auth.signInWithPassword(...)`. Handle `must_change_password` flag.
- [ ] **`studentService.js`**: Connect `listStudents`, `getStudentById`, `registerStudent`, `getRooms` to `students` and `rooms` tables.
- [ ] **`passService.js`**: Connect `listPasses`, `getPassById`, `applyPass`, `approvePass`, `rejectPass`, `issueGatePass` to `outpasses` table.
- [ ] **`gateService.js`**: Implement server-side verification of daily poster QR tokens and geofence distance calculation.
- [ ] **`accountService.js`**: Connect staff management, temporary password issuance, and audit logs.
- [ ] **`reportService.js`**: Implement analytical aggregates (late return counts, cohort activity, department breakdowns).

---

## Phase 4: Production Verification
- [ ] Run `bun run test:units` and `bun run scripts/test-phase6-e2e.js` against staging backend.
- [ ] Verify PWA installability and offline caching behavior.
- [ ] Verify no mock imports remain in production bundle (`bun run audit:mock-free`).
- [ ] Verify zero console warnings and zero hydration errors.
