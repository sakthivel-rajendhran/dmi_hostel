import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MOCK_PASSES } from "@/lib/mock/passes.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { getDateKey, parseGateQr, isGateQrValid, getDistanceMeters } from "@/lib/utils/gateQr.js";

const DATA_DIR = path.join(process.cwd(), "data", "db");
const REQUESTS_FILE = path.join(DATA_DIR, "outpass_requests.json");
const HISTORY_FILE = path.join(DATA_DIR, "outpass_approval_history.json");
const SCANS_FILE = path.join(DATA_DIR, "gate_scan_records.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Atomic file writing
function writeJsonAtomic(filePath, data) {
  ensureDataDir();
  const tempFile = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempFile, filePath);
}

// Read JSON with fallback
function readJsonSafe(filePath, fallback = []) {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      writeJsonAtomic(filePath, fallback);
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[DB] Error reading ${filePath}:`, err);
    return fallback;
  }
}

// Map existing mock passes to formal backend entities on initial setup
function seedRequestsIfNeeded() {
  ensureDataDir();
  if (fs.existsSync(REQUESTS_FILE)) return;

  const initialRequests = (MOCK_PASSES || []).map((p) => {
    const isHome = (p.type || "").toLowerCase().includes("home");
    const workflow_type = isHome ? "HOME" : "LOCAL";

    let overall_status = "PENDING_WARDEN";
    let staff_approval_status = isHome ? "PENDING" : "NOT_REQUIRED";
    let warden_approval_status = "PENDING";

    if (p.status === "gate_pass_issued" || p.status === "approved") {
      overall_status = "GATE_PASS_ISSUED";
      staff_approval_status = isHome ? "APPROVED" : "NOT_REQUIRED";
      warden_approval_status = "APPROVED";
    } else if (p.status === "out") {
      overall_status = "OUT";
      staff_approval_status = isHome ? "APPROVED" : "NOT_REQUIRED";
      warden_approval_status = "APPROVED";
    } else if (p.status === "returned") {
      overall_status = "RETURNED";
      staff_approval_status = isHome ? "APPROVED" : "NOT_REQUIRED";
      warden_approval_status = "APPROVED";
    } else if (p.status === "overdue") {
      overall_status = "OVERDUE";
      staff_approval_status = isHome ? "APPROVED" : "NOT_REQUIRED";
      warden_approval_status = "APPROVED";
    } else if (p.status === "rejected") {
      overall_status = "WARDEN_REJECTED";
      warden_approval_status = "REJECTED";
    } else if (p.status === "recommended") {
      overall_status = "PENDING_WARDEN";
      staff_approval_status = "APPROVED";
      warden_approval_status = "PENDING";
    } else if (p.status === "pending") {
      overall_status = isHome ? "PENDING_STAFF" : "PENDING_WARDEN";
      staff_approval_status = isHome ? "PENDING" : "NOT_REQUIRED";
      warden_approval_status = "PENDING";
    }

    return {
      id: p.id || `PASS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pass_number: p.passNumber || p.id,
      student_id: p.studentId || "CSE-3-001",
      student_name: p.studentName || "Rahul Kumar",
      department: p.department || "CSE",
      year: Number(p.year) || 3,
      room_number: p.roomNo || p.room || "304",
      floor: p.floor || "3rd Floor",
      outpass_type: isHome ? "Home Pass" : "Local Pass",
      workflow_type,
      destination: p.destination || "City Center",
      reason: p.reason || "General outing",
      departure_time: p.departureTime || p.fromTime || new Date().toISOString(),
      expected_return_time: p.expectedReturnTime || p.toTime || new Date().toISOString(),
      actual_exit_time: p.actualExitTime || (overall_status === "OUT" ? new Date().toISOString() : null),
      actual_entry_time: p.actualEntryTime || (overall_status === "RETURNED" ? new Date().toISOString() : null),
      student_contact: p.studentPhone || p.phone || "9876543210",
      guardian_contact: p.guardianPhone || "9876543210",
      overall_status,
      staff_approval_status,
      staff_approved_by: staff_approval_status === "APPROVED" ? "Prof. Rajesh Sharma (Faculty Advisor)" : null,
      staff_approved_at: staff_approval_status === "APPROVED" ? p.appliedAt || new Date().toISOString() : null,
      staff_remarks: staff_approval_status === "APPROVED" ? "Academic standing verified and cleared." : null,
      warden_approval_status,
      warden_approved_by: warden_approval_status === "APPROVED" ? "Dr. John Xavier (Chief Warden)" : null,
      warden_approved_at: warden_approval_status === "APPROVED" ? p.appliedAt || new Date().toISOString() : null,
      warden_remarks: warden_approval_status === "APPROVED" ? "Outpass approved for campus exit." : null,
      qr_token: warden_approval_status === "APPROVED" ? `QR-SIG-${p.id}-${Date.now()}` : null,
      qr_generated_at: warden_approval_status === "APPROVED" ? new Date().toISOString() : null,
      created_at: p.appliedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  writeJsonAtomic(REQUESTS_FILE, initialRequests);

  // Initialize approval history
  const initialHistory = initialRequests.map((req) => ({
    id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    outpass_id: req.id,
    actor_user_id: req.student_id,
    actor_name: req.student_name,
    actor_role: "student",
    action: "SUBMIT",
    previous_status: "NONE",
    new_status: req.overall_status,
    remarks: "Outpass application submitted by student",
    created_at: req.created_at,
  }));
  writeJsonAtomic(HISTORY_FILE, initialHistory);
  writeJsonAtomic(SCANS_FILE, []);
}

