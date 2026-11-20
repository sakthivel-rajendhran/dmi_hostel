/**
 * DMI College Hostel Management PWA - 15 Deterministic Notifications for CSE-3-001
 * Grouped across Today, Yesterday, and Older Dates.
 * Covers pass approvals, rejections, gate passes, return reminders, overdue alerts, and campus announcements.
 */

const now = new Date();
const todayIso = (hours, minutes) => {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const yesterdayIso = (hours, minutes) => {
  const d = new Date(now.getTime() - 86400000);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const daysAgoIso = (days, hours, minutes) => {
  const d = new Date(now.getTime() - days * 86400000);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const MOCK_NOTIFICATIONS = [
  // --- TODAY ---
  {
    id: "NOTIF-01",
    studentId: "CSE-3-001",
    title: "Digital Gate Pass Issued",
    message: "Gate QR token issued for pass PASS-2026-0004 to Anna Centenary Library. Show this QR at Security Gate 1.",
    type: "gate_pass_issued",
    category: "pass",
    priority: "high",
    date: todayIso(now.getHours() - 1, 15),
    read: false,
    passId: "DMI-PASS-2026-0004",
    author: "Hostel Gate Authority",
  },
  {
    id: "NOTIF-02",
    studentId: "CSE-3-001",
    title: "Curfew Return Reminder",
    message: "Reminder: Your local pass return curfew is approaching in 30 minutes. Expected return is 08:30 PM.",
    type: "return_reminder",
    category: "pass",
    priority: "urgent",
    date: todayIso(now.getHours() - 2, 0),
    read: false,
    passId: "DMI-PASS-2026-0004",
    author: "Automated Curfew System",
  },
  {
    id: "NOTIF-03",
    studentId: "CSE-3-001",
    title: "Outpass Request Approved",
    message: "Your emergency local pass PASS-2026-0003 for General Hospital Diagnostics has been approved by Chief Warden.",
    type: "pass_approved",
    category: "pass",
    priority: "normal",
    date: todayIso(now.getHours() - 4, 30),
    read: false,
    passId: "DMI-PASS-2026-0003",
    author: "Dr. John Xavier (Chief Warden)",
  },
  {
    id: "NOTIF-04",
    studentId: "CSE-3-001",
    title: "Special Dinner Feast Tonight",
    message: "Grand College Day banquet feast scheduled at the Central Dining Hall from 07:00 PM to 09:30 PM.",
    type: "announcement",
    category: "announcement",
    priority: "normal",
    date: todayIso(now.getHours() - 5, 0),
    read: true,
    author: "Mess Committee",
  },

  // --- YESTERDAY ---
  {
    id: "NOTIF-05",
    studentId: "CSE-3-001",
    title: "Campus Re-entry Verified",
    message: "In-campus check-in verified at Security Gate 1 for pass PASS-2026-0008 (State Bank of India). Pass closed.",
    type: "pass_returned",
    category: "pass",
    priority: "normal",
    date: yesterdayIso(18, 16),
    read: true,
    passId: "DMI-PASS-2026-0008",
    author: "Security Gate 1 Kiosk",
  },
  {
    id: "NOTIF-06",
    studentId: "CSE-3-001",
    title: "Campus Exit Scanned",
    message: "Exit scanned at Security Gate 1 for pass PASS-2026-0008. Safe travels!",
    type: "pass_out",
    category: "pass",
    priority: "normal",
    date: yesterdayIso(14, 12),
    read: true,
    passId: "DMI-PASS-2026-0008",
    author: "Security Gate 1 Kiosk",
  },
  {
    id: "NOTIF-07",
    studentId: "CSE-3-001",
    title: "Mandatory Study Hour Notice",
    message: "Hostel quiet hours are strictly enforced between 08:30 PM and 10:30 PM. All hostel corridors must remain quiet.",
    type: "announcement",
    category: "announcement",
    priority: "high",
    date: yesterdayIso(11, 0),
    read: true,
    author: "Chief Warden Office",
  },
  {
    id: "NOTIF-08",
    studentId: "CSE-3-001",
    title: "Pass Recommended by Advisor",
    message: "Prof. Rajesh Sharma has recommended your Home Pass application PASS-2026-0002 for family wedding visit.",
    type: "pass_recommended",
    category: "pass",
    priority: "normal",
    date: yesterdayIso(9, 30),
    read: true,
    passId: "DMI-PASS-2026-0002",
    author: "Prof. Rajesh Sharma (Faculty Advisor)",
  },

  // --- EARLIER THIS WEEK & OLDER ---
  {
    id: "NOTIF-09",
    studentId: "CSE-3-001",
    title: "Outpass Request Rejected",
    message: "Your Home Pass PASS-2026-0007 was rejected: Disciplinary curfew restriction due to upcoming model lab examination.",
    type: "pass_rejected",
    category: "pass",
    priority: "urgent",
    date: daysAgoIso(2, 17, 30),
    read: true,
    passId: "DMI-PASS-2026-0007",
    author: "Dr. John Xavier (Chief Warden)",
  },
  {
    id: "NOTIF-10",
    studentId: "CSE-3-001",
    title: "Overdue Curfew Alert",
    message: "Attention: Curfew deadline for PASS-2026-0006 elapsed. Report to 3rd Floor Warden immediately upon arrival.",
    type: "overdue_alert",
    category: "pass",
    priority: "urgent",
    date: daysAgoIso(3, 21, 30),
    read: true,
    passId: "DMI-PASS-2026-0006",
    author: "Automated Gate Curfew Alert",
  },
  {
    id: "NOTIF-11",
    studentId: "CSE-3-001",
    title: "3rd Floor Water Supply Maintenance",
    message: "Scheduled pipeline maintenance on 3rd Floor from 10:00 AM to 01:00 PM tomorrow. Please plan water usage accordingly.",
    type: "announcement",
    category: "announcement",
    priority: "normal",
    date: daysAgoIso(4, 16, 0),
    read: true,
    author: "Campus Maintenance Directorate",
  },
  {
    id: "NOTIF-12",
    studentId: "CSE-3-001",
    title: "Home Pass Check-in Completed",
    message: "Welcome back to campus! Diwali festival pass PASS-2026-0009 marked returned on schedule.",
    type: "pass_returned",
    category: "pass",
    priority: "normal",
    date: daysAgoIso(5, 19, 30),
    read: true,
    passId: "DMI-PASS-2026-0009",
    author: "Gate Security Kiosk",
  },
  {
    id: "NOTIF-13",
    studentId: "CSE-3-001",
    title: "Campus Wi-Fi Bandwidth Upgrade",
    message: "High-speed optical fiber connectivity extended to all hostel rooms on 3rd Floor. Enjoy seamless academic research access.",
    type: "announcement",
    category: "announcement",
    priority: "normal",
    date: daysAgoIso(7, 10, 0),
    read: true,
    author: "IT Infrastructure Services",
  },
  {
    id: "NOTIF-14",
    studentId: "CSE-3-001",
    title: "Annual Sports Meet Registration",
    message: "Inter-hostel sports tournament registrations are now open for Badminton, Volleyball and Cricket. Contact Sports Secretary.",
    type: "announcement",
    category: "announcement",
    priority: "normal",
    date: daysAgoIso(10, 14, 0),
    read: true,
    author: "Hostel Sports Committee",
  },
  {
    id: "NOTIF-15",
    studentId: "CSE-3-001",
    title: "Hostel Fee Payment Reminder",
    message: "Even-semester mess amenity fees due by the end of the month. Kindly submit receipts at the Warden Accounts desk.",
    type: "announcement",
    category: "announcement",
    priority: "normal",
    date: daysAgoIso(14, 9, 0),
    read: true,
    author: "Accounts Section",
  },
];

export default MOCK_NOTIFICATIONS;
