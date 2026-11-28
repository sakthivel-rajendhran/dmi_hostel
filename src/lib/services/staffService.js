/**
 * Staff & Department Service
 * Manages Staff and HOD profile data, assigned year scopes, and communication preferences.
 */

import { MOCK_USERS, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { ROLES } from "@/config/roles.js";
import { getCurrentSession, setSessionForTesting } from "./authService.js";
import { simulateLatency, successResponse, errorResponse } from "./base.js";

const PREFS_STORAGE_KEY = "dmi_staff_preferences_v2";

/**
 * Retrieve active staff/HOD profile
 */
export async function getProfile(userId) {
  const session = getCurrentSession();
  const targetId = userId || session?.user?.id;

  if (typeof window !== "undefined" && targetId) {
    try {
      const res = await fetch(`/api/staff/profile?userId=${encodeURIComponent(targetId)}`, {
        headers: {
          "x-user-id": targetId,
        },
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        return successResponse(json.data);
      }
    } catch (e) {
      console.warn("Failed to fetch profile from API, falling back to session data", e);
    }
  }

  // Fallback to active session user (populated directly from MySQL upon login)
  if (session?.user) {
    return successResponse({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email || null,
      role: session.user.role,
      department: session.user.department || "CSE",
      dept: session.user.department || "CSE",
      designation: session.user.designation || null,
      phone: session.user.phone || null,
      assignedYears: session.user.assignedYears || [],
      status: "active",
    });
  }

  return errorResponse("NOT_AUTHENTICATED", "No active session found.");
}

/**
 * Update staff/HOD profile (editable fields: name, department, email, designation)
 * Read-only locked fields: id, role, assignedYears
 * Persists directly to MySQL via /api/staff/profile
 * @param {object} patch
 */
export async function updateProfile(patch = {}) {
  const session = getCurrentSession();
  const targetId = patch.userId || session?.user?.id;

  if (typeof window !== "undefined" && targetId) {
    try {
      const res = await fetch("/api/staff/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": targetId,
        },
        body: JSON.stringify({
          userId: targetId,
          name: patch.name,
          department: patch.department || patch.dept,
          email: patch.email,
          designation: patch.designation,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return errorResponse("UPDATE_FAILED", json.message || "Failed to update profile in database.");
      }

      // Update active session with the persisted values
      if (session && session.user) {
        const updatedSession = {
          ...session,
          user: {
            ...session.user,
            name: json.data.name || patch.name || session.user.name,
            department: json.data.department || patch.department || session.user.department,
            dept: json.data.department || patch.department || session.user.department,
            email: json.data.email || patch.email || session.user.email,
            designation: json.data.designation || patch.designation || session.user.designation,
          },
        };
        setSessionForTesting(updatedSession);
      }

      return successResponse(json.data);
    } catch (e) {
      console.error("[staffService] Failed to update profile via API:", e);
      return errorResponse("NETWORK_ERROR", "Could not reach database server to save profile changes.");
    }
  }

  return errorResponse("NOT_AUTHENTICATED", "No active session found.");
}

/**
 * Get staff notification & delivery preferences
 */
export async function getPreferences() {
  await simulateLatency(100, 200);
  const defaults = {
    emailAlerts: true,
    smsAlerts: true,
    emergencyPush: true,
    dailyDigest: true,
    passStatusChanges: true,
  };

  if (typeof window === "undefined") return successResponse(defaults);

  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : defaults;
    return successResponse({ ...defaults, ...parsed });
  } catch (e) {
    return successResponse(defaults);
  }
}

/**
 * Update notification preferences
 * @param {object} patch
 */
export async function updatePreferences(patch = {}) {
  await simulateLatency(150, 300);
  const current = (await getPreferences()).data;
  const updated = { ...current, ...patch };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  }

  return successResponse(updated);
}

export const staffService = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
};

export default staffService;