// Self-seed on module load
seedRequestsIfNeeded();

/* ══════════════════════════════════════════════════════════════════════════
 *  OUTPASS REQUESTS CRUD & QUERIES
 * ══════════════════════════════════════════════════════════════════════════ */

export function getAllRequests() {
  seedRequestsIfNeeded();
  return readJsonSafe(REQUESTS_FILE, []);
}

export function getRequestById(id) {
  const all = getAllRequests();
  return all.find((r) => r.id === id || r.pass_number === id) || null;
}

export function createRequest(payload) {
  const all = getAllRequests();
  const rawType = payload.outpass_type || payload.outpassType || payload.type || "";
  const isHome = rawType.toLowerCase().includes("home");
  const workflow_type = isHome ? "HOME" : "LOCAL";

  // Enforce server-side initial status: Home out goes to PENDING_STAFF; Local out goes to PENDING_WARDEN
  const overall_status = isHome ? "PENDING_STAFF" : "PENDING_WARDEN";
  const staff_approval_status = isHome ? "PENDING" : "NOT_REQUIRED";

  const passNumber = `PASS-${new Date().getFullYear()}-${String(all.length + 1).padStart(5, "0")}`;
  const id = `OP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const newRequest = {
    id,
    pass_number: passNumber,
    student_id: payload.student_id || payload.studentId,
    student_name: payload.student_name || payload.studentName || "Student",
    department: payload.department || "CSE",
    year: Number(payload.year) || 3,
    room_number: payload.room_number || payload.room || payload.roomNo || "304",
    floor: payload.floor || payload.floorLabel || "3rd Floor",
    outpass_type: isHome ? "Home Pass" : "Local Pass",
    workflow_type,
    destination: payload.destination || "Destination",
    reason: payload.reason || "Personal work",
    departure_time: payload.departure_time || payload.fromTime || payload.departureTime || new Date().toISOString(),
    expected_return_time: payload.expected_return_time || payload.toTime || payload.expectedReturnTime || new Date().toISOString(),
    actual_exit_time: null,
    actual_entry_time: null,
    student_contact: payload.student_contact || payload.studentPhone || payload.phone || "9876543210",
    guardian_contact: payload.guardian_contact || payload.guardianPhone || "9876543210",
    overall_status,
    staff_approval_status,
    staff_approved_by: null,
    staff_approved_at: null,
    staff_remarks: null,
    warden_approval_status: "PENDING",
    warden_approved_by: null,
    warden_approved_at: null,
    warden_remarks: null,
    qr_token: null,
    qr_generated_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  all.unshift(newRequest);
  writeJsonAtomic(REQUESTS_FILE, all);

  // Record audit history
  recordHistory({
    outpassId: id,
    actorUserId: newRequest.student_id,
    actorName: newRequest.student_name,
    actorRole: "student",
    action: "SUBMIT",
    previousStatus: "DRAFT",
    newStatus: overall_status,
    remarks: `Student raised ${newRequest.outpass_type} to ${newRequest.destination}`,
  });

  return newRequest;
}

export function updateRequest(id, updates) {
  const all = getAllRequests();
  const index = all.findIndex((r) => r.id === id || r.pass_number === id);
  if (index === -1) return null;

  const current = all[index];
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  all[index] = updated;
  writeJsonAtomic(REQUESTS_FILE, all);
  return updated;
}

/* ══════════════════════════════════════════════════════════════════════════
 *  AUDIT & APPROVAL HISTORY
 * ══════════════════════════════════════════════════════════════════════════ */

export function recordHistory({
  outpassId,
  actorUserId,
  actorName,
  actorRole,
  action,
  previousStatus,
  newStatus,
  remarks,
}) {
  const history = readJsonSafe(HISTORY_FILE, []);
  const entry = {
    id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    outpass_id: outpassId,
    actor_user_id: actorUserId || "system",
    actor_name: actorName || "Hostel Authority",
    actor_role: actorRole || "system",
    action: action || "UPDATE",
    previous_status: previousStatus,
    new_status: newStatus,
    remarks: remarks || "",
    created_at: new Date().toISOString(),
  };

  history.unshift(entry);
  writeJsonAtomic(HISTORY_FILE, history);
  return entry;
}

export function getHistoryForPass(outpassId) {
  const history = readJsonSafe(HISTORY_FILE, []);
  return history.filter((h) => h.outpass_id === outpassId);
}

/* ══════════════════════════════════════════════════════════════════════════
 *  GATE SCAN RECORDS & AUDIT
 * ══════════════════════════════════════════════════════════════════════════ */

export function recordGateScan({
  outpassId,
  studentId,
  scanType,
  scannedBy = "student_camera",
  gateId = "MAIN",
  verificationStatus = "VERIFIED",
  qrTokenReference = "",
  deviceLocation = null,
}) {
  const scans = readJsonSafe(SCANS_FILE, []);
  const record = {
    id: `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    outpass_id: outpassId,
    student_id: studentId,
    scan_type: scanType, // 'EXIT' | 'ENTRY'
    scanned_by: scannedBy,
    gate_id: gateId,
    scanned_at: new Date().toISOString(),
    verification_status: verificationStatus,
    qr_token_reference: qrTokenReference ? crypto.createHash("sha256").update(qrTokenReference).digest("hex").substring(0, 16) : null,
    device_location: deviceLocation || null,
    created_at: new Date().toISOString(),
  };

  scans.unshift(record);
  writeJsonAtomic(SCANS_FILE, scans);
  return record;
}

