/**
 * DMI College Hostel Management - Unified Storage Layer
 * Real student and outpass records are permanently managed in MySQL.
 */

import { MOCK_USERS } from "./users.js";
import { MOCK_STUDENTS } from "./students.js";
import { MOCK_PASSES } from "./passes.js";
import { MOCK_SECURITY_LOGS } from "./security-logs.js";
import { MOCK_NOTIFICATIONS } from "./notifications.js";
import { MOCK_ROOMS } from "./rooms.js";
import { MOCK_LETTERS } from "./letters.js";

export {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_PASSES,
  MOCK_SECURITY_LOGS,
  MOCK_NOTIFICATIONS,
  MOCK_ROOMS,
  MOCK_LETTERS,
};

const STORAGE_KEYS = {
  USERS: "dmi_mock_users_v2",
  STUDENTS: "dmi_mock_students_v2",
  PASSES: "dmi_mock_passes_v3",
  LOGS: "dmi_mock_logs_v2",
  NOTIFS: "dmi_mock_notifs_v2",
  ROOMS: "dmi_mock_rooms_v2",
  LETTERS: "dmi_mock_letters_v2",
  LATENCY: "dmi_mock_latency_enabled",
};

const ALL_MOCK_KEYS = [
  "dmi_mock_users_v2",
  "dmi_mock_students_v2",
  "dmi_mock_passes_v3",
  "dmi_mock_logs_v2",
  "dmi_mock_notifs_v2",
  "dmi_mock_rooms_v2",
  "dmi_mock_letters_v2",
  "dmi_mock_latency_enabled",
  "dmi_students_v1",
  "dmi_users_v1",
  "dmi_passes_v1",
  "dmi_letters_v1",
  "dmi_notifs_v1",
  "dmi_logs_v1",
  "dmi_rooms_v1",
  "dmi_signup_draft_v2",
  "dmi_signup_draft_v1",
  "dmi_rq_persisted_cache",
];

const memoryStore = new Map();

/**
 * Purges all mock data from browser localStorage and sessionStorage
 */
export function purgeAllBrowserStorage() {
  if (typeof window === "undefined") {
    memoryStore.clear();
    return;
  }
  try {
    ALL_MOCK_KEYS.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("dmi_mock_") ||
          key.startsWith("dmi_students_") ||
          key.startsWith("dmi_users_") ||
          key.startsWith("dmi_passes_"))
      ) {
        localStorage.removeItem(key);
      }
    }

    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith("dmi_mock_") ||
          key.startsWith("dmi_signup_draft") ||
          key.startsWith("dmi_"))
      ) {
        sessionStorage.removeItem(key);
      }
    }

    console.log("[Storage Cleaner] Successfully wiped all mock data from browser storage.");
  } catch (e) {
    console.error("Failed to purge browser storage:", e);
  }
}

/**
 * Reset mock data - now clears all mock datasets from browser storage completely
 */
export function resetMockData() {
  purgeAllBrowserStorage();
}

/**
 * Get data with local storage persistence fallback.
 * Will NOT write mock objects into localStorage.
 */
export function getPersistentMock(key, factoryDefault) {
  if (typeof window === "undefined") {
    if (memoryStore.has(key)) return memoryStore.get(key);
    return factoryDefault || [];
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return factoryDefault || [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return factoryDefault || [];
  }
}

/**
 * Save data to memory/storage.
 */
export function setPersistentMock(key, data) {
  if (typeof window === "undefined") {
    memoryStore.set(key, data);
    return;
  }
  // No longer write mock collections to localStorage
}

export { STORAGE_KEYS };
