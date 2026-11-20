/**
 * DMI College Hostel Management PWA - Deterministic Mock Outpasses
 * Covers all 9 pass statuses, Local Pass & Home Pass, and full status timeline histories.
 * First 12 passes are specifically configured for logged-in student Rahul Kumar (CSE-3-001).
 */

import { PASS_STATUSES } from "@/config/status.js";
import { MOCK_STUDENTS } from "./students.js";

const now = new Date();
const todayIso = (hours, minutes) => {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const daysAgoIso = (days, hours, minutes) => {
  const d = new Date(now.getTime() - days * 86400000);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const hoursAgoIso = (hours, minutes = 0) => {
  const d = new Date(now.getTime() - (hours * 3600000 + minutes * 60000));
  return d.toISOString();
};

const hoursAheadIso = (hours, minutes = 0) => {
  const d = new Date(now.getTime() + (hours * 3600000 + minutes * 60000));
  return d.toISOString();
};

// 12 Deterministic Passes for Rahul Kumar (CSE-3-001)
const RAHUL_PASSES = [
  // 1. Pending Local Pass (applied just now)
  {
    id: "DMI-PASS-2026-0001",
    passNumber: "PASS-2026-0001",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "Town Market & Stationery Store",
    reason: "Purchasing semester textbooks, engineering graph sheets and lab notebooks.",
    fromTime: hoursAheadIso(2),
    toTime: hoursAheadIso(5),
    departureTime: hoursAheadIso(2),
    expectedReturnTime: hoursAheadIso(5),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.PENDING,
    appliedAt: hoursAgoIso(1),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(1),
        actor: "Rahul Kumar (Resident)",
        note: "Submitted outpass request via student portal",
      },
    ],
  },

  // 2. Recommended Home Pass (weekend visit)
  {
    id: "DMI-PASS-2026-0002",
    passNumber: "PASS-2026-0002",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Home Pass",
    destination: "Madurai Hometown",
    reason: "Attending younger sister's school graduation ceremony and family gathering.",
    fromTime: hoursAheadIso(24),
    toTime: hoursAheadIso(72),
    departureTime: hoursAheadIso(24),
    expectedReturnTime: hoursAheadIso(72),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.RECOMMENDED,
    appliedAt: hoursAgoIso(6),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(6),
        actor: "Rahul Kumar (Resident)",
        note: "Submitted Home Outpass request via student portal",
      },
      {
        status: "recommended",
        label: "Recommended by Faculty Advisor",
        timestamp: hoursAgoIso(4),
        actor: "Prof. Rajesh Sharma (Faculty Advisor)",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
      },
    ],
  },

  // 3. Approved Local Pass (ready for gate pass issuance)
  {
    id: "DMI-PASS-2026-0003",
    passNumber: "PASS-2026-0003",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "General Hospital Diagnostics",
    reason: "Physician consultation and scheduled blood test checkup.",
    fromTime: hoursAheadIso(3),
    toTime: hoursAheadIso(6),
    departureTime: hoursAheadIso(3),
    expectedReturnTime: hoursAheadIso(6),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.APPROVED,
    appliedAt: hoursAgoIso(8),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: true,
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(8),
        actor: "Rahul Kumar (Resident)",
        note: "Emergency medical visit outpass request",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: hoursAgoIso(5),
        actor: "Dr. John Xavier (Chief Warden)",
        note: "Approved for medical consultation. Return on or before curfew.",
      },
    ],
  },

  // 4. Gate Pass Issued (QR Token Active, valid right now!)
  {
    id: "DMI-PASS-2026-0004",
    passNumber: "PASS-2026-0004",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "Anna Centenary Library & Book Fair",
    reason: "Reference material research for final year capstone project.",
    fromTime: hoursAgoIso(1),
    toTime: hoursAheadIso(3),
    departureTime: hoursAgoIso(1),
    expectedReturnTime: hoursAheadIso(3),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.GATE_PASS_ISSUED,
    appliedAt: hoursAgoIso(12),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(12),
        actor: "Rahul Kumar (Resident)",
        note: "Submitted outpass request for library access",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: hoursAgoIso(8),
        actor: "Dr. John Xavier (Chief Warden)",
        note: "Approved for library visit",
      },
      {
        status: "gate_pass_issued",
        label: "Digital QR Gate Pass Issued",
        timestamp: hoursAgoIso(2),
        actor: "Hostel Gate Pass Authority",
        note: "Gate QR token generated and authorized for scanner",
      },
    ],
  },

  // 5. Out - Student currently outside campus
  {
    id: "DMI-PASS-2026-0005",
    passNumber: "PASS-2026-0005",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "Apollo Pharmacy & Clinic",
    reason: "Prescription medicine purchase and dental clinic consultation.",
    fromTime: hoursAgoIso(2),
    toTime: hoursAheadIso(2),
    departureTime: hoursAgoIso(2),
    expectedReturnTime: hoursAheadIso(2),
    actualExitTime: hoursAgoIso(1, 45),
    actualReturnTime: null,
    status: PASS_STATUSES.OUT,
    appliedAt: hoursAgoIso(16),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(16),
        actor: "Rahul Kumar (Resident)",
        note: "Pharmacy visit outpass",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: hoursAgoIso(10),
        actor: "Dr. John Xavier (Chief Warden)",
        note: "Approved",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: hoursAgoIso(3),
        actor: "Gate System",
        note: "QR code generated",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: hoursAgoIso(1, 45),
        actor: "Officer Sundaram (Security Gate 1)",
        note: "Scanned out via Gate Kiosk Scanner",
      },
    ],
  },

  // 6. Returned Local Pass (Hardware lab components - returned safely before curfew)
  {
    id: "DMI-PASS-2026-0006",
    passNumber: "PASS-2026-0006",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "T. Nagar Electronic Hub",
    reason: "Hardware lab component replacement and soldering kit pickup.",
    fromTime: hoursAgoIso(5),
    toTime: hoursAgoIso(1, 15),
    departureTime: hoursAgoIso(5),
    expectedReturnTime: hoursAgoIso(1, 15),
    actualExitTime: hoursAgoIso(4, 50),
    actualReturnTime: hoursAgoIso(1, 25),
    status: PASS_STATUSES.RETURNED,
    appliedAt: hoursAgoIso(24),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: hoursAgoIso(24),
        actor: "Rahul Kumar (Resident)",
        note: "Hardware component procurement request",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: hoursAgoIso(18),
        actor: "Dr. John Xavier (Chief Warden)",
        note: "Approved for hardware store visit",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: hoursAgoIso(5, 30),
        actor: "Gate System",
        note: "Gate pass QR generated",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: hoursAgoIso(4, 50),
        actor: "Security Gate 1",
        note: "Scanned out at Gate 1",
      },
      {
        status: "returned",
        label: "Main Gate Check-in Verified",
        timestamp: hoursAgoIso(1, 25),
        actor: "Security Gate 1",
        note: "Scanned in at Gate 1 before curfew",
      },
    ],
  },

  // 7. Rejected Home Pass (with warden's explicit reason)
  {
    id: "DMI-PASS-2026-0007",
    passNumber: "PASS-2026-0007",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Home Pass",
    destination: "Coimbatore",
    reason: "Attending friend's private weekend trekking trip.",
    fromTime: daysAgoIso(2, 9, 0),
    toTime: daysAgoIso(0, 18, 0),
    departureTime: daysAgoIso(2, 9, 0),
    expectedReturnTime: daysAgoIso(0, 18, 0),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.REJECTED,
    appliedAt: daysAgoIso(3, 11, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: false,
    emergency: false,
    wardenReason: "Disciplinary curfew restriction due to scheduled model lab examination on Monday. Non-emergency recreational travel is not permitted during assessment periods.",
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(3, 11, 0),
        actor: "Rahul Kumar (Resident)",
        note: "Weekend trip outpass application",
      },
      {
        status: "rejected",
        label: "Rejected by Chief Warden",
        timestamp: daysAgoIso(2, 17, 30),
        actor: "Dr. John Xavier (Chief Warden)",
        note: "Disciplinary curfew restriction due to scheduled model lab examination on Monday. Non-emergency recreational travel is not permitted during assessment periods.",
      },
    ],
  },

  // 8. Returned Local Pass (yesterday)
  {
    id: "DMI-PASS-2026-0008",
    passNumber: "PASS-2026-0008",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "State Bank of India Branch",
    reason: "Education loan account paperwork and scholarship check deposit.",
    fromTime: daysAgoIso(1, 14, 0),
    toTime: daysAgoIso(1, 18, 30),
    departureTime: daysAgoIso(1, 14, 0),
    expectedReturnTime: daysAgoIso(1, 18, 30),
    actualExitTime: daysAgoIso(1, 14, 10),
    actualReturnTime: daysAgoIso(1, 18, 15),
    status: PASS_STATUSES.RETURNED,
    appliedAt: daysAgoIso(2, 16, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(2, 16, 0),
        actor: "Rahul Kumar",
        note: "Bank documentation outpass request",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: daysAgoIso(2, 19, 0),
        actor: "Dr. John Xavier",
        note: "Approved",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: daysAgoIso(1, 13, 30),
        actor: "Gate System",
        note: "QR Issued",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: daysAgoIso(1, 14, 10),
        actor: "Security Gate 1",
        note: "Exit scan verified",
      },
      {
        status: "returned",
        label: "Returned to Campus",
        timestamp: daysAgoIso(1, 18, 15),
        actor: "Security Gate 1",
        note: "Returned 15 minutes before deadline",
      },
    ],
  },

  // 9. Returned Home Pass (earlier this month)
  {
    id: "DMI-PASS-2026-0009",
    passNumber: "PASS-2026-0009",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Home Pass",
    destination: "Trichy Family Home",
    reason: "Diwali holiday festival celebration with family and grandparents.",
    fromTime: daysAgoIso(8, 10, 0),
    toTime: daysAgoIso(5, 20, 0),
    departureTime: daysAgoIso(8, 10, 0),
    expectedReturnTime: daysAgoIso(5, 20, 0),
    actualExitTime: daysAgoIso(8, 10, 15),
    actualReturnTime: daysAgoIso(5, 19, 30),
    status: PASS_STATUSES.RETURNED,
    appliedAt: daysAgoIso(10, 9, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(10, 9, 0),
        actor: "Rahul Kumar",
        note: "Diwali vacation leave pass",
      },
      {
        status: "recommended",
        label: "Recommended by Advisor",
        timestamp: daysAgoIso(9, 11, 0),
        actor: "Prof. Rajesh Sharma",
        note: "Recommended for festival holidays",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: daysAgoIso(9, 16, 0),
        actor: "Dr. John Xavier",
        note: "Approved",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: daysAgoIso(8, 9, 30),
        actor: "Gate System",
        note: "QR Issued",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: daysAgoIso(8, 10, 15),
        actor: "Security Gate 1",
        note: "Exit confirmed",
      },
      {
        status: "returned",
        label: "Returned to Campus",
        timestamp: daysAgoIso(5, 19, 30),
        actor: "Security Gate 1",
        note: "In-campus check-in verified",
      },
    ],
  },

  // 10. Returned Local Pass (last week)
  {
    id: "DMI-PASS-2026-0010",
    passNumber: "PASS-2026-0010",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "IIT Madras Research Park",
    reason: "Attending technical workshop on Large Language Models & Autonomous Agents.",
    fromTime: daysAgoIso(12, 8, 30),
    toTime: daysAgoIso(12, 19, 0),
    departureTime: daysAgoIso(12, 8, 30),
    expectedReturnTime: daysAgoIso(12, 19, 0),
    actualExitTime: daysAgoIso(12, 8, 40),
    actualReturnTime: daysAgoIso(12, 18, 50),
    status: PASS_STATUSES.RETURNED,
    appliedAt: daysAgoIso(14, 10, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(14, 10, 0),
        actor: "Rahul Kumar",
        note: "Workshop attendance pass",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: daysAgoIso(13, 14, 0),
        actor: "Dr. John Xavier",
        note: "Academic workshop approved",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: daysAgoIso(12, 8, 0),
        actor: "Gate System",
        note: "QR Issued",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: daysAgoIso(12, 8, 40),
        actor: "Security Gate 1",
        note: "Exit scan verified",
      },
      {
        status: "returned",
        label: "Returned to Campus",
        timestamp: daysAgoIso(12, 18, 50),
        actor: "Security Gate 1",
        note: "Checked in on schedule",
      },
    ],
  },

  // 11. Returned Local Pass (two weeks ago)
  {
    id: "DMI-PASS-2026-0011",
    passNumber: "PASS-2026-0011",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "Express Avenue Mall",
    reason: "Hostel amenities shopping and haircut appointment.",
    fromTime: daysAgoIso(18, 15, 0),
    toTime: daysAgoIso(18, 20, 30),
    departureTime: daysAgoIso(18, 15, 0),
    expectedReturnTime: daysAgoIso(18, 20, 30),
    actualExitTime: daysAgoIso(18, 15, 10),
    actualReturnTime: daysAgoIso(18, 20, 10),
    status: PASS_STATUSES.RETURNED,
    appliedAt: daysAgoIso(19, 12, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(19, 12, 0),
        actor: "Rahul Kumar",
        note: "Personal shopping outpass",
      },
      {
        status: "approved",
        label: "Approved by Chief Warden",
        timestamp: daysAgoIso(19, 16, 0),
        actor: "Dr. John Xavier",
        note: "Approved",
      },
      {
        status: "gate_pass_issued",
        label: "Gate Pass Issued",
        timestamp: daysAgoIso(18, 14, 30),
        actor: "Gate System",
        note: "QR Issued",
      },
      {
        status: "out",
        label: "Main Gate Exit Verified",
        timestamp: daysAgoIso(18, 15, 10),
        actor: "Security Gate 1",
        note: "Exit scan verified",
      },
      {
        status: "returned",
        label: "Returned to Campus",
        timestamp: daysAgoIso(18, 20, 10),
        actor: "Security Gate 1",
        note: "Returned safely",
      },
    ],
  },

  // 12. Cancelled Local Pass (cancelled by student)
  {
    id: "DMI-PASS-2026-0012",
    passNumber: "PASS-2026-0012",
    studentId: "CSE-3-001",
    studentName: "Rahul Kumar",
    studentAvatar: "RK",
    department: "CSE",
    year: 3,
    room: "304", roomNo: "304",
    floor: "F3",
    floorLabel: "3rd Floor",
    type: "Local Pass",
    destination: "Marina Beach Walkway",
    reason: "Evening recreational outing with classmates.",
    fromTime: daysAgoIso(6, 17, 0),
    toTime: daysAgoIso(6, 20, 30),
    departureTime: daysAgoIso(6, 17, 0),
    expectedReturnTime: daysAgoIso(6, 20, 30),
    actualExitTime: null,
    actualReturnTime: null,
    status: PASS_STATUSES.CANCELLED,
    appliedAt: daysAgoIso(7, 10, 0),
    guardianPhone: "+91 98765 43210",
    guardianConsent: true,
    emergency: false,
    recommendations: [
      {
        byId: "STAFF-001",
        name: "Prof. Rajesh Sharma",
        role: "staff",
        verdict: "recommend",
        note: "Attendance above 85% verified. Family permission confirmed with father over call.",
        at: hoursAgoIso(4),
      },
    ],
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: daysAgoIso(7, 10, 0),
        actor: "Rahul Kumar",
        note: "Evening outing request",
      },
      {
        status: "cancelled",
        label: "Cancelled by Student",
        timestamp: daysAgoIso(6, 15, 30),
        actor: "Rahul Kumar",
        note: "Cancelled due to sudden project team meeting call",
      },
    ],
  },
];

