# DMI College Hostel Management PWA — Domain Glossary

This document establishes the single source of truth for all domain nomenclature, user-facing labels, data models, and workflow concepts across the DMI College Hostel Management PWA.

---

## 1. Core Identity & Architectural Roles

| Term | UI Label | Code Identifier | Description & Authority |
| :--- | :--- | :--- | :--- |
| **Student** | Student | `ROLES.STUDENT` / `"student"` | Hostel resident enrolled in an engineering programme. Can submit pass requests, upload photos, scan Gate QR posters upon exit/entry, and submit letters. |
| **Warden** | Warden | `ROLES.WARDEN` / `"warden"` | Primary hostel administrator. **The sole authority for issuing gate passes, approving or rejecting student requests**, setting gate QR codes, managing rooms, and managing staff accounts. |
| **Staff** | Faculty Advisor / Staff | `ROLES.STAFF` / `"staff"` | Department faculty member. **Advisory only**. Reviews student requests in their department and submits an advisory **recommendation** (Recommend / Do Not Recommend with notes). Never approves or issues passes. |
| **HOD** | Head of Department | `ROLES.HOD` / `"hod"` | Department head. **Advisory only**. Provides department-level recommendations, views department attendance metrics, and manages department letters. |
| **Principal** | Principal | `ROLES.PRINCIPAL` / `"principal"` | Campus-wide executive leadership. Read-only oversight across all departments, late returns, repeat offenders, and security logs. Has discretionary approval on student leave letters if enabled. |
| **Correspondent** | Correspondent | `ROLES.CORRESPONDENT` / `"correspondent"` | College management governance. Read-only campus oversight, analytics, and institutional audits. Discretionary approval on student leave letters if enabled. |

---

## 2. Hostel & Campus Structure

| Term | UI Label | Code Reference | Description |
| :--- | :--- | :--- | :--- |
| **Hostel** | DMI Boys Hostel | Campus Facility | Single multi-story hostel building. There are **no blocks** (Blocks A, B, C are retired). |
| **Floor** | Floor | `floor` (`"GF"`, `"F2"`, `"F3"`, `"F4"`) | Four residential floors: Ground Floor (`GF`), 2nd Floor (`F2`), 3rd Floor (`F3`), 4th Floor (`F4`). |
| **Room Number** | Room | `roomNo` / `room` | Formatted per floor prefix: Ground Floor `G01`–`G30`, other floors `201`–`230`, `301`–`330`, `401`–`430`. Regex: `^(G\d{2}\|[2-4]\d{2})$`. |
| **Room Capacity** | Room Capacity | `WORKFLOW_CONFIG.roomCapacity` (4) | Fixed capacity of 4 students per room. |
| **Main Gate** | Main Gate | `WORKFLOW_CONFIG.gates` (`[{ id: "MAIN", name: "Main Gate" }]`) | Exactly **one** monitored campus gate staffed 24/7. |

---

## 3. Pass Lifecycle & Terminology

| Concept | Preferred Term | Deprecated / Disallowed Terms | Definition |
| :--- | :--- | :--- | :--- |
| **Outpass Request** | **Pass** / **Outpass** | Movement slip, Permission form | The initial application created by a resident student for campus exit. |
| **Authorized Pass** | **Gate Pass** | Ticket, Boarding pass | A pass that has been officially approved and issued by the Chief Warden, permitting physical campus exit. |
| **Gate QR Poster** | **Gate QR** | Student Pass QR, Kiosk Screen, Guard App | The dynamic cryptographic QR code printed or displayed on a poster at the Main Gate kiosk. The student scans the poster using their phone camera. |
| **Recommendation** | **Staff / HOD Recommendation** | Staff Approval, HOD Sign-off | Non-binding advisory note (`recommend` or `do_not_recommend`) from departmental mentors. |
| **Approval** | **Warden Approval** | Principal Approval (for passes) | Final binding decision rendered exclusively by the Warden. |
| **Curfew Time** | **Hostel Curfew (9:00 PM)** | Lockdown, Closing time | Evening campus deadline (21:00) by which local pass holders must return. |
| **Overdue** | **Overdue** / **Late Return** | Absent without leave, Defaulter | Resident who failed to return to campus before the authorized `expectedReturnTime`. |

---

## 4. Pass Status Values

| Status Key | UI Chip Label | Description |
| :--- | :--- | :--- |
| `pending` | Pending | Pass submitted by resident, awaiting staff recommendation or warden review. |
| `recommended` | Recommended | Staff/HOD has submitted an advisory note. |
| `approved` | Approved | Warden approved; awaiting gate pass activation. |
| `gate_pass_issued` | Gate Pass Issued | Pass is active; student is authorized to scan at the Main Gate to leave campus. |
| `out` | Out | Resident has successfully scanned the Main Gate QR and exited campus. |
| `returned` | Returned | Resident has scanned the Main Gate QR upon return and is back in campus safely. |
| `overdue` | Overdue | Resident has not returned before the expected return deadline. |
| `rejected` | Rejected | Warden has declined the request with a stated reason. |
| `cancelled` | Cancelled | Student has withdrawn the request prior to departure. |

---

## 5. Authentication & Navigation Concepts

| UI Term | Meaning & Placement |
| :--- | :--- |
| **"Student" Tab** | First tab on `/login`: Student ID or Register Number + Password. |
| **"Staff / Admin" Tab** | Second tab on `/login`: Official Gmail address (`staff.*@gmail.com`, `hod.*@gmail.com`, `warden.*@gmail.com`, etc.) + Password. |
| **Command Palette** | Desktop shortcut `Ctrl+K` or search icon in top navigation bar for global fuzzy jumping. |
| **Offline Mode** | Read-only PWA state activated when `navigator.onLine === false`. Gate scanning is strictly blocked to maintain cryptographic clock integrity. |