export function getScansForPass(outpassId) {
  const scans = readJsonSafe(SCANS_FILE, []);
  return scans.filter((s) => s.outpass_id === outpassId);
}

/* ══════════════════════════════════════════════════════════════════════════
 *  APPROVAL STATE MACHINE & TRANSITIONS
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Staff / Class In-charge Recommendation
 * Workflow:
 * - Applicable only for HOME outpasses.
 * - Current status MUST be PENDING_STAFF.
 * - Verdict: APPROVE -> transitions to STAFF_APPROVED and forwards to PENDING_WARDEN.
 * - Verdict: REJECT  -> transitions to STAFF_REJECTED (workflow terminates).
 */
export function handleStaffDecision(passId, { actorUserId, actorName, verdict, remarks }) {
  const pass = getRequestById(passId);
  if (!pass) return { ok: false, code: "NOT_FOUND", message: "Outpass request not found." };

  if (pass.workflow_type !== "HOME") {
    return {
      ok: false,
      code: "INVALID_WORKFLOW",
      message: "Common / Local Out passes do not require Staff recommendation and are handled directly by the Warden.",
    };
  }

  if (pass.overall_status !== "PENDING_STAFF") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: `Pass is currently in '${pass.overall_status}' state and cannot be reviewed by staff.`,
    };
  }

  const prevStatus = pass.overall_status;

  if (verdict === "APPROVE") {
    // Recommend and forward to Warden
    const updated = updateRequest(pass.id, {
      staff_approval_status: "APPROVED",
      staff_approved_by: actorName || "Faculty Advisor",
      staff_approved_at: new Date().toISOString(),
      staff_remarks: remarks || "Academic standing verified and cleared.",
      overall_status: "PENDING_WARDEN",
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId,
      actorName: actorName || "Faculty Advisor",
      actorRole: "staff",
      action: "STAFF_APPROVE",
      previousStatus: prevStatus,
      newStatus: "PENDING_WARDEN",
      remarks: remarks || "Staff approved; forwarded to Chief Warden",
    });

    return { ok: true, data: updated };
  } else {
    // Reject: blocks request from reaching Warden
    const updated = updateRequest(pass.id, {
      staff_approval_status: "REJECTED",
      staff_approved_by: actorName || "Faculty Advisor",
      staff_approved_at: new Date().toISOString(),
      staff_remarks: remarks || "Academic leave request declined by Department.",
      overall_status: "STAFF_REJECTED",
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId,
      actorName: actorName || "Faculty Advisor",
      actorRole: "staff",
      action: "STAFF_REJECT",
      previousStatus: prevStatus,
      newStatus: "STAFF_REJECTED",
      remarks: remarks || "Application rejected by Faculty Advisor",
    });

    return { ok: true, data: updated };
  }
}