// Additional passes for other students (total 60) so other portals continue functioning
const OTHER_STATUSES = [
  PASS_STATUSES.PENDING,
  PASS_STATUSES.RECOMMENDED,
  PASS_STATUSES.APPROVED,
  PASS_STATUSES.REJECTED,
  PASS_STATUSES.GATE_PASS_ISSUED,
  PASS_STATUSES.OUT,
  PASS_STATUSES.RETURNED,
  PASS_STATUSES.OVERDUE,
  PASS_STATUSES.CANCELLED,
];

const OTHER_PASSES = Array.from({ length: 120 }, (_, idx) => {
  const passIdx = idx + 13;
  const student = MOCK_STUDENTS[passIdx % MOCK_STUDENTS.length];
  const status = OTHER_STATUSES[idx % OTHER_STATUSES.length];
  const type = idx % 3 === 0 ? "Home Pass" : "Local Pass";
  const passId = `DMI-PASS-2026-${String(passIdx).padStart(4, "0")}`;
  const passNumber = `PASS-2026-${String(passIdx).padStart(4, "0")}`;

  // Distribute over 180 days (6 months) for meaningful semester and monthly analytics
  const daysAgo = (idx * 1.5) % 180;
  const departureDate = new Date(now.getTime() - daysAgo * 86400000);
  departureDate.setHours(10 + (idx % 8), 15 + (idx % 45), 0, 0);

  const durationHours = type === "Home Pass" ? 72 : 5;
  const returnDate = new Date(departureDate.getTime() + durationHours * 3600000);
  returnDate.setHours(19 + (idx % 3), 30, 0, 0);

  const appliedDate = new Date(departureDate.getTime() - 24 * 3600000);

  // Late return distribution: ~15% of returned passes are late, plus deterministic repeat offenders
  const isRepeatStudent = [student.studentId === "ECE-2-005", student.studentId === "IT-2-004", student.studentId === "MECH-3-001"].some(Boolean);
  const isLate = (status === PASS_STATUSES.RETURNED && (idx % 5 === 0 || isRepeatStudent)) || status === PASS_STATUSES.OVERDUE;
  const lateMinutes = isLate ? 25 + (idx % 95) : 0;

  const actualExit = [PASS_STATUSES.OUT, PASS_STATUSES.RETURNED, PASS_STATUSES.OVERDUE].includes(status)
    ? departureDate.toISOString()
    : null;

  let actualReturn = null;
  if (status === PASS_STATUSES.RETURNED) {
    actualReturn = isLate
      ? new Date(returnDate.getTime() + lateMinutes * 60000).toISOString()
      : returnDate.toISOString();
  }

  const passObj = {
    id: passId,
    passNumber,
    studentId: student.studentId,
    studentName: student.name,
    studentAvatar: student.avatar,
    department: student.department,
    year: student.year,
    room: student.room,
    floor: student.floor,
    floorLabel: student.floorLabel,
    roomNo: student.roomNo,
    type,
    destination: type === "Home Pass" ? `${student.name.split(" ")[0]}'s Hometown` : "Town Central Market",
    reason: type === "Home Pass" ? "Family function and seasonal vacation" : "Purchasing academic books and groceries",
    fromTime: departureDate.toISOString(),
    toTime: returnDate.toISOString(),
    departureTime: departureDate.toISOString(),
    expectedReturnTime: returnDate.toISOString(),
    actualExitTime: actualExit,
    actualReturnTime: actualReturn,
    isLate: Boolean(isLate),
    lateMinutes: isLate ? lateMinutes : 0,
    status,
    appliedAt: appliedDate.toISOString(),
    guardianPhone: student.guardianPhone || "+91 98765 43210",
    guardianConsent: true,
    emergency: idx % 11 === 0,
    letterId: idx % 9 === 0 ? "LTR-2026-0001" : idx % 13 === 0 ? "LTR-2026-0002" : null,
    recommendations:
      status === PASS_STATUSES.RECOMMENDED
        ? [
            {
              byId: "STAFF-001",
              name: "Prof. Rajesh Sharma",
              role: "staff",
              verdict: "recommend",
              note: "Academic standing verified and cleared.",
              at: appliedDate.toISOString(),
            },
          ]
        : idx === 15
        ? [
            {
              byId: "STAFF-002",
              name: "Prof. Anand Kumar",
              role: "staff",
              verdict: "do_not_recommend",
              note: "Internal lab exam scheduled; attendance required.",
              at: appliedDate.toISOString(),
            },
          ]
        : [],
    wardenReason: status === PASS_STATUSES.REJECTED ? "Curfew period restrictions during semester exams" : undefined,
    timeline: [
      {
        status: "applied",
        label: "Pass Applied",
        timestamp: appliedDate.toISOString(),
        actor: student.name,
        note: "Submitted outpass request via student portal",
      },
    ],
  };

  return passObj;
});

export const MOCK_PASSES = [...RAHUL_PASSES, ...OTHER_PASSES];
export default MOCK_PASSES;
