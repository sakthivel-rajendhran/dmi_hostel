/**
 * DMI College Hostel Management PWA - 100 Deterministic Security Log Entries
 * Gate entry and exit verification logs with manual overrides and audit trails.
 */

import { MOCK_STUDENTS } from "./students.js";

const GATES = ["Main Campus Gate", "North Hostel Gate", "Admin Checkpoint"];

export const MOCK_SECURITY_LOGS = Array.from({ length: 100 }, (_, idx) => {
  const student = MOCK_STUDENTS[idx % MOCK_STUDENTS.length];
  const type = idx % 2 === 0 ? "EXIT" : "ENTRY";
  const passType = idx % 3 === 0 ? "Home Pass" : "Local Pass";
  const gate = GATES[idx % GATES.length];
  const logId = `LOG-2026-${String(idx + 1).padStart(4, "0")}`;
  const passId = `DMI-PASS-2026-${String((idx % 60) + 1).padStart(4, "0")}`;

  // Spread over past 14 days
  const timeOffsetHours = idx * 2.5;
  const timestamp = new Date(Date.now() - timeOffsetHours * 3600000).toISOString();
  const isLate = type === "ENTRY" && idx % 7 === 0;
  const lateMinutes = isLate ? 20 + (idx % 85) : 0;

  // Manual overrides highlighted with reasons (auditable by Principal/Correspondent)
  const isManualOverride = idx % 11 === 0;
  const source = isManualOverride ? "manual_override" : "student_scan";
  const overrideReason = isManualOverride
    ? idx % 2 === 0
      ? "Phone camera glare prevented QR scan; verified student ID card & warden outpass record"
      : "Student device battery depleted; verified identity with facial photo on warden roster"
    : null;

  return {
    id: logId,
    passId,
    passType,
    studentId: student.studentId,
    studentName: student.name,
    studentAvatar: student.avatar,
    department: student.department,
    year: student.year,
    room: student.room,
    roomNo: student.roomNo,
    floor: student.floor,
    floorLabel: student.floorLabel,
    type,
    movementType: type,
    gate,
    verifiedBy: isManualOverride
      ? "Warden S. Ravichandran (Manual Override)"
      : "Security Officer K. Perumal (Badge #402)",
    kioskId: "KIOSK-MAIN-01",
    status: isLate ? "Late Entry Curfew Alert" : isManualOverride ? "Manual Override Verified" : "Verified Clear",
    isLate,
    lateMinutes,
    source,
    isManualOverride,
    overrideReason,
    insideGateArea: idx % 13 !== 0,
    timestamp,
    note: isLate
      ? `Reported ${lateMinutes} minutes past permitted curfew`
      : isManualOverride
      ? overrideReason
      : "Verified via digital gate QR scan",
  };
});

export default MOCK_SECURITY_LOGS;
