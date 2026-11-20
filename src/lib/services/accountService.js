/**
 * Account Management Service
 * Handles administrative lifecycle of Staff, HOD, Principal, and Correspondent accounts.
 * Accessible strictly by Chief Warden (permission: staff.manage).
 */

import { STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { MOCK_USERS } from "@/lib/mock/users.js";
import { ROLES } from "@/config/roles.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { simulateLatency, successResponse, errorResponse, paginate } from "./base.js";
import { getCurrentSession } from "./authService.js";
import { toTitleCase } from "@/lib/utils/string.js";

const AUDIT_STORAGE_KEY = "dmi_staff_accounts_audit_v2";

/**
 * Returns initial seeded audit logs
 */
function getInitialAuditLogs() {
  return [
    {
      id: "AUD-STAFF-001",
      action: "CREATE_ACCOUNT",
      actor: "Dr. John Xavier",
      actorRole: "warden",
      targetId: "STAFF-001",
      targetName: "Prof. Rajesh Sharma",
      targetRole: "staff",
      details: "Created Faculty Advisor account for CSE Year 3",
      timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
    },
    {
      id: "AUD-STAFF-002",
      action: "ASSIGN_YEARS",
      actor: "Dr. John Xavier",
      actorRole: "warden",
      targetId: "STAFF-002",
      targetName: "Prof. Anand Kumar",
      targetRole: "staff",
      details: "Updated assigned cohorts to Years 1, 2",
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
    {
      id: "AUD-STAFF-003",
      action: "CREATE_ACCOUNT",
      actor: "Dr. John Xavier",
      actorRole: "warden",
      targetId: "HOD-CSE-01",
      targetName: "Dr. Meenakshi Sundaram",
      targetRole: "hod",
      details: "Created HOD account for Computer Science & Engineering",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  ];
}

/**
 * Records an account mutation audit event
 */
function recordAuditEntry(action, target, details) {
  const session = getCurrentSession();
  const actorName = session?.user?.name || "Chief Warden";
  const actorRole = session?.user?.role || "warden";

  const logs = getPersistentMock(AUDIT_STORAGE_KEY, getInitialAuditLogs());
  const entry = {
    id: `AUD-STAFF-${String(logs.length + 1).padStart(3, "0")}`,
    action,
    actor: actorName,
    actorRole,
    targetId: target.id,
    targetName: target.name,
    targetRole: target.role,
    details,
    timestamp: new Date().toISOString(),
  };

  const updated = [entry, ...logs];
  setPersistentMock(AUDIT_STORAGE_KEY, updated);

  // Also dispatch intra-tab event for live UI reactivity
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dmi-account-audit", { detail: entry }));
  }
  return entry;
}

/**
 * Generates a secure temporary password
 * Format: DMI-Temp#<Year>-<4-alphanumeric>
 * @returns {string}
 */
export function generateTemporaryPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DMI-Temp#2026-${suffix}`;
}

/**
 * List institutional staff/executive accounts
 * @param {object} [params]
 * @param {string} [params.role]
 * @param {string} [params.department]
 * @param {string} [params.status]
 * @param {string} [params.search]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<{ ok: boolean, data?: { items: Array, total: number, page: number, totalPages: number, stats: object }, error?: string }>}
 */
export async function list(params = {}) {
  await simulateLatency(200, 450);
  // TODO(BACKEND): replace with Supabase query `supabase.from('profiles').select('*, staff_members(*)').neq('role', 'student')`

  const {
    role = "all",
    department = "all",
    status = "all",
    search = "",
    page = 1,
    limit = 10,
  } = params;

  let allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);

  // Exclude student residents and soft-deleted accounts
  let staffList = allUsers.filter(
    (u) =>
      u.role !== ROLES.STUDENT &&
      !u.isDeleted &&
      [ROLES.STAFF, ROLES.HOD, ROLES.PRINCIPAL, ROLES.CORRESPONDENT, ROLES.WARDEN].includes(u.role)
  );

  // Ensure default status if unset
  staffList = staffList.map((u) => {
    let currentStatus = u.status;
    if (!currentStatus) {
      if (u.disabled) currentStatus = "Disabled";
      else if (u.mustChangePassword) currentStatus = "Password change pending";
      else currentStatus = "Active";
    }
    return {
      ...u,
      status: currentStatus,
      lastLogin: u.lastLogin || new Date(Date.now() - (u.id.length * 12 + 5) * 3600000).toISOString(),
    };
  });

  // Filters
  if (role !== "all") {
    staffList = staffList.filter((u) => u.role === role);
  }

  if (department !== "all") {
    staffList = staffList.filter((u) => u.dept === department || u.department === department);
  }

  if (status !== "all") {
    staffList = staffList.filter((u) => u.status === status);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    staffList = staffList.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.gmail && u.gmail.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.dept && u.dept.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q))
    );
  }

  const stats = {
    total: staffList.length,
    active: staffList.filter((u) => u.status === "Active").length,
    disabled: staffList.filter((u) => u.status === "Disabled").length,
    pending: staffList.filter((u) => u.status === "Password change pending" || u.status === "Invited").length,
  };

  const paginated = paginate(staffList, page, limit);

  return successResponse({
    items: paginated.items,
    total: paginated.total,
    page: paginated.page,
    totalPages: paginated.totalPages,
    stats,
  });
}

