/**
 * DMI College Hostel Management PWA - Gate QR Token Specification & Utilities
 *
 * Implements the fixed-poster Gate QR protocol scanned by students upon campus exit and entry.
 * Protocol: DMIGATE1|<gateId>|<dateKey>|<nonce>|<mockSignature>
 * Example:  DMIGATE1|MAIN|20261119|k3x9ab|ab12cd
 *
 * // TODO(BACKEND): sign and verify gate tokens server-side; the client must never be the source of truth.
 */

import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Returns formatted 8-digit date key YYYYMMDD
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "20261119"
 */
export function getDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Generates deterministic 6-character fallback manual code
 * @param {string} dateKey
 * @param {string} gateId
 * @returns {string} e.g. "k3x9ab"
 */
export function getDailyNonce(dateKey, gateId = "MAIN") {
  const seed = `NONCE-${gateId}-${dateKey}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(36).toLowerCase();
  return hex.padEnd(6, "x").slice(0, 6);
}

/**
 * Builds standard Gate QR payload for a given gate
 * @param {object|string} gate - Gate object or gateId string
 * @param {string} [customDateKey]
 * @param {string} [customNonce]
 * @returns {string} e.g. "DMIGATE1|MAIN|20261119|k3x9ab|5E8A9C"
 */
export function buildGateQrPayload(gate, customDateKey, customNonce) {
  const gateId = typeof gate === "string" ? gate : gate?.id || "MAIN";
  const dateKey = customDateKey || getDateKey();
  const nonce = customNonce || getDailyNonce(dateKey, gateId);

  const rawData = `DMIGATE1|${gateId}|${dateKey}|${nonce}`;

  // Deterministic mock cryptographic signature
  // // TODO(BACKEND): sign server-side with Ed25519 or HMAC-SHA256
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    hash = (hash << 5) - hash + rawData.charCodeAt(i);
    hash |= 0;
  }
  const mockSignature = Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);

  return `${rawData}|${mockSignature}`;
}

/**
 * Parses and validates an incoming gate QR string
 * @param {string} text
 * @returns {{ isValid: boolean, version?: string, gateId?: string, dateKey?: string, nonce?: string, signature?: string, error?: string }}
 */
export function parseGateQr(text) {
  if (!text || typeof text !== "string") {
    return { isValid: false, error: "Empty or invalid QR code format" };
  }

  const parts = text.trim().split("|");
  if (parts.length < 5 || parts[0] !== "DMIGATE1") {
    return { isValid: false, error: "Invalid Gate QR format: Expected DMIGATE1 protocol header" };
  }

  const [version, gateId, dateKey, nonce, signature] = parts;

  // Verify signature
  const rawData = `${version}|${gateId}|${dateKey}|${nonce}`;
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    hash = (hash << 5) - hash + rawData.charCodeAt(i);
    hash |= 0;
  }
  const expectedSig = Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);

  if (signature !== expectedSig) {
    return { isValid: false, error: "Tampered Gate QR: Cryptographic signature mismatch" };
  }

  return {
    isValid: true,
    version,
    gateId,
    dateKey,
    nonce,
    signature,
  };
}

/**
 * Evaluates whether a Gate QR payload is currently active and within rotation window
 * @param {string} payload
 * @param {Date|string|number} [now=new Date()]
 * @param {object} [options]
 * @returns {{ valid: boolean, code?: string, message?: string, parsed?: object }}
 */
export function isGateQrValid(payload, now = new Date(), options = {}) {
  const parsed = parseGateQr(payload);
  if (!parsed.isValid) {
    return { valid: false, code: "INVALID_GATE_QR", message: parsed.error || "Invalid Gate QR." };
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const todayKey = getDateKey(nowDate);

  // If payload matches today's rotation
  if (parsed.dateKey === todayKey) {
    return { valid: true, parsed };
  }

  // Check previous day grace period if configured
  const acceptPreviousDay = options.acceptPreviousDay ?? WORKFLOW_CONFIG.gateQr?.acceptPreviousDay ?? true;
  if (acceptPreviousDay) {
    const yesterday = new Date(nowDate.getTime() - 86400000);
    const yesterdayKey = getDateKey(yesterday);
    if (parsed.dateKey === yesterdayKey) {
      return { valid: true, parsed, isGracePeriod: true };
    }
  }

  return {
    valid: false,
    code: "GATE_QR_EXPIRED",
    message: "This Gate QR has expired. Please scan today's active Gate QR poster.",
    parsed,
  };
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }

  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default {
  getDateKey,
  getDailyNonce,
  buildGateQrPayload,
  parseGateQr,
  isGateQrValid,
  getDistanceMeters,
};
