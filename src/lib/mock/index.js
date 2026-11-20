/**
 * DMI College Hostel Management PWA - Unified Mock Data Layer
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

const memoryStore = new Map();

/**
 * Resets all localStorage mock datasets back to deterministic seed state
 */
export function resetMockData() {
  if (typeof window === "undefined") {
    memoryStore.clear();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(MOCK_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.PASSES, JSON.stringify(MOCK_PASSES));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(MOCK_SECURITY_LOGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(MOCK_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(MOCK_ROOMS));
    localStorage.setItem(STORAGE_KEYS.LETTERS, JSON.stringify(MOCK_LETTERS));
    console.log("[Mock Store] Mock data reset to deterministic factory state.");
  } catch (e) {
    console.error("Failed to reset mock data", e);
  }
}

/**
 * Get data with local storage persistence fallback
 */
export function getPersistentMock(key, factoryDefault) {
  if (typeof window === "undefined") {
    if (memoryStore.has(key)) return memoryStore.get(key);
    return factoryDefault;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(factoryDefault));
      return factoryDefault;
    }
    return JSON.parse(raw);
  } catch (e) {
    return factoryDefault;
  }
}

/**
 * Save data to local storage
 */
export function setPersistentMock(key, data) {
  if (typeof window === "undefined") {
    memoryStore.set(key, data);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to persist mock data", e);
  }
}

export { STORAGE_KEYS };