/**
 * Creates a new staff or executive account
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.gmail
 * @param {string} payload.role
 * @param {string} [payload.department]
 * @param {number[]} [payload.assignedYears]
 * @param {string} [payload.designation]
 * @param {string} [payload.phone]
 * @returns {Promise<{ ok: boolean, data?: { account: object, tempPassword: string }, error?: string }>}
 */
export async function create(payload) {
  await simulateLatency(400, 750);
  // TODO(BACKEND): replace with Supabase Admin API `supabase.auth.admin.createUser({ email, password, user_metadata })`

  const {
    name,
    gmail,
    role,
    department,
    assignedYears = [],
    designation = "",
    phone = "",
  } = payload;

  if (!name || name.trim().length < 3) {
    return errorResponse("VALIDATION_FAILED", "Full name must be at least 3 characters.");
  }

  if (!gmail || !gmail.endsWith("@gmail.com")) {
    return errorResponse("VALIDATION_FAILED", "Valid personal Gmail address (@gmail.com) is required.");
  }

  if (!role || ![ROLES.STAFF, ROLES.HOD, ROLES.PRINCIPAL, ROLES.CORRESPONDENT].includes(role)) {
    return errorResponse("VALIDATION_FAILED", "Invalid account role selected.");
  }

  if ([ROLES.STAFF, ROLES.HOD].includes(role) && !department) {
    return errorResponse("VALIDATION_FAILED", "Department is mandatory for Staff and HOD accounts.");
  }

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const cleanGmail = gmail.trim().toLowerCase();

  // Rule 1: Email uniqueness
  if (allUsers.some((u) => !u.isDeleted && (u.gmail?.toLowerCase() === cleanGmail || u.email?.toLowerCase() === cleanGmail))) {
    return errorResponse("EMAIL_EXISTS", `An account with Gmail '${cleanGmail}' already exists in the system.`);
  }

  // Rule 2: Single HOD per department
  if (role === ROLES.HOD) {
    const existingHod = allUsers.find(
      (u) => !u.isDeleted && u.role === ROLES.HOD && (u.dept === department || u.department === department)
    );
    if (existingHod) {
      return errorResponse(
        "HOD_EXISTS",
        `An active HOD (${existingHod.name}) already chairs the ${department} department. Only one HOD per department is allowed.`
      );
    }
  }

  // Rule 3: Single Principal
  if (role === ROLES.PRINCIPAL) {
    const existingPrincipal = allUsers.find((u) => !u.isDeleted && u.role === ROLES.PRINCIPAL);
    if (existingPrincipal) {
      return errorResponse(
        "PRINCIPAL_EXISTS",
        `A Principal account (${existingPrincipal.name}) already exists. Institutional policy permits only one Principal account.`
      );
    }
  }

  // Rule 4: Single Correspondent
  if (role === ROLES.CORRESPONDENT) {
    const existingCorr = allUsers.find((u) => !u.isDeleted && u.role === ROLES.CORRESPONDENT);
    if (existingCorr) {
      return errorResponse(
        "CORRESPONDENT_EXISTS",
        `A Correspondent account (${existingCorr.name}) already exists. Institutional policy permits only one Correspondent account.`
      );
    }
  }

  const tempPassword = generateTemporaryPassword();
  const titleName = toTitleCase(name.trim());
  const formattedPhone = phone ? (phone.startsWith("+91") ? phone : `+91 ${phone.replace(/\D/g, "")}`) : "";

  // Compute initials avatar
  const initials = titleName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const idPrefix = role === ROLES.HOD ? `HOD-${department}` : role === ROLES.STAFF ? "STAFF" : role.toUpperCase();
  const newAccount = {
    id: `${idPrefix}-${Date.now().toString().slice(-4)}`,
    name: titleName,
    gmail: cleanGmail,
    email: `${cleanGmail.split("@")[0]}@dmice.ac.in`,
    role,
    dept: department || "General",
    department: department || "General",
    departmentName: department ? `${department} Department` : "Institutional Administration",
    designation: designation || (role === ROLES.HOD ? `Head of the Department, ${department}` : role === ROLES.STAFF ? "Faculty Advisor" : toTitleCase(role)),
    phone: formattedPhone,
    avatar: initials,
    photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(titleName)}`,
    photoDataUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(titleName)}`,
    assignedYears: role === ROLES.STAFF ? (Array.isArray(assignedYears) ? assignedYears.map(Number) : []) : [],
    status: "Password change pending",
    mustChangePassword: true,
    tempPassword,
    password: tempPassword,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  const updatedUsers = [newAccount, ...allUsers];
  setPersistentMock(STORAGE_KEYS.USERS, updatedUsers);

  // Record Audit Entry
  recordAuditEntry("CREATE_ACCOUNT", newAccount, `Created ${newAccount.role.toUpperCase()} account for ${newAccount.name} (${newAccount.dept || "Campus"})`);

  return successResponse({
    account: newAccount,
    tempPassword,
  });
}

