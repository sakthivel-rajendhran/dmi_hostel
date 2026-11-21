/**
 * DMI College Hostel Management PWA - Settings & Policy Service
 * Manages switchable operation policies (Room Allocation Mode & Photo Upload Policy).
 * Overrides WORKFLOW_CONFIG defaults via client storage with custom event dispatching.
 */

import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { resetMockData } from "@/lib/mock/index.js";

const POLICY_STORAGE_KEY = "dmi_system_policy_v2";

let memoryPolicy = null;

/**
 * Returns current effective system policy
 * @returns {object}
 */
export function getPolicy() {
  const defaults = {
    requireStaffRecommendation: WORKFLOW_CONFIG.requireStaffRecommendation || false,
    roomAllocationMode: WORKFLOW_CONFIG.roomAllocationMode || "warden_allocates",
    photoPolicy: WORKFLOW_CONFIG.photoPolicy || "auto_compress",
    maxPhotoBytes: WORKFLOW_CONFIG.maxPhotoBytes || 1048576,
    maxPhotoInputBytes: WORKFLOW_CONFIG.maxPhotoInputBytes || 15728640,
    photoMinPx: WORKFLOW_CONFIG.photoMinPx || 200,
    photoOutputPx: WORKFLOW_CONFIG.photoOutputPx || 400,
    photoAccept: WORKFLOW_CONFIG.photoAccept || ["image/jpeg", "image/png", "image/webp"],
    floors: WORKFLOW_CONFIG.floors,
    roomsPerFloor: WORKFLOW_CONFIG.roomsPerFloor || 30,
    roomCapacity: WORKFLOW_CONFIG.roomCapacity || 4,
    programmes: WORKFLOW_CONFIG.programmes,
    insightThresholds: WORKFLOW_CONFIG.insightThresholds || { lateReturnAmber: 10, lateReturnRed: 20 },
    studentLetters: WORKFLOW_CONFIG.studentLetters || {
      enabled: false,
      approverMode: "either",
      letterApprovalRequired: false,
      requiredFor: ["home_over_days"],
      requiredHomeDays: 7,
      maxLetterBytes: 2097152,
      accept: ["application/pdf", "image/jpeg", "image/png"],
      letterTypes: [
        { id: "long_leave", label: "Long leave / Extended Break" },
        { id: "medical", label: "Medical Leave / Hospitalization" },
        { id: "special_event", label: "Special Academic / Sports Duty" },
        { id: "other", label: "Other Special Permission" },
      ],
    },
  };

  if (typeof window === "undefined") {
    if (!memoryPolicy) return defaults;
    return {
      ...defaults,
      ...memoryPolicy,
      studentLetters: { ...defaults.studentLetters, ...(memoryPolicy.studentLetters || {}) },
    };
  }

  try {
    const raw = localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      studentLetters: { ...defaults.studentLetters, ...(parsed.studentLetters || {}) },
    };
  } catch (e) {
    return defaults;
  }
}

/**
 * Updates partial policy in storage and broadcasts changes
 * @param {object} partial
 */
export function updatePolicy(partial) {
  if (typeof window === "undefined") {
    const current = getPolicy();
    const mergedLetters = partial.studentLetters
      ? { ...current.studentLetters, ...partial.studentLetters }
      : current.studentLetters;
    memoryPolicy = { ...current, ...partial, studentLetters: mergedLetters };
    return memoryPolicy;
  }

  try {
    const current = getPolicy();
    const mergedLetters = partial.studentLetters
      ? { ...current.studentLetters, ...partial.studentLetters }
      : current.studentLetters;
    const updated = { ...current, ...partial, studentLetters: mergedLetters };
    localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for instantaneous same-tab reactivity
    window.dispatchEvent(
      new CustomEvent("dmi-policy-change", { detail: updated })
    );

    return updated;
  } catch (e) {
    console.error("Failed to update policy:", e);
    return getPolicy();
  }
}

/**
 * Resets policy overrides back to system factory defaults
 */
export function resetPolicy() {
  if (typeof window === "undefined") {
    memoryPolicy = null;
    return getPolicy();
  }
  try {
    localStorage.removeItem(POLICY_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("dmi-policy-change", { detail: getPolicy() })
    );
  } catch (e) {}
  return getPolicy();
}

/**
 * Resets all demo data and policies back to deterministic factory seed state
 */
export async function resetDemoData() {
  resetMockData();
  resetPolicy();
  return { ok: true, message: "Demo data and policies successfully reset to initial factory state." };
}

export const settingsService = {
  getPolicy,
  updatePolicy,
  resetPolicy,
  resetDemoData,
};

export default settingsService;