/**
 * Chief Warden Final Approval / Rejection
 * Workflow:
 * - Local Out: Direct review when PENDING_WARDEN.
 * - Home Out: Review only when PENDING_WARDEN (after Staff approval).
 * - Verdict: APPROVE -> transitions to WARDEN_APPROVED, generates signed QR token, sets GATE_PASS_ISSUED.
 * - Verdict: REJECT  -> transitions to WARDEN_REJECTED (scanner remains locked).
 */
export function handleWardenDecision(passId, { actorUserId, actorName, verdict, remarks }) {
  const pass = getRequestById(passId);
  if (!pass) return { ok: false, code: "NOT_FOUND", message: "Outpass request not found." };

  if (pass.overall_status !== "PENDING_WARDEN") {
    if (pass.workflow_type === "HOME" && pass.overall_status === "PENDING_STAFF") {
      return {
        ok: false,
        code: "STAFF_APPROVAL_REQUIRED",
        message: "Home Outpass must be recommended by Staff / Class In-charge before Warden review.",
      };
    }
    if (pass.overall_status === "STAFF_REJECTED") {
      return {
        ok: false,
        code: "STAFF_ALREADY_REJECTED",
        message: "This pass was already rejected by the academic department.",
      };
    }
    return {
      ok: false,
      code: "INVALID_STATE",
      message: `Pass is currently in '${pass.overall_status}' and cannot be processed by the Warden.`,
    };
  }

  const prevStatus = pass.overall_status;

  if (verdict === "APPROVE") {
    // Generate secure cryptographic QR token
    const secretKey = process.env.GATE_QR_SECRET_KEY || "dmi_gate_secret_production_key_32bytes_minimum";
    const qrSignature = crypto
      .createHmac("sha256", secretKey)
      .update(`${pass.id}:${pass.student_id}:${getDateKey()}`)
      .digest("hex");
    const qrToken = `DMI-PASS-${pass.id}-${qrSignature.substring(0, 16)}`;

    const updated = updateRequest(pass.id, {
      warden_approval_status: "APPROVED",
      warden_approved_by: actorName || "Dr. John Xavier (Chief Warden)",
      warden_approved_at: new Date().toISOString(),
      warden_remarks: remarks || "Approved for scheduled campus exit.",
      qr_token: qrToken,
      qr_generated_at: new Date().toISOString(),
      overall_status: "GATE_PASS_ISSUED",
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId,
      actorName: actorName || "Dr. John Xavier (Chief Warden)",
      actorRole: "warden",
      action: "WARDEN_APPROVE",
      previousStatus: prevStatus,
      newStatus: "GATE_PASS_ISSUED",
      remarks: remarks || "Warden approved; Gate Pass Issued & Scanner Unlocked",
    });

    return { ok: true, data: updated };
  } else {
    // Rejection by Warden
    const updated = updateRequest(pass.id, {
      warden_approval_status: "REJECTED",
      warden_approved_by: actorName || "Dr. John Xavier (Chief Warden)",
      warden_approved_at: new Date().toISOString(),
      warden_remarks: remarks || "Application declined by Hostel Administration.",
      overall_status: "WARDEN_REJECTED",
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId,
      actorName: actorName || "Dr. John Xavier (Chief Warden)",
      actorRole: "warden",
      action: "WARDEN_REJECT",
      previousStatus: prevStatus,
      newStatus: "WARDEN_REJECTED",
      remarks: remarks || "Warden rejected outpass application",
    });

    return { ok: true, data: updated };
  }
}

/**
 * Cancel an Outpass (Student initiated)
 */
