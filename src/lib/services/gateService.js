/**
 * DMI College Hostel Management PWA - Gate Checkpoint Service
 * Production-ready service communicating exclusively with MySQL-backed Next.js API endpoints.
 * Zero LocalStorage mock dependencies.
 */

import { successResponse, errorResponse } from "./base.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Returns all configured physical campus gates
 */
export async function listGates() {
  return successResponse(WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate" }]);
}

/**
 * Retrieves the currently active Gate QR token and metadata from the backend
 * @param {string} [gateId="MAIN"]
 */
export async function getGateQr(gateId = "MAIN") {
  try {
    const res = await fetch(`/api/gate/qr?gate=${encodeURIComponent(gateId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "FETCH_FAILED", json.message || "Failed to load active gate QR.");
    }

    const { data } = json;
    return successResponse({
      gate: data.gate || { id: gateId, name: `${gateId} Gate` },
      payload: data.token,
      qrDataUrl: data.qrDataUrl,
      nonce: data.nonce,
      dateKey: data.issuedAt?.substring(0, 10)?.replace(/-/g, ""),
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      expiresInSeconds: data.expiresInSeconds,
      rotatedAt: data.issuedAt,
      isRotatedToday: true,
    });
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Failed to connect to gate QR service.");
  }
}

/**
 * Rotates the Gate QR token immediately via backend
 * @param {string} [gateId="MAIN"]
 */
export async function rotateGateQr(gateId = "MAIN") {
  try {
    const res = await fetch(`/api/gate/qr?gate=${encodeURIComponent(gateId)}&rotate=true`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "ROTATE_FAILED", json.message || "Failed to rotate gate QR.");
    }

    const { data } = json;
    return successResponse({
      gate: data.gate || { id: gateId, name: `${gateId} Gate` },
      payload: data.token,
      qrDataUrl: data.qrDataUrl,
      nonce: data.nonce,
      dateKey: data.issuedAt?.substring(0, 10)?.replace(/-/g, ""),
      issuedAt: data.issuedAt,
      expiresAt: data.expiresAt,
      expiresInSeconds: data.expiresInSeconds,
      rotatedAt: data.issuedAt,
      isRotatedToday: true,
    });
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Failed to connect to gate QR service.");
  }
}

/**
 * Step 1 of Option B: Validate Gate QR + Check student outpass & permitted movement action
 * (Does NOT modify database)
 */
export async function checkScanIntent({ studentId, qrText, gateId = "MAIN", location }) {
  try {
    const res = await fetch("/api/gate/scan-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        qrText,
        gateId,
        location,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "VALIDATION_FAILED", json.message || "Scan validation failed.", json);
    }

    return successResponse(json.data);
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Network error while validating gate scan.");
  }
}

/**
 * Step 2 of Option B: Execute Confirmed OUT or IN Movement
 * (Updates MySQL outpasses, inserts into security_logs, pass_timeline in a transaction)
 */
export async function recordMovement({ passId, action, qrText, studentId, gateId = "MAIN" }) {
  try {
    const res = await fetch("/api/gate/movement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passId,
        action,
        qrText,
        studentId,
        gateId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "MOVEMENT_FAILED", json.message || "Failed to record gate movement.", json);
    }

    return successResponse(json.data);
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Network error while recording gate movement.");
  }
}

/**
 * Legacy/Direct Unified Scan Processing
 */
export async function processScan({ studentId, qrText, manualCode, location, source = "student_scan" }) {
  try {
    const res = await fetch("/api/gate/verify-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        qrText: qrText || manualCode,
        manualCode,
        location,
        source,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "SCAN_FAILED", json.message || "Gate scan rejected.", json);
    }

    return successResponse(json.data);
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Connection failed during gate scan.");
  }
}

/**
 * Get gate scan audit history from MySQL security_logs
 */
export async function getLogs({ studentId, gateId, action, limit = 50 } = {}) {
  try {
    const params = new URLSearchParams();
    if (studentId) params.append("studentId", studentId);
    if (gateId) params.append("gateId", gateId);
    if (action) params.append("action", action);
    if (limit) params.append("limit", limit.toString());

    const res = await fetch(`/api/gate/history?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return errorResponse(json.code || "LOGS_FAILED", json.message || "Failed to load gate logs.");
    }

    return successResponse(json.data || []);
  } catch (err) {
    return errorResponse("NETWORK_ERROR", err.message || "Failed to fetch gate history.");
  }
}

export const gateService = {
  listGates,
  getGateQr,
  rotateGateQr,
  checkScanIntent,
  recordMovement,
  processScan,
  getLogs,
};

export default gateService;
