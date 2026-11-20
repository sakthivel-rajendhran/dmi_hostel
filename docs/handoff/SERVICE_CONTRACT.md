# DMI College Hostel Management PWA — Service Contract Specification

This document details every service function, its signature, parameters, and return shape. The backend implementation must fulfill this contract.

---

## 1. Authentication Service (`authService.js`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `login(role, identifier, password)` | `role: string, identifier: string, password: string` | `Promise<{ success: boolean, session?: object, message?: string }>` | Authenticates student or staff account. Rejects disabled accounts with `ACCOUNT_DISABLED`. |
| `getCurrentSession()` | None | `object \| null` | Returns active user session object. |
| `logout()` | None | `void` | Clears active session and triggers React Query cache purge. |
| `changePassword(oldPassword, newPassword)` | `oldPassword: string, newPassword: string` | `Promise<{ ok: boolean, message?: string }>` | Validates old password and sets new password, clearing `mustChangePassword` flag. |

---

## 2. Pass Service (`passService.js`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `listPasses(filters)` | `filters: { status?, type?, search?, studentId?, page?, pageSize? }` | `Promise<ServiceResponse<Pass[]>>` | Filtered, searchable, paginated list of passes. |
| `getPassById(passId)` | `passId: string` | `Promise<ServiceResponse<Pass>>` | Fetches single outpass with full timeline and recommendations. |
| `checkEligibility(studentId, passType, departureTime, returnTime)` | `studentId, passType, departureTime, returnTime` | `Promise<{ allowed: boolean, reason?: string }>` | Validates overdue lock, monthly limits, curfew (21:00), and max days. |
| `applyPass(payload)` | `payload: CreatePassInput` | `Promise<ServiceResponse<Pass>>` | Submits new pass application. |
| `cancelPass(passId)` | `passId: string` | `Promise<ServiceResponse<Pass>>` | Student cancels their own pending pass. |
| `recommendPass(passId, verdict, note)` | `passId: string, verdict: "recommend" \| "do_not_recommend", note: string` | `Promise<ServiceResponse<Pass>>` | Staff/HOD advisory recommendation (non-final). |
| `approvePass(passId)` | `passId: string` | `Promise<ServiceResponse<Pass>>` | Warden final approval. |
| `rejectPass(passId, reason)` | `passId: string, reason: string` | `Promise<ServiceResponse<Pass>>` | Warden final rejection with mandatory reason. |
| `issueGatePass(passId)` | `passId: string` | `Promise<ServiceResponse<Pass>>` | Warden activates gate pass for gate poster scanning. |

---

## 3. Gate Service (`gateService.js`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `processGateScan(payload)` | `payload: { qrText: string, studentId: string, location?: object, manualCode?: string }` | `Promise<ServiceResponse<{ action: "EXIT" \| "ENTRY", pass: object, timestamp: string }>>` | Evaluates scanned poster QR, validates student active pass, geofence, and records exit or entry. |
| `getGatePosterConfig(gateId)` | `gateId?: string` | `Promise<ServiceResponse<{ gateId: string, dateKey: string, nonce: string, qrPayload: string }>>` | Returns deterministic daily poster payload for gate kiosk display. |

---

## 4. Student Service (`studentService.js`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `listStudents(filters)` | `filters: { page?, pageSize?, search?, department?, year?, floor? }` | `Promise<ServiceResponse<Student[]>>` | Student directory with multi-field search and filters. |
| `getStudentById(studentId)` | `studentId: string` | `Promise<ServiceResponse<Student>>` | Detailed student profile enriched with pass history. |
| `getProfileCompleteness(studentId)` | `studentId: string` | `Promise<ServiceResponse<{ percentage: number, complete: boolean, missingFields: string[] }>>` | Profile completeness checker. |
| `registerStudent(payload)` | `payload: RegisterStudentInput` | `Promise<ServiceResponse<Student>>` | 3-step wizard sign-up with photo and room allocation. |
| `getRooms(filters)` | `filters: { floor?: string }` | `Promise<ServiceResponse<Room[]>>` | Building room allocations and occupancy rates. |

---

## 5. Staff Accounts Service (`accountService.js`)

| Function | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `list(filters)` | `filters: { search?, role?, department?, status?, page?, limit? }` | `Promise<ServiceResponse<{ accounts: object[], stats: object }>>` | Warden staff management table. |
| `create(payload)` | `payload: CreateAccountInput` | `Promise<ServiceResponse<object>>` | Creates staff account, Title Cases name, generates temporary password. |
| `update(id, patch)` | `id: string, patch: object` | `Promise<ServiceResponse<object>>` | Updates staff member profile. |
| `resetPassword(id)` | `id: string` | `Promise<ServiceResponse<{ temporaryPassword: string }>>` | Resets password, forces `mustChangePassword`. |
| `disable(id, reason)` | `id: string, reason: string` | `Promise<ServiceResponse<object>>` | Disables account with mandatory reason. |
| `enable(id)` | `id: string` | `Promise<ServiceResponse<object>>` | Re-enables disabled account. |
| `remove(id)` | `id: string` | `Promise<ServiceResponse<object>>` | Deletes account (blocked if pending recommendations exist). |
| `reassignPending(fromId, toId)` | `fromId: string, toId: string` | `Promise<ServiceResponse<{ reassignedCount: number }>>` | Reassigns pending reviews to another faculty member. |
| `getAuditLog(limit)` | `limit?: number` | `Promise<ServiceResponse<AuditEntry[]>>` | Staff management audit trail. |
