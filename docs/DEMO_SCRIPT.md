# DMI College Hostel Management PWA — 10-Minute Walkthrough & Demo Script

Follow this structured demonstration script to showcase the complete application to leadership, wardens, department heads, and students.

---

## Act 1: The Resident Student Experience (Minutes 0:00 – 3:30)

1. **Sign-In & PWA Experience**:
   - Navigate to `http://localhost:3000/login`.
   - Highlight the **PWA Install button** and vintage vignette branding.
   - On the **"Student"** tab, enter `CSE-3-001` and password `Student@123`. Click **Login**.
2. **Student Dashboard & Quick Stats**:
   - Point out the active status greeting: *"CSE · 3rd Year · 3rd Floor · Room 304"*.
   - View the active pass widget and the 4 status cards.
3. **Applying for an Outpass**:
   - Click **Apply for Pass** (`/student/apply`).
   - Select **Local Pass**, enter destination *"Town Market"*, departure in 1 hour, return before 21:00.
   - Show instant eligibility validation (curfew at 9:00 PM, monthly pass limits, no overdue passes).
   - Submit the application. Toast confirms successful submission.
4. **Main Gate QR Poster Scanning**:
   - Navigate to `/student/scan` via the bottom raised camera icon.
   - Demonstrate camera viewfinder, GPS geofence badge (*"Geofence Ready: 12.845, 79.95"*), and torch toggle.
   - Use the **Manual Code Tab** and enter code `k3x9ab`. Click **Verify Gate Code**.
   - Show the dynamic, color-coded **Exit Approved** screen with proof-of-live ticking digital clock.

---

## Act 2: Department Faculty & HOD Advisory Flow (Minutes 3:30 – 5:30)

1. **Faculty Advisor Review**:
   - Sign out and switch to the **"Staff / Admin"** tab on `/login`.
   - Log in as `staff.cse1@gmail.com` (`Staff@123`).
   - Navigate to `/staff/requests`. Open the student request.
   - Enter an advisory note: *"Academic standing verified above 85%"* and submit **Recommend**.
   - Emphasize that **the advisor does not issue passes**—this is strictly advisory.
2. **HOD Analytics**:
   - Switch to `hod.cse@gmail.com` (`Staff@123`).
   - Navigate to `/hod/analytics`.
   - Demonstrate real-time cohort distribution charts, peak departure hour curves, frequent leaver rankings, and the **Export Multi-Sheet Excel (.xlsx)** button.

---

## Act 3: Chief Warden Authority & Staff Management (Minutes 5:30 – 8:00)

1. **Pass Approvals & Digital Gate Pass Issuance**:
   - Log in as `warden.dmi@gmail.com` (`Warden@123`).
   - Go to `/warden/approvals`. View the student request with the staff recommendation note attached.
   - Click **Approve**. Then navigate to `/warden/gate-passes` and click **Issue Digital Gate Pass**.
2. **Hostel Floor & Room Capacity Allocation**:
   - Go to `/warden/rooms`.
   - Filter by **Ground Floor (`GF`)**, **2nd Floor (`F2`)**, **3rd Floor (`F3`)**, **4th Floor (`F4`)**.
   - Showcase 30 rooms per floor, capacity 4, and dynamic occupancy progress bars.
3. **Staff Accounts & Security Governance**:
   - Go to `/warden/staff-accounts`.
   - Review the DataTable of all Faculty Advisors, HODs, Principal, and Correspondent.
   - Click **Create Staff Account**: fill out name, select department, assign academic years. Click Create.
   - Copy the one-time temporary password.
   - Showcase **Disable Account** (with reason modal) and **Audit Trail Drawer**.
4. **Gate QR Poster Generation**:
   - Go to `/warden/gate-qr`.
   - Display the high-resolution printable A4 Gate Poster with the cryptographic QR code, instructions, and daily fallback code. Click **Print Poster**.

---

## Act 4: Campus Leadership Oversight (Minutes 8:00 – 10:00)

1. **Campus-Wide Insights**:
   - Log in as `principal.dmi@gmail.com` (`Staff@123`).
   - Review `/principal/overview`: total hostellers, passes issued, residents currently out, and overdue alerts.
2. **Late Returns Audit & Repeat Offenders**:
   - Navigate to `/principal/late-returns`.
   - Show the **Repeat Offenders Tab** highlighting students with multiple late returns.
   - Demonstrate instant CSV/Excel export.
3. **Institutional Governance (Correspondent)**:
   - Log in as `correspondent.dmi@gmail.com` (`Staff@123`).
   - Confirm strict read-only governance oversight.
