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
export async function getProfile() {
  await simulateLatency(150, 300);
  const session = getCurrentSession();
  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  
  let targetUser = null;
  if (session?.user?.id) {
    targetUser = users.find((u) => u.id === session.user.id);
  }
  
  if (!targetUser) {
    targetUser = users.find((u) => u.role === ROLES.STAFF) || MOCK_USERS[3];
  }

  return successResponse({
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    gmail: targetUser.gmail,
    role: targetUser.role,
    designation: targetUser.designation || (targetUser.role === ROLES.HOD ? "Head of Department" : "Faculty Advisor"),
    phone: targetUser.phone || "+91 98765 00003",
    avatar: targetUser.avatar || "ST",
    photo: targetUser.photo || targetUser.photoDataUrl || null,
    photoDataUrl: targetUser.photoDataUrl || targetUser.photo || null,
    dept: targetUser.dept || targetUser.department || "CSE",
    department: targetUser.dept || targetUser.department || "CSE",
    departmentName: targetUser.departmentName || "Computer Science & Engineering",
    assignedYears: Array.isArray(targetUser.assignedYears) ? targetUser.assignedYears : [],
    bio: targetUser.bio || "Academic mentor and hostel outpass advisor.",
  });
}

/**
 * Update staff/HOD profile (editable fields: phone, designation, bio, photo)
 * Read-only locked fields: assignedYears, dept, role, id, email
 * @param {object} patch
 */
export async function updateProfile(patch = {}) {
  await simulateLatency(250, 450);
  const session = getCurrentSession();
  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  
  let userIdx = -1;
  if (session?.user?.id) {
    userIdx = users.findIndex((u) => u.id === session.user.id);
  }
  if (userIdx === -1) {
    userIdx = users.findIndex((u) => u.role === ROLES.STAFF);
  }
  if (userIdx === -1) {
    return errorResponse("NOT_FOUND", "Staff user not found.");
  }

  const currentUser = users[userIdx];

  // Editable fields only
  const updatedUser = {
    ...currentUser,
    phone: patch.phone !== undefined ? patch.phone : currentUser.phone,
    designation: patch.designation !== undefined ? patch.designation : currentUser.designation,
    bio: patch.bio !== undefined ? patch.bio : currentUser.bio,
    photo: patch.photoDataUrl || patch.photo || currentUser.photo,
    photoDataUrl: patch.photoDataUrl || patch.photo || currentUser.photoDataUrl,
    updatedAt: new Date().toISOString(),
  };

  users[userIdx] = updatedUser;
  setPersistentMock(STORAGE_KEYS.USERS, users);

  // Update session
  if (session) {
    const updatedSession = {
      ...session,
      user: { ...session.user, ...updatedUser },
    };
    setSessionForTesting(updatedSession);
  }

  return successResponse(updatedUser);
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