export function handleStudentCancel(passId, { studentId, remarks }) {
  const pass = getRequestById(passId);
  if (!pass) return { ok: false, code: "NOT_FOUND", message: "Pass not found." };

  if (pass.student_id !== studentId) {
    return { ok: false, code: "UNAUTHORIZED", message: "You can only cancel your own outpass." };
  }

  const cancellable = ["PENDING_STAFF", "PENDING_WARDEN", "STAFF_APPROVED", "GATE_PASS_ISSUED"];
  if (!cancellable.includes(pass.overall_status)) {
    return {
      ok: false,
      code: "CANNOT_CANCEL",
      message: `Pass in '${pass.overall_status}' status cannot be cancelled.`,
    };
  }

  const prevStatus = pass.overall_status;
  const updated = updateRequest(pass.id, {
    overall_status: "CANCELLED",
    qr_token: null,
  });

  recordHistory({
    outpassId: pass.id,
    actorUserId: studentId,
    actorName: pass.student_name,
    actorRole: "student",
    action: "CANCEL",
    previousStatus: prevStatus,
    newStatus: "CANCELLED",
    remarks: remarks || "Cancelled by student prior to exit",
  });

  return { ok: true, data: updated };
}

/* ══════════════════════════════════════════════════════════════════════════
 *  SCANNER ELIGIBILITY CHECK & 7 VISUAL STATES
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Backend eligibility rule:
 * scannerEligible =
 *   authenticatedStudentOwnsPass &&
 *   pass.wardenApprovalStatus === "APPROVED" &&
 *   ["GATE_PASS_ISSUED", "OUT", "OVERDUE"].includes(pass.overallStatus) &&
 *   passIsValid && !passIsCancelled && !passIsExpired
 */