/**
 * Updates staff account profile or coordinates
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function update(id, patch = {}) {
  await simulateLatency(250, 500);
  // TODO(BACKEND): replace with Supabase update `supabase.from('profiles').update(patch).eq('id', id)`

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const index = allUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return errorResponse("NOT_FOUND", "Account not found.");
  }

  const target = allUsers[index];
  const updated = {
    ...target,
    ...patch,
    name: patch.name ? toTitleCase(patch.name.trim()) : target.name,
    assignedYears: patch.assignedYears !== undefined ? patch.assignedYears.map(Number) : target.assignedYears,
    updatedAt: new Date().toISOString(),
  };

  allUsers[index] = updated;
  setPersistentMock(STORAGE_KEYS.USERS, allUsers);

  recordAuditEntry("UPDATE_DETAILS", updated, `Updated details for ${updated.name}`);
  return successResponse(updated);
}

/**
 * Generates a new temporary password and flags account to force password change
 * @param {string} id
 * @returns {Promise<{ ok: boolean, data?: { tempPassword: string }, error?: string }>}
 */
export async function resetPassword(id) {
  await simulateLatency(300, 600);
  // TODO(BACKEND): replace with Supabase Admin reset password / invite email

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const index = allUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return errorResponse("NOT_FOUND", "Account not found.");
  }

  const tempPassword = generateTemporaryPassword();
  const target = allUsers[index];

  allUsers[index] = {
    ...target,
    mustChangePassword: true,
    status: "Password change pending",
    password: tempPassword,
    tempPassword,
    updatedAt: new Date().toISOString(),
  };

  setPersistentMock(STORAGE_KEYS.USERS, allUsers);

  recordAuditEntry("RESET_PASSWORD", target, `Reset password with temporary credentials for ${target.name}`);
  return successResponse({ tempPassword });
}

/**
 * Disables a staff or executive account
 * @param {string} id
 * @param {string} reason
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function disable(id, reason) {
  await simulateLatency(250, 500);
  // TODO(BACKEND): replace with Supabase `supabase.auth.admin.updateUserById(id, { ban_duration: 'infinite' })`

  if (!reason || reason.trim().length < 5) {
    return errorResponse("VALIDATION_FAILED", "A specific reason (minimum 5 characters) is required to disable an account.");
  }

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const index = allUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return errorResponse("NOT_FOUND", "Account not found.");
  }

  const target = allUsers[index];
  allUsers[index] = {
    ...target,
    status: "Disabled",
    disabled: true,
    disabledReason: reason.trim(),
    disabledAt: new Date().toISOString(),
  };

  setPersistentMock(STORAGE_KEYS.USERS, allUsers);

  recordAuditEntry("DISABLE_ACCOUNT", target, `Disabled account: ${reason.trim()}`);
  return successResponse(allUsers[index]);
}

/**
 * Enables a disabled account
 * @param {string} id
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function enable(id) {
  await simulateLatency(250, 500);
  // TODO(BACKEND): replace with Supabase `supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })`

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const index = allUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return errorResponse("NOT_FOUND", "Account not found.");
  }

  const target = allUsers[index];
  allUsers[index] = {
    ...target,
    status: target.mustChangePassword ? "Password change pending" : "Active",
    disabled: false,
    disabledReason: null,
    disabledAt: null,
  };

  setPersistentMock(STORAGE_KEYS.USERS, allUsers);

  recordAuditEntry("ENABLE_ACCOUNT", target, `Re-enabled account for ${target.name}`);
  return successResponse(allUsers[index]);
}

/**
 * Removes (soft deletes) an account after checking for pending recommendations
 * @param {string} id
 * @returns {Promise<{ ok: boolean, data?: object, error?: string, pendingCount?: number }>}
 */
