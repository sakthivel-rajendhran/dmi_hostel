/**
 * DMI College Hostel Management PWA - Permissions Matrix
 * Single source of truth for permission keys and role-based access control.
 * Strictly 6 discrete roles: student, warden, staff, hod, principal, correspondent.
 */

export const PERMISSIONS = {
  // Pass management
  PASS_APPLY: "pass.apply",
  PASS_VIEW_OWN: "pass.view.own",
  PASS_CANCEL_OWN: "pass.cancel.own",
  PASS_RECOMMEND: "pass.recommend",
  PASS_APPROVE: "pass.approve",
  PASS_ISSUE_GATE: "pass.issueGate",

  // Student management
  STUDENTS_VIEW_ALL: "students.view.all",
  STUDENTS_VIEW_DEPT: "students.view.dept",
  STUDENTS_MANAGE: "students.manage",
  STAFF_MANAGE: "staff.manage",

  // Reports and insights
  REPORTS_DEPT: "reports.dept",
  ANALYTICS_DEPT: "analytics.dept",
  REPORTS_CAMPUS: "reports.campus",
  REPORTS_EXPORT: "reports.export",

  // Security logs
  SECURITY_LOG_VIEW: "securityLog.view",
  SECURITY_LOG_EXPORT: "securityLog.export",
  SECURITY_LOG_WRITE: "securityLog.write",

  // Gate QR poster management (Warden only)
  GATEQR_MANAGE: "gateqr.manage",

  // Student letters (Optional Oversight module)
  LETTERS_SUBMIT: "letters.submit",
  LETTERS_APPROVE: "letters.approve",

  // Notifications & Announcements
  NOTIFICATIONS_SEND: "notifications.send",

  // Profile
  PROFILE_EDIT_OWN: "profile.edit.own",
};

export const ROLE_PERMISSIONS = {
  student: [
    PERMISSIONS.PASS_APPLY,
    PERMISSIONS.PASS_VIEW_OWN,
    PERMISSIONS.PASS_CANCEL_OWN,
    PERMISSIONS.LETTERS_SUBMIT,
    PERMISSIONS.PROFILE_EDIT_OWN,
  ],
  warden: [
    PERMISSIONS.PASS_APPROVE,
    PERMISSIONS.PASS_ISSUE_GATE,
    PERMISSIONS.GATEQR_MANAGE,
    PERMISSIONS.STUDENTS_VIEW_ALL,
    PERMISSIONS.STUDENTS_MANAGE,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.SECURITY_LOG_VIEW,
    PERMISSIONS.SECURITY_LOG_EXPORT,
    PERMISSIONS.SECURITY_LOG_WRITE,
    PERMISSIONS.REPORTS_CAMPUS,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.NOTIFICATIONS_SEND,
  ],
  staff: [
    PERMISSIONS.PASS_RECOMMEND,
    PERMISSIONS.STUDENTS_VIEW_DEPT,
    PERMISSIONS.REPORTS_DEPT,
    PERMISSIONS.PROFILE_EDIT_OWN,
  ],
  hod: [
    PERMISSIONS.PASS_RECOMMEND,
    PERMISSIONS.STUDENTS_VIEW_DEPT,
    PERMISSIONS.REPORTS_DEPT,
    PERMISSIONS.ANALYTICS_DEPT,
    PERMISSIONS.PROFILE_EDIT_OWN,
  ],
  principal: [
    PERMISSIONS.REPORTS_CAMPUS,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SECURITY_LOG_VIEW,
    PERMISSIONS.SECURITY_LOG_EXPORT,
    PERMISSIONS.LETTERS_APPROVE,
    PERMISSIONS.PROFILE_EDIT_OWN,
  ],
  correspondent: [
    PERMISSIONS.REPORTS_CAMPUS,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SECURITY_LOG_VIEW,
    PERMISSIONS.SECURITY_LOG_EXPORT,
    PERMISSIONS.LETTERS_APPROVE,
    PERMISSIONS.PROFILE_EDIT_OWN,
  ],
};

/**
 * Check if a user/role possesses a specific permission
 * @param {object|string} userOrRole - User object containing .role or string role name
 * @param {string} permission - Permission key
 * @returns {boolean}
 */
export function can(userOrRole, permission) {
  if (!userOrRole || !permission) return false;
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

/**
 * Check if a user/role has at least one of the given permissions
 * @param {object|string} userOrRole
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function canAny(userOrRole, permissions = []) {
  return permissions.some((p) => can(userOrRole, p));
}

/**
 * Check if a user/role has all of the given permissions
 * @param {object|string} userOrRole
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function canAll(userOrRole, permissions = []) {
  return permissions.every((p) => can(userOrRole, p));
}

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  canAny,
  canAll,
};
