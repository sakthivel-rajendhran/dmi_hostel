# DMI College Hostel Management PWA — Test Accounts & Credentials Reference

This document catalogs all deterministic test accounts pre-configured in the application for testing and demonstration.

---

## 1. Student Residents (Login via "Student" Tab)

| Name | Student ID | Register Number | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rahul Kumar** | `CSE-3-001` | `310621104001` | `rahul.kumar@gmail.com` | `Student@123` | CSE, 3rd Year, Floor F3, Room 304. 100% complete profile. 12 deterministic passes across all 9 statuses. |
| **Karthik Raja** | `IT-2-004` | `310622205004` | `karthik.raja@gmail.com` | `Student@123` | IT, 2nd Year, Floor F2, Room 204. Incomplete profile (testing profile completion banner). |
| **Praveen Sundaram**| `ECE-2-005` | `310622106005` | `praveen.sundaram@gmail.com` | `Student@123` | ECE, 2nd Year, Floor F2, Room 210. Deterministic repeat offender (late return watchlist). |

---

## 2. Staff, HOD, Warden & Leadership (Login via "Staff / Admin" Tab)

| Role | Name | Email (Gmail ID) | Password | Portal Permissions & Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Warden** | Dr. John Xavier | `warden.dmi@gmail.com` | `Warden@123` | Chief Warden. **The sole final approver** for all passes, gate passes, room allocations, gate QR posters, and staff account management. |
| **Staff (Advisor)**| Prof. Rajesh Sharma | `staff.cse1@gmail.com` | `Staff@123` | CSE Faculty Advisor (3rd & 4th Years). Advisory pass recommendations, student attendance reviews. |
| **Staff (Advisor)**| Prof. Anand Kumar | `staff.ece1@gmail.com` | `Staff@123` | ECE Faculty Advisor (2nd Year). Advisory pass recommendations. |
| **HOD** | Dr. K. Arulmozhi | `hod.cse@gmail.com` | `Staff@123` | Head of Department (CSE). Department-wide pass recommendations, student directory, attendance analytics. |
| **Principal** | Dr. M. Senthil Kumar| `principal.dmi@gmail.com` | `Staff@123` | Campus Principal. Executive campus overview, department breakdowns, late returns audit, security log oversight. |
| **Correspondent** | Rev. Fr. J. Antony | `correspondent.dmi@gmail.com`| `Staff@123` | Institutional Correspondent. Governance overview, campus audits, institutional analytics. |

---

## 3. Account Lifecycle Testing

- **Temporary Password Login**: Create a new faculty member under `/warden/staff-accounts` (initial password defaults to `Staff@123` with `mustChangePassword: true`). Upon first login, user is routed directly to `/change-password` before accessing the dashboard.
- **Disabled Account Login**: Disable an account in `/warden/staff-accounts` with a stated reason. Attempting to sign in with that account immediately returns an `Account Disabled` error banner.
