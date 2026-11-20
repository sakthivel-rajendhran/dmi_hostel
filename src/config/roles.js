/**
 * DMI College Hostel Management PWA - Role Configuration
 * Single source of truth for all 6 discrete roles, shell selection, navigation rules and home routes.
 */

import { PERMISSIONS } from "./permissions.js";

export const ROLES = {
  STUDENT: "student",
  WARDEN: "warden",
  STAFF: "staff",
  HOD: "hod",
  PRINCIPAL: "principal",
  CORRESPONDENT: "correspondent",
};

export const ROLE_CONFIG = {
  [ROLES.STUDENT]: {
    key: "student",
    label: "Student Resident",
    title: "Hostel Resident",
    shell: "student",
    homeRoute: "/student/dashboard",
    accent: "indigo",
    accentColor: "#2B2FE0",
    loginMethod: "studentId",
    nav: [
      { label: "Home", href: "/student/dashboard", icon: "Home", permission: PERMISSIONS.PASS_VIEW_OWN },
      { label: "Apply Pass", href: "/student/apply", icon: "PlusCircle", permission: PERMISSIONS.PASS_APPLY },
      { label: "Scan Gate QR", href: "/student/scan", icon: "QrCode", permission: PERMISSIONS.PASS_VIEW_OWN },
      { label: "My Passes", href: "/student/passes", icon: "FileText", permission: PERMISSIONS.PASS_VIEW_OWN, badgeKey: "activePasses" },
      { label: "User Profile", href: "/student/profile", icon: "User", permission: PERMISSIONS.PROFILE_EDIT_OWN },
      { label: "Special Letters", href: "/student/letters", icon: "FileText", permission: PERMISSIONS.LETTERS_SUBMIT, featureFlag: "studentLetters" },
      { label: "Notifications", href: "/student/notifications", icon: "Bell", permission: PERMISSIONS.PASS_VIEW_OWN, badgeKey: "unreadNotifications" },
    ],
  },

  [ROLES.WARDEN]: {
    key: "warden",
    label: "Chief Warden",
    title: "Hostel Administration",
    shell: "dashboard",
    homeRoute: "/warden/dashboard",
    accent: "indigo",
    accentColor: "#2B2FE0",
    loginMethod: "gmail",
    nav: [
      { label: "Dashboard", href: "/warden/dashboard", icon: "LayoutDashboard", permission: PERMISSIONS.PASS_APPROVE },
      { label: "Approve Passes", href: "/warden/approvals", icon: "CheckSquare", permission: PERMISSIONS.PASS_APPROVE, badgeKey: "pendingApprovals" },
      { label: "Gate QR Posters", href: "/warden/gate-qr", icon: "QrCode", permission: PERMISSIONS.GATEQR_MANAGE },
      { label: "Gate Passes", href: "/warden/gate-passes", icon: "Ticket", permission: PERMISSIONS.PASS_ISSUE_GATE },
      { label: "Students", href: "/warden/students", icon: "Users", permission: PERMISSIONS.STUDENTS_VIEW_ALL },
      { label: "Staff Accounts", href: "/warden/staff-accounts", icon: "UserCog", permission: PERMISSIONS.STAFF_MANAGE },
      { label: "Rooms", href: "/warden/rooms", icon: "Bed", permission: PERMISSIONS.STUDENTS_MANAGE },
      { label: "Security Log", href: "/warden/security-log", icon: "ShieldAlert", permission: PERMISSIONS.SECURITY_LOG_VIEW },
      { label: "Announcements", href: "/warden/announcements", icon: "Megaphone", permission: PERMISSIONS.NOTIFICATIONS_SEND },
      { label: "Settings", href: "/warden/settings", icon: "Settings", permission: PERMISSIONS.STUDENTS_MANAGE },
    ],
  },

  [ROLES.STAFF]: {
    key: "staff",
    label: "Faculty Advisor",
    title: "Department Staff",
    shell: "dashboard",
    homeRoute: "/staff/dashboard",
    accent: "teal",
    accentColor: "#0D9488",
    loginMethod: "gmail",
    nav: [
      { label: "Dashboard", href: "/staff/dashboard", icon: "LayoutDashboard", permission: PERMISSIONS.PASS_RECOMMEND },
      { label: "Department Students", href: "/staff/students", icon: "Users", permission: PERMISSIONS.STUDENTS_VIEW_DEPT },
      { label: "Pass Requests", href: "/staff/requests", icon: "ClipboardCheck", permission: PERMISSIONS.PASS_RECOMMEND, badgeKey: "pendingRecommendations" },
      { label: "Profile", href: "/staff/profile", icon: "User", permission: PERMISSIONS.PROFILE_EDIT_OWN },
    ],
  },

  [ROLES.HOD]: {
    key: "hod",
    label: "Head of Department",
    title: "Academic Leadership",
    shell: "dashboard",
    homeRoute: "/hod/dashboard",
    accent: "violet",
    accentColor: "#7C3AED",
    loginMethod: "gmail",
    nav: [
      { label: "Dashboard", href: "/hod/dashboard", icon: "LayoutDashboard", permission: PERMISSIONS.PASS_RECOMMEND },
      { label: "Department Students", href: "/hod/students", icon: "Users", permission: PERMISSIONS.STUDENTS_VIEW_DEPT },
      { label: "Pass Requests", href: "/hod/requests", icon: "ClipboardCheck", permission: PERMISSIONS.PASS_RECOMMEND, badgeKey: "pendingRecommendations" },
      { label: "Analytics", href: "/hod/analytics", icon: "BarChart3", permission: PERMISSIONS.ANALYTICS_DEPT },
      { label: "Profile", href: "/hod/profile", icon: "User", permission: PERMISSIONS.PROFILE_EDIT_OWN },
    ],
  },

  [ROLES.PRINCIPAL]: {
    key: "principal",
    label: "College Principal",
    title: "Institutional Oversight",
    shell: "dashboard",
    homeRoute: "/principal/overview",
    accent: "gold-navy",
    accentColor: "#D97706",
    loginMethod: "gmail",
    nav: [
      { label: "Overview", href: "/principal/overview", icon: "LayoutDashboard", permission: PERMISSIONS.REPORTS_CAMPUS },
      { label: "Department Insights", href: "/principal/departments", icon: "TrendingUp", permission: PERMISSIONS.REPORTS_CAMPUS },
      { label: "Late Returns", href: "/principal/late-returns", icon: "AlertTriangle", permission: PERMISSIONS.REPORTS_CAMPUS, badgeKey: "lateCount" },
      { label: "Security Log", href: "/principal/security-log", icon: "Shield", permission: PERMISSIONS.SECURITY_LOG_VIEW },
      { label: "Letters", href: "/principal/letters", icon: "FileText", permission: PERMISSIONS.LETTERS_APPROVE, badgeKey: "pendingLetters", featureFlag: "studentLetters" },
      { label: "Profile", href: "/principal/profile", icon: "User", permission: PERMISSIONS.PROFILE_EDIT_OWN },
    ],
  },

  [ROLES.CORRESPONDENT]: {
    key: "correspondent",
    label: "Correspondent",
    title: "Executive Management",
    shell: "dashboard",
    homeRoute: "/correspondent/overview",
    accent: "gold-navy",
    accentColor: "#D97706",
    loginMethod: "gmail",
    nav: [
      { label: "Overview", href: "/correspondent/overview", icon: "LayoutDashboard", permission: PERMISSIONS.REPORTS_CAMPUS },
      { label: "Department Insights", href: "/correspondent/departments", icon: "TrendingUp", permission: PERMISSIONS.REPORTS_CAMPUS },
      { label: "Late Returns", href: "/correspondent/late-returns", icon: "AlertTriangle", permission: PERMISSIONS.REPORTS_CAMPUS, badgeKey: "lateCount" },
      { label: "Security Log", href: "/correspondent/security-log", icon: "Shield", permission: PERMISSIONS.SECURITY_LOG_VIEW },
      { label: "Letters", href: "/correspondent/letters", icon: "FileText", permission: PERMISSIONS.LETTERS_APPROVE, badgeKey: "pendingLetters", featureFlag: "studentLetters" },
      { label: "Profile", href: "/correspondent/profile", icon: "User", permission: PERMISSIONS.PROFILE_EDIT_OWN },
    ],
  },
};

/**
 * Get home route for a given role
 * @param {string} role
 * @returns {string}
 */
export function getHomeRoute(role) {
  const normalized = (role || "").toLowerCase();
  return ROLE_CONFIG[normalized]?.homeRoute || "/";
}

/**
 * Get navigation list for a given role
 * @param {string} role
 * @returns {Array}
 */
export function getNavForRole(role) {
  const normalized = (role || "").toLowerCase();
  return ROLE_CONFIG[normalized]?.nav || [];
}

/**
 * Get shell identifier for a role ('student' | 'dashboard' | 'kiosk')
 * @param {string} role
 * @returns {string}
 */
export function getShellForRole(role) {
  const normalized = (role || "").toLowerCase();
  return ROLE_CONFIG[normalized]?.shell || "dashboard";
}

export default ROLE_CONFIG;
