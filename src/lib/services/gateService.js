/**
 * DMI College Hostel Management PWA - Gate Checkpoint Service
 * Manages Gate QR generation, rotation, camera scan verification,
 * geofence enforcement, and physical movement logging.
 *
 * Architecture:
 * - Fixed Gate QR poster is scanned by students via their mobile camera.
 * - Direction is strictly derived from pass state:
 *     gate_pass_issued -> EXIT (pass becomes 'out')
 *     out or overdue   -> ENTRY (pass becomes 'returned', flagged late if overdue)
 *
 * // TODO(BACKEND): Replace client verification and mock persistence with Supabase RPCs:
 * // - `supabase.rpc('process_gate_qr_scan', { student_id, qr_payload, location })`
 * // - `supabase.rpc('rotate_gate_qr', { gate_id })`
 */

import {
  MOCK_PASSES,
  MOCK_SECURITY_LOGS,
  MOCK_NOTIFICATIONS,
  STORAGE_KEYS,
  getPersistentMock,
  setPersistentMock,
} from "@/lib/mock/index.js";
import { simulateLatency, successResponse, errorResponse } from "./base.js";
import { PASS_STATUSES } from "@/config/status.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import {
  buildGateQrPayload,
  parseGateQr,
  isGateQrValid,
  getDistanceMeters,
  getDateKey,
  getDailyNonce,
} from "@/lib/utils/gateQr.js";

const ROTATION_STORAGE_PREFIX = "dmi_gate_qr_custom_";

/**
 * Returns all configured physical campus gates
 */
export async function listGates() {
  await simulateLatency(100, 250);
  return successResponse(WORKFLOW_CONFIG.gates || []);
}

/**
 * Retrieves the currently active Gate QR token and metadata for a gate
 * @param {string} [gateId="MAIN"]
 */
export async function getGateQr(gateId = "MAIN") {
  await simulateLatency(150, 300);

  const gate = (WORKFLOW_CONFIG.gates || []).find((g) => g.id === gateId) || {
    id: gateId,
    name: `${gateId} Gate`,
    lat: 12.845,
    lng: 79.95,
  };

  const todayKey = getDateKey();

  // Check for any stored manual rotation override in localStorage
  let custom = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`${ROTATION_STORAGE_PREFIX}${gateId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dateKey === todayKey) {
          custom = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const nonce = custom?.nonce || getDailyNonce(todayKey, gate.id);
  const payload = custom?.payload || buildGateQrPayload(gate, todayKey, nonce);
  const rotatedAt = custom?.rotatedAt || new Date().toISOString();

  return successResponse({
    gate,
    payload,
    nonce,
    dateKey: todayKey,
    rotatedAt,
    isRotatedToday: !!custom,
  });
}

/**
 * Rotates the Gate QR token immediately for security / manual refresh
 * @param {string} [gateId="MAIN"]
 */
export async function rotateGateQr(gateId = "MAIN") {
  await simulateLatency(250, 450);

  const gate = (WORKFLOW_CONFIG.gates || []).find((g) => g.id === gateId) || {
    id: gateId,
    name: `${gateId} Gate`,
    lat: 12.845,
    lng: 79.95,
  };

  const dateKey = getDateKey();
  // Generate random 6-character alphanumeric nonce
  const chars = "abcdefhkmnpqrstuvwxyz23456789";
  let randomNonce = "";
  for (let i = 0; i < 6; i++) {
    randomNonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const payload = buildGateQrPayload(gate, dateKey, randomNonce);
  const rotatedAt = new Date().toISOString();

  const record = {
    gateId,
    dateKey,
    nonce: randomNonce,
    payload,
    rotatedAt,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${ROTATION_STORAGE_PREFIX}${gateId}`, JSON.stringify(record));
    } catch (e) {
      // ignore
    }
  }

  return successResponse({
    gate,
    payload,
    nonce: randomNonce,
    dateKey,
    rotatedAt,
    isRotatedToday: true,
  });
}

/**
 * Processes a gate QR scan performed by a student's phone camera
 * @param {object} params
 * @param {string} params.studentId - Student ID (e.g. "CSE-3-001")
 * @param {string} [params.qrText] - Decoded QR string from camera
 * @param {string} [params.manualCode] - 6-character fallback code
 * @param {{ lat?: number, lng?: number, accuracy?: number }} [params.location] - Student GPS location
 * @param {'student_scan'|'manual'} [params.source='student_scan']
 */