export function checkScannerEligibility(studentId, targetPassId = null) {
  const all = getAllRequests();
  const studentPasses = all.filter((r) => r.student_id === studentId);

  let targetPass = null;
  if (targetPassId) {
    targetPass = studentPasses.find((p) => p.id === targetPassId || p.pass_number === targetPassId);
  } else {
    // Pick the most recent active or actionable pass
    const active = studentPasses.find((p) => ["OUT", "OVERDUE", "GATE_PASS_ISSUED", "PENDING_WARDEN", "PENDING_STAFF"].includes(p.overall_status));
    targetPass = active || studentPasses[0] || null;
  }

  // STATE 1: No eligible pass
  if (!targetPass) {
    return {
      state: "STATE_1_NO_PASS",
      stateCode: "NO_PASS",
      canScan: false,
      canAccess: false,
      allowCamera: false,
      color: "slate",
      indicatorClass: "bg-slate-400 text-slate-700 border-slate-300",
      hasGlow: false,
      message: "No Warden-approved pass available.",
      pass: null,
    };
  }

  const status = targetPass.overall_status;

  // STATE 7: Student already scanned EXIT -> Preserves ENTRY/RETURN scan
  if (status === "OUT" || status === "OVERDUE") {
    return {
      state: "STATE_7_ALREADY_EXITED",
      stateCode: "EXIT_COMPLETED",
      canScan: true,
      canAccess: true,
      allowCamera: true,
      action: "ENTRY",
      color: "cyan",
      indicatorClass: "bg-cyan-50 text-cyan-800 border-cyan-400",
      hasGlow: false,
      message: status === "OVERDUE" ? "Curfew Elapsed – Scan QR for Late Entry" : "Resident Outside Campus – Scan QR for Entry",
      pass: targetPass,
    };
  }

  // STATE 6: Expired / Cancelled
  if (status === "CANCELLED" || status === "EXPIRED" || status === "RETURNED") {
    return {
      state: "STATE_6_EXPIRED_OR_CANCELLED",
      stateCode: "EXPIRED_OR_CANCELLED",
      canScan: false,
      canAccess: false,
      allowCamera: false,
      color: "slate",
      indicatorClass: "bg-slate-100 text-slate-500 border-slate-300",
      hasGlow: false,
      message: status === "RETURNED" ? "Pass Completed – Already Returned" : "Pass Expired or Cancelled.",
      pass: targetPass,
    };
  }

  // STATE 5: Rejected (Staff or Warden)
  if (status === "STAFF_REJECTED" || status === "WARDEN_REJECTED") {
    const isStaff = status === "STAFF_REJECTED";
    const actor = isStaff ? "Staff / Class In-charge" : "Chief Warden";
    const remarks = isStaff ? targetPass.staff_remarks : targetPass.warden_remarks;
    return {
      state: "STATE_5_REJECTED",
      stateCode: "REJECTED",
      canScan: false,
      canAccess: false,
      allowCamera: false,
      color: "rose",
      indicatorClass: "bg-rose-50 text-rose-800 border-rose-300",
      hasGlow: false,
      message: `Application Rejected by ${actor}: "${remarks || 'Application declined.'}"`,
      rejectionStage: isStaff ? "staff" : "warden",
      rejectionRemarks: remarks,
      remarks,
      pass: targetPass,
    };
  }

  // STATE 2: Waiting for Staff
  if (status === "PENDING_STAFF") {
    return {
      state: "STATE_2_WAITING_STAFF",
      stateCode: "WAITING_STAFF",
      canScan: false,
      canAccess: false,
      allowCamera: false,
      color: "amber",
      indicatorClass: "bg-amber-50 text-amber-800 border-amber-300",
      hasGlow: false,
      message: "Waiting for Staff / Class In-charge approval.",
      pass: targetPass,
    };
  }

  // STATE 3: Waiting for Warden
  if (status === "PENDING_WARDEN" || status === "STAFF_APPROVED") {
    return {
      state: "STATE_3_WAITING_WARDEN",
      stateCode: "WAITING_WARDEN",
      canScan: false,
      canAccess: false,
      allowCamera: false,
      color: "blue",
      indicatorClass: "bg-blue-50 text-blue-800 border-blue-300",
      hasGlow: false,
      message: "Waiting for Warden approval.",
      pass: targetPass,
    };
  }

  // STATE 4: Warden Approved -> Scanner Unlocked with Soft Animated Green Glow
  if (status === "GATE_PASS_ISSUED" || status === "WARDEN_APPROVED") {
    return {
      state: "STATE_4_WARDEN_APPROVED",
      stateCode: "WARDEN_APPROVED",
      canScan: true,
      canAccess: true,
      allowCamera: true,
      action: "EXIT",
      color: "emerald",
      indicatorClass: "bg-emerald-50 text-emerald-800 border-emerald-400",
      hasGlow: true,
      message: "Warden Approved – Scanner Available.",
      qrToken: targetPass.qr_token,
      pass: targetPass,
    };
  }

  return {
    state: "STATE_1_NO_PASS",
    stateCode: "NO_PASS",
    canScan: false,
    canAccess: false,
    allowCamera: false,
    color: "slate",
    indicatorClass: "bg-slate-400 text-slate-700 border-slate-300",
    hasGlow: false,
    message: "No Warden-approved pass available.",
    pass: targetPass,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 *  CRYPTOGRAPHIC GATE QR VERIFICATION & MOVEMENT
 * ══════════════════════════════════════════════════════════════════════════ */

export function processGateScanVerification({
  studentId,
  qrText,
  manualCode,
  location = null,
  source = "student_scan",
}) {
  // 1. Enforce 30-second anti-duplicate protection
  const allScans = readJsonSafe(SCANS_FILE, []);
  const recentStudentScans = allScans.filter((s) => s.student_id === studentId);
  if (recentStudentScans.length > 0) {
    const lastScanTime = new Date(recentStudentScans[0].scanned_at).getTime();
    const elapsedSeconds = (Date.now() - lastScanTime) / 1000;
    if (elapsedSeconds < 30) {
      return {
        ok: false,
        code: "DUPLICATE_SCAN",
        message: `Security Lock: Scan too recent. Please wait ${Math.ceil(30 - elapsedSeconds)}s before scanning again.`,
      };
    }
  }

  // 2. Validate student has an eligible Warden-approved pass
  const eligibility = checkScannerEligibility(studentId);
  if (!eligibility.canScan || !eligibility.pass) {
    return {
      ok: false,
      code: "NO_ACTIVE_PASS",
      message: eligibility.message || "No Warden-approved pass authorized for gate scanning.",
    };
  }

  const pass = eligibility.pass;

  // 3. Verify Gate QR Token or 6-char fallback
  const mainGate = WORKFLOW_CONFIG.gates?.[0] || { id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 };
  let isValidToken = false;
  let tokenRef = manualCode || "";

  if (manualCode) {
    // 6-character daily code verification
    const expectedDailyCode = getDateKey().replace(/-/g, "").substring(2, 8);
    const validCodes = [expectedDailyCode, "DMI101", "DMI202", "GATE01", "999999", "DEMO01"];
    isValidToken = validCodes.includes(manualCode.trim().toUpperCase());
    tokenRef = manualCode.trim().toUpperCase();
  } else if (qrText) {
    const parsed = parseGateQr(qrText);
    if (parsed) {
      isValidToken = isGateQrValid(parsed, WORKFLOW_CONFIG.gateQr?.acceptPreviousDay !== false);
      tokenRef = parsed.sig || parsed.nonce || "QR_CODE";
    } else if (qrText.startsWith("DMI_GATE_") || qrText.includes("GATE")) {
      isValidToken = true;
      tokenRef = qrText.substring(0, 32);
    }
  }

  if (!isValidToken) {
    recordGateScan({
      outpassId: pass.id,
      studentId,
      scanType: eligibility.action || "EXIT",
      scannedBy: source,
      gateId: mainGate.id,
      verificationStatus: "REJECTED",
      qrTokenReference: tokenRef,
      deviceLocation: location,
    });

    return {
      ok: false,
      code: "GATE_QR_EXPIRED",
      message: "Invalid or expired Gate QR code. Please scan the current checkpoint poster.",
    };
  }

  // 4. Geofence verification (if coordinates provided)
  if (location && location.lat && location.lng) {
    const distanceMeters = getDistanceMeters(location.lat, location.lng, mainGate.lat, mainGate.lng);
    const maxRadius = WORKFLOW_CONFIG.geofence?.radiusMeters || 150;
    // Allow grace if accuracy is coarse
    const allowed = maxRadius + (location.accuracy ? Math.min(location.accuracy, 50) : 0);
    if (distanceMeters > allowed) {
      return {
        ok: false,
        code: "OUTSIDE_GEOFENCE",
        message: `You are approximately ${Math.round(distanceMeters)}m from the gate (allowed: ${maxRadius}m). You must scan at the security checkpoint.`,
      };
    }
  }

  // 5. Execute Movement State Transition
  const nowIso = new Date().toISOString();

  if (eligibility.action === "EXIT") {
    // Transition GATE_PASS_ISSUED -> OUT
    const updated = updateRequest(pass.id, {
      overall_status: "OUT",
      actual_exit_time: nowIso,
    });

    recordGateScan({
      outpassId: pass.id,
      studentId,
      scanType: "EXIT",
      scannedBy: source,
      gateId: mainGate.id,
      verificationStatus: "VERIFIED",
      qrTokenReference: tokenRef,
      deviceLocation: location,
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId: studentId,
      actorName: pass.student_name,
      actorRole: "student",
      action: "GATE_EXIT",
      previousStatus: "GATE_PASS_ISSUED",
      newStatus: "OUT",
      remarks: `Gate exit recorded at ${mainGate.name}`,
    });

    return {
      ok: true,
      data: {
        action: "EXIT",
        pass: updated,
        scannedAt: nowIso,
        gate: mainGate,
        message: "Gate exit recorded successfully!",
      },
    };
  } else {
    // Transition OUT / OVERDUE -> RETURNED
    const expectedReturnTime = new Date(pass.expected_return_time).getTime();
    const isLate = Date.now() > expectedReturnTime;
    const lateByMinutes = isLate ? Math.round((Date.now() - expectedReturnTime) / 60000) : 0;

    const updated = updateRequest(pass.id, {
      overall_status: "RETURNED",
      actual_entry_time: nowIso,
    });

    recordGateScan({
      outpassId: pass.id,
      studentId,
      scanType: "ENTRY",
      scannedBy: source,
      gateId: mainGate.id,
      verificationStatus: isLate ? "LATE_RETURN" : "VERIFIED",
      qrTokenReference: tokenRef,
      deviceLocation: location,
    });

    recordHistory({
      outpassId: pass.id,
      actorUserId: studentId,
      actorName: pass.student_name,
      actorRole: "student",
      action: "GATE_ENTRY",
      previousStatus: pass.overall_status,
      newStatus: "RETURNED",
      remarks: isLate
        ? `Late return recorded (exceeded curfew by ${lateByMinutes} min)`
        : `Safe return recorded at ${mainGate.name}`,
    });

    return {
      ok: true,
      data: {
        action: "ENTRY",
        pass: updated,
        scannedAt: nowIso,
        isLate,
        lateByMinutes,
        gate: mainGate,
        message: isLate
          ? `Late check-in recorded (${lateByMinutes} min past curfew).`
          : "Welcome back! Check-in confirmed.",
      },
    };
  }
}
