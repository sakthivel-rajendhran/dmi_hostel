/**
 * Authentication Service
 * Manages user authentication, role switching, and session state.
 */

import { MOCK_USERS, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { simulateLatency, successResponse, errorResponse } from "./base.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { registerStudent } from "./studentService.js";

const SESSION_KEY = "dmi_auth_session_v2";
let memorySession = null;

/**
 * Log in using Student ID or Staff Gmail
 * @param {object} credentials
 * @param {string} [credentials.role]
 * @param {string} credentials.identifier - Student ID or Staff Email
 * @param {string} credentials.password
 * @returns {Promise<{ ok: boolean, data?: object, code?: string, message?: string }>}
 */
export async function login({ role, identifier, password }) {
  await simulateLatency(350, 600);

  // TODO(BACKEND): replace with Supabase call `supabase.auth.signInWithPassword({ email, password })`
  const cleanId = (identifier || "").trim().toLowerCase();
  const cleanPass = (password || "").trim();

  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const foundUser = users.find(
    (u) =>
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.studentId && u.studentId.toLowerCase() === cleanId) ||
      (u.gmail && u.gmail.toLowerCase() === cleanId) ||
      (u.id && u.id.toLowerCase() === cleanId)
  );

  if (foundUser) {
    if (foundUser.isDeleted) {
      return errorResponse("NOT_FOUND", "Account has been deactivated.");
    }

    if (foundUser.status === "Disabled" || foundUser.disabled) {
      return errorResponse(
        "ACCOUNT_DISABLED",
        `This account has been disabled by the Chief Warden. Reason: ${foundUser.disabledReason || "Administrative hold"}`
      );
    }

    // Check against configured default password, temporary password, or mock password
    const isDefault = cleanPass === WORKFLOW_CONFIG.defaultPassword;
    const isMockValid = cleanPass === "student123" || cleanPass === "admin123" || cleanPass === "pass123" || cleanPass === "Staff@123";
    const isTempValid = foundUser.tempPassword && cleanPass === foundUser.tempPassword;
    const isUserPassValid = foundUser.password && cleanPass === foundUser.password;

    if (isDefault || isMockValid || isTempValid || isUserPassValid) {
      const session = {
        user: foundUser,
        role: foundUser.role,
        mustChangePassword: Boolean(foundUser.mustChangePassword),
        token: `mock-jwt-token-${foundUser.id}-${Date.now()}`,
        loginTime: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
      return successResponse(session);
    }
  }

  // Fallback demo matching
  if (role === "student" || cleanId.includes("stu") || cleanId.includes("cse")) {
    const studentUser = users.find((u) => u.role === "student") || MOCK_USERS[0];
    const session = {
      user: studentUser,
      role: "student",
      token: `mock-jwt-student-${Date.now()}`,
      loginTime: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return successResponse(session);
  }

  const wardenUser = users.find((u) => u.role === "warden") || MOCK_USERS[1];
  const session = {
    user: wardenUser,
    role: "warden",
    token: `mock-jwt-warden-${Date.now()}`,
    loginTime: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return successResponse(session);
}

/**
 * Changes student or staff password
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(currentPassword, newPassword) {
  await simulateLatency(400, 700);
  // TODO(BACKEND): replace with Supabase call `supabase.auth.updateUser({ password: newPassword })`
  if (!newPassword || newPassword.length < 6) {
    return errorResponse("INVALID_PASSWORD", "Password must be at least 6 characters.");
  }

  const session = getCurrentSession();
  if (session?.user) {
    const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
    const idx = allUsers.findIndex(
      (u) => u.id === session.user.id || u.gmail === session.user.gmail || u.email === session.user.email
    );
    if (idx !== -1) {
      allUsers[idx].password = newPassword;
      allUsers[idx].mustChangePassword = false;
      allUsers[idx].tempPassword = null;
      allUsers[idx].status = "Active";
      setPersistentMock(STORAGE_KEYS.USERS, allUsers);
    }
    session.mustChangePassword = false;
    session.user.mustChangePassword = false;
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  return successResponse({ updated: true, timestamp: new Date().toISOString() });
}

/**
 * Retrieves the currently active user session from client storage
 * @returns {object|null}
 */
export function getCurrentSession() {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // fallback to memorySession
    }
  }
  return memorySession;
}

/**
 * Sets session (useful for test environments or instant mocks)
 */
export function setSessionForTesting(sessionOrUser) {
  if (!sessionOrUser) {
    memorySession = null;
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const session = sessionOrUser.token
    ? sessionOrUser
    : {
        user: sessionOrUser,
        role: sessionOrUser.role,
        token: `mock-jwt-${sessionOrUser.id || sessionOrUser.role}-${Date.now()}`,
        loginTime: new Date().toISOString(),
      };
  memorySession = session;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {}
  }
  return session;
}

/**
 * Clears the active session
 */
export async function logout() {
  await simulateLatency(150, 300);
  memorySession = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
  return successResponse({ loggedOut: true });
}

/**
 * Dev tool helper to switch role immediately without credentials
 * @param {string} role
 */
export function switchRoleInstantly(role) {
  if (typeof window === "undefined") return null;
  const user = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0];
  const session = {
    user,
    role: user.role,
    token: `mock-jwt-${user.role}-${Date.now()}`,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export const authService = {
  login,
  registerStudent,
  changePassword,
  getCurrentSession,
  setSessionForTesting,
  logout,
  switchRoleInstantly,
};

export default authService;