export async function processScan({ studentId, qrText, manualCode, location, source = "student_scan" }) {
  await simulateLatency(350, 650);

  // Strict offline check: scans cannot be queued offline to prevent timestamp fraud
  if (typeof window !== "undefined" && !navigator.onLine) {
    return errorResponse(
      "OFFLINE",
      "You need an internet connection to record your exit/entry. Ask the warden for a manual entry if you have no signal."
    );
  }

  // 1. Resolve QR payload (support either full QR payload or 6-character manual fallback)
  let rawPayload = (qrText || "").trim();
  const inputCode = (manualCode || "").trim().toLowerCase();

  const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 }];
  const todayKey = getDateKey();

  if (!rawPayload && inputCode) {
    // Check manual fallback code against gates
    let matchedGate = null;
    let matchedNonce = null;

    for (const g of gates) {
      // check stored rotation
      let activeNonce = getDailyNonce(todayKey, g.id);
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`${ROTATION_STORAGE_PREFIX}${g.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.dateKey === todayKey && parsed.nonce) {
              activeNonce = parsed.nonce;
            }
          }
        } catch (e) {}
      }

      if (activeNonce.toLowerCase() === inputCode) {
        matchedGate = g;
        matchedNonce = activeNonce;
        break;
      }
    }

    if (!matchedGate) {
      return errorResponse("INVALID_GATE_CODE", "Invalid 6-character gate code. Please check the poster and try again.");
    }

    rawPayload = buildGateQrPayload(matchedGate, todayKey, matchedNonce);
  }

  // 2. Validate QR payload
  if (!rawPayload) {
    return errorResponse("EMPTY_SCAN", "No QR code data received. Please align your camera with the Gate QR poster.");
  }

  const qrValidation = isGateQrValid(rawPayload, new Date());
  if (!qrValidation.valid) {
    return errorResponse(
      qrValidation.code || "INVALID_GATE_QR",
      qrValidation.message || "Unrecognized or expired Gate QR poster."
    );
  }

  const parsedGate = qrValidation.parsed;
  const gate = gates.find((g) => g.id === parsedGate.gateId) || gates[0];

  // 3. Geofence enforcement
  if (WORKFLOW_CONFIG.geofence?.enabled && location && location.lat && location.lng) {
    const distanceMeters = getDistanceMeters(location.lat, location.lng, gate.lat, gate.lng);
    const maxRadius = WORKFLOW_CONFIG.geofence.radiusMeters || 150;

    if (distanceMeters > maxRadius) {
      return errorResponse(
        "OUTSIDE_GEOFENCE",
        `You appear to be approximately ${distanceMeters}m away from ${gate.name}. You must be physically at the gate (within ${maxRadius}m) to scan.`,
        { distanceMeters, maxRadius, gateName: gate.name }
      );
    }
  }

  // 4. Find student's active pass
  const cleanStudentId = (studentId || "").trim().toLowerCase();
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Eligible for movement:
  // - gate_pass_issued -> EXIT
  // - out or overdue   -> ENTRY
  const eligiblePass = passes.find(
    (p) =>
      p.studentId &&
      p.studentId.toLowerCase() === cleanStudentId &&
      (p.status === PASS_STATUSES.GATE_PASS_ISSUED ||
        p.status === PASS_STATUSES.OUT ||
        p.status === PASS_STATUSES.OVERDUE)
  );

  if (!eligiblePass) {
    // Check if student has a pending pass to provide helpful feedback
    const pendingPass = passes.find(
      (p) =>
        p.studentId &&
        p.studentId.toLowerCase() === cleanStudentId &&
        (p.status === PASS_STATUSES.APPLIED ||
          p.status === PASS_STATUSES.APPROVED_BY_STAFF ||
          p.status === PASS_STATUSES.APPROVED_BY_HOD)
    );

    if (pendingPass) {
      return errorResponse(
        "PASS_NOT_READY",
        "Your pass is currently awaiting Warden approval. Gate passes are only active after full approval."
      );
    }

    return errorResponse(
      "NO_ACTIVE_PASS",
      "No active pass found ready for exit or entry. Please apply for a pass or check your pass status."
    );
  }

  // 5. Anti-duplicate scan window check (30 seconds)
  const windowMs = (WORKFLOW_CONFIG.duplicateScanWindowSeconds || 30) * 1000;
  const lastMovementTime = eligiblePass.timeline?.slice(-1)[0]?.timestamp;
  if (lastMovementTime) {
    const elapsed = Date.now() - new Date(lastMovementTime).getTime();
    if (elapsed < windowMs) {
      const waitSec = Math.ceil((windowMs - elapsed) / 1000);
      return errorResponse(
        "DUPLICATE_SCAN",
        `Scan recorded too recently. Please wait ${waitSec} seconds before scanning again.`
      );
    }
  }

  // 6. State Transition: Action derived deterministically
  const nowIso = new Date().toISOString();
  let action = "EXIT";
  let newStatus = PASS_STATUSES.OUT;
  let isLate = false;
  let lateByMinutes = 0;

  if (eligiblePass.status === PASS_STATUSES.GATE_PASS_ISSUED) {
    action = "EXIT";
    newStatus = PASS_STATUSES.OUT;

    // Check exit grace window if validFrom is set
    if (eligiblePass.validFrom) {
      const validFromTime = new Date(eligiblePass.validFrom).getTime();
      const graceMs = (WORKFLOW_CONFIG.exitGraceMinutes || 15) * 60000;
      if (Date.now() < validFromTime - graceMs) {
        return errorResponse(
          "EXIT_TOO_EARLY",
          `Pass is valid from ${eligiblePass.validFrom}. You may exit up to ${WORKFLOW_CONFIG.exitGraceMinutes || 15} min before.`
        );
      }
    }

    eligiblePass.actualExitTime = nowIso;
  } else {
    // PASS_STATUSES.OUT or PASS_STATUSES.OVERDUE
    action = "ENTRY";
    newStatus = PASS_STATUSES.RETURNED;
    eligiblePass.actualEntryTime = nowIso;

    // Check if return is late
    const expectedReturn = eligiblePass.validTo || eligiblePass.expectedReturnTime || eligiblePass.returnTime;
    if (expectedReturn) {
      const returnTime = new Date(expectedReturn).getTime();
      if (Date.now() > returnTime || eligiblePass.status === PASS_STATUSES.OVERDUE) {
        isLate = true;
        lateByMinutes = Math.max(1, Math.round((Date.now() - returnTime) / 60000));
        eligiblePass.isLate = true;
        eligiblePass.lateByMinutes = lateByMinutes;
      }
    }
  }

  eligiblePass.status = newStatus;
  eligiblePass.updatedAt = nowIso;

  // Append to timeline
  eligiblePass.timeline = eligiblePass.timeline || [];
  eligiblePass.timeline.push({
    id: `tl-scan-${Date.now()}`,
    status: newStatus,
    title: action === "EXIT" ? "Hostel Exit Recorded" : "Hostel Return Recorded",
    description:
      action === "EXIT"
        ? `Exited campus through ${gate.name} (${source === "manual" ? "manual entry" : "Gate QR scan"}).`
        : `Returned to hostel through ${gate.name}${isLate ? ` — ${lateByMinutes} min late.` : " on time."}`,
    actor: source === "manual" ? "Warden Override" : "Student Camera Scan",
    timestamp: nowIso,
    details: {
      gateId: gate.id,
      gateName: gate.name,
      source,
      isLate,
      lateByMinutes,
      accuracy: location?.accuracy,
    },
  });

  // Persist updated passes
  const passIdx = passes.findIndex((p) => p.id === eligiblePass.id);
  if (passIdx !== -1) {
    passes[passIdx] = { ...eligiblePass };
    setPersistentMock(STORAGE_KEYS.PASSES, passes);
  }

  // 7. Record Security Movement Log
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);
  const newLog = {
    id: `LOG-2026-${String(logs.length + 1).padStart(4, "0")}`,
    passId: eligiblePass.id,
    studentId: eligiblePass.studentId,
    studentName: eligiblePass.studentName,
    department: eligiblePass.department,
    room: eligiblePass.room,
    floor: eligiblePass.floor || "GF",
    type: action,
    gate: gate.name,
    gateId: gate.id,
    source,
    timestamp: nowIso,
    isLate,
    lateByMinutes,
    status: isLate ? "Late Entry Warning" : "Verified Clear",
    verifiedBy: source === "manual" ? "Warden Manual Verification" : "Gate QR Camera Scan",
    note: isLate ? `Returned ${lateByMinutes} min past permitted curfew` : `Digital scan verified at ${gate.name}`,
    location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy } : null,
  };

  setPersistentMock(STORAGE_KEYS.LOGS, [newLog, ...logs]);

  // 8. Push Student Notification
  const notifications = getPersistentMock(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
  const newNotif = {
    id: `notif-${Date.now()}`,
    userId: eligiblePass.studentId,
    title: action === "EXIT" ? "Hostel Exit Confirmed" : isLate ? "Late Return Recorded" : "Hostel Return Confirmed",
    message:
      action === "EXIT"
        ? `Exit verified at ${gate.name}. Return scheduled by ${eligiblePass.validTo || "curfew"}.`
        : isLate
        ? `Returned via ${gate.name} (${lateByMinutes} min late). Warden notified.`
        : `Welcome back! Checked in safely via ${gate.name}.`,
    type: isLate ? "warning" : "success",
    timestamp: nowIso,
    read: false,
  };
  setPersistentMock(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifications]);

  return successResponse({
    action,
    passId: eligiblePass.id,
    pass: eligiblePass,
    gate,
    timestamp: nowIso,
    isLate,
    lateByMinutes,
    returnDeadline: eligiblePass.validTo || eligiblePass.expectedReturnTime,
  });
}

/**
 * Allows warden to record a student's entry or exit manually if their camera is unavailable
 * @param {object} params
 */
export async function manualOverride({ studentId, passId, action, wardenName = "Chief Warden", reason = "Camera failure" }) {
  await simulateLatency(300, 500);

  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const pass = passes.find(
    (p) => p.id === passId || (studentId && p.studentId?.toLowerCase() === studentId.toLowerCase())
  );

  if (!pass) {
    return errorResponse("PASS_NOT_FOUND", "No pass found for manual override.");
  }

  const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate" }];
  const gate = gates[0];
  const nowIso = new Date().toISOString();

  let isLate = false;
  let lateByMinutes = 0;

  if (action === "EXIT") {
    pass.status = PASS_STATUSES.OUT;
    pass.actualExitTime = nowIso;
  } else {
    pass.status = PASS_STATUSES.RETURNED;
    pass.actualEntryTime = nowIso;
    const returnTime = new Date(pass.validTo || pass.expectedReturnTime || Date.now()).getTime();
    if (Date.now() > returnTime) {
      isLate = true;
      lateByMinutes = Math.max(1, Math.round((Date.now() - returnTime) / 60000));
      pass.isLate = true;
      pass.lateByMinutes = lateByMinutes;
    }
  }

  pass.updatedAt = nowIso;
  pass.timeline = pass.timeline || [];
  pass.timeline.push({
    id: `tl-override-${Date.now()}`,
    status: pass.status,
    title: `Manual ${action} (Warden Override)`,
    description: `Manual override by ${wardenName}: ${reason}`,
    actor: wardenName,
    timestamp: nowIso,
  });

  const passIdx = passes.findIndex((p) => p.id === pass.id);
  if (passIdx !== -1) {
    passes[passIdx] = { ...pass };
    setPersistentMock(STORAGE_KEYS.PASSES, passes);
  }

  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);
  const newLog = {
    id: `LOG-2026-${String(logs.length + 1).padStart(4, "0")}`,
    passId: pass.id,
    studentId: pass.studentId,
    studentName: pass.studentName,
    type: action,
    gate: gate.name,
    gateId: gate.id,
    source: "manual",
    timestamp: nowIso,
    isLate,
    lateByMinutes,
    status: isLate ? "Late Entry (Manual)" : "Manual Clear",
    verifiedBy: wardenName,
    note: `Manual override: ${reason}`,
  };
  setPersistentMock(STORAGE_KEYS.LOGS, [newLog, ...logs]);

  return successResponse({
    action,
    passId: pass.id,
    pass,
    gate,
    timestamp: nowIso,
    isLate,
    lateByMinutes,
  });
}

export const gateService = {
  listGates,
  getGateQr,
  rotateGateQr,
  processScan,
  manualOverride,
};

export default gateService;