export async function remove(id) {
  await simulateLatency(300, 600);
  // TODO(BACKEND): replace with transactional RPC checking foreign key constraints on passes

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const index = allUsers.findIndex((u) => u.id === id);

  if (index === -1) {
    return errorResponse("NOT_FOUND", "Account not found.");
  }

  const target = allUsers[index];

  // Check if staff has pending pass recommendations
  const allPasses = getPersistentMock(STORAGE_KEYS.PASSES, []);
  const pendingItems = allPasses.filter(
    (p) =>
      p.status === "pending" &&
      p.department === target.dept &&
      (!target.assignedYears?.length || target.assignedYears.includes(Number(p.year)))
  );

  if (pendingItems.length > 0) {
    return {
      ok: false,
      error: `Cannot remove ${target.name}. There are ${pendingItems.length} active pass request(s) awaiting recommendation in this advisor's cohort. Reassign pending requests first.`,
      code: "PENDING_ITEMS_EXIST",
      pendingCount: pendingItems.length,
    };
  }

  allUsers[index] = {
    ...target,
    isDeleted: true,
    status: "Deleted",
    deletedAt: new Date().toISOString(),
  };

  setPersistentMock(STORAGE_KEYS.USERS, allUsers);

  recordAuditEntry("REMOVE_ACCOUNT", target, `Soft deleted account for ${target.name}`);
  return successResponse({ deleted: true, id });
}

/**
 * Reassigns pending pass recommendations from one staff member to another
 * @param {string} fromUserId
 * @param {string} toUserId
 * @returns {Promise<{ ok: boolean, data?: { reassignedCount: number }, error?: string }>}
 */
export async function reassignPending(fromUserId, toUserId) {
  await simulateLatency(300, 600);
  // TODO(BACKEND): replace with transactional RPC `supabase.rpc('reassign_staff_recommendations', { from_id, to_id })`

  const allUsers = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const fromUser = allUsers.find((u) => u.id === fromUserId);
  const toUser = allUsers.find((u) => u.id === toUserId);

  if (!fromUser || !toUser) {
    return errorResponse("NOT_FOUND", "Specified staff account not found.");
  }

  const allPasses = getPersistentMock(STORAGE_KEYS.PASSES, []);
  let count = 0;

  const updatedPasses = allPasses.map((p) => {
    if (
      p.status === "pending" &&
      p.department === fromUser.dept &&
      (!fromUser.assignedYears?.length || fromUser.assignedYears.includes(Number(p.year)))
    ) {
      count++;
      return {
        ...p,
        reassignedTo: toUser.id,
        reassignedAdvisorName: toUser.name,
      };
    }
    return p;
  });

  setPersistentMock(STORAGE_KEYS.PASSES, updatedPasses);

  recordAuditEntry(
    "REASSIGN_PENDING",
    fromUser,
    `Reassigned ${count} pending pass recommendations from ${fromUser.name} to ${toUser.name}`
  );

  return successResponse({ reassignedCount: count });
}

/**
 * Retrieves recent account change audit logs
 * @param {number} [limit=20]
 * @returns {Promise<{ ok: boolean, data: Array }>}
 */
export async function getAuditLog(limit = 20) {
  await simulateLatency(150, 300);
  const logs = getPersistentMock(AUDIT_STORAGE_KEY, getInitialAuditLogs());
  return successResponse(logs.slice(0, limit));
}

export const accountService = {
  list,
  create,
  update,
  resetPassword,
  disable,
  enable,
  remove,
  reassignPending,
  getAuditLog,
  generateTemporaryPassword,
};

export default accountService;
