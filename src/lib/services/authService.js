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
  await simulateLatency(150, 300);

  const cleanId = (identifier || "").trim().toLowerCase();
  const cleanPass = (password || "").trim();

  // 1. Authenticate against MySQL Database
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass, role }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(json.data));
        return successResponse(json.data);
      }
      return errorResponse(json.code || "AUTH_FAILED", json.message || "Invalid credentials.");
    } catch (e) {
      console.warn("MySQL login request error:", e);
      return errorResponse("NETWORK_ERROR", "Could not connect to authentication service.");
    }
  }

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

  // In strict security mode, non-existent student accounts are rejected
  if (role === "student") {
    return errorResponse("AUTH_FAILED", "Account not found or not approved.");
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
 * Changes student or staff password backed by MySQL API
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {string} [confirmPassword]
 */
export async function changePassword(currentPassword, newPassword, confirmPassword = "") {
  if (!newPassword || newPassword.length < 8) {
    return errorResponse("INVALID_PASSWORD", "Password must be at least 8 characters long.");
  }

  const session = getCurrentSession();
  const studentId = session?.user?.studentId || session?.user?.id || session?.user?.email;

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-student-id": studentId || "",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword: confirmPassword || newPassword,
          studentId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        return errorResponse(data.code || "UPDATE_FAILED", data.message || "Failed to update password.");
      }

      // Update session in localStorage
      if (session?.user) {
        session.mustChangePassword = false;
        session.user.mustChangePassword = false;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("dmi_session_updated", { detail: session }));
      }

      return successResponse(data);
    } catch (err) {
      console.error("changePassword API error:", err);
      return errorResponse("NETWORK_ERROR", "Could not connect to authentication service.");
    }
  }

  return successResponse({ updated: true });
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
