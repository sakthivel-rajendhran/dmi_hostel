/**
 * Outpass Service
 * Manages outpass application, recommendation, approval, QR generation and status lifecycle.
 */

import { MOCK_PASSES, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { MOCK_USERS } from "@/lib/mock/users.js";
import { PASS_STATUSES } from "@/config/status.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { ROLES } from "@/config/roles.js";
import { simulateLatency, successResponse, errorResponse, paginate } from "./base.js";
import { getCurrentSession } from "./authService.js";
import { getPolicy } from "./settingsService.js";
import { isLetterSatisfied } from "./letterService.js";

/**
 * List passes with filtering, search and pagination
 * @param {object} [params]
 */
export async function listPasses({ page = 1, pageSize = 20, studentId = "", status = "", type = "", search = "", sort = "newest" } = {}) {
  await simulateLatency(150, 300);
  // TODO(BACKEND): replace with Supabase call `supabase.from('passes').select('*', { count: 'exact' })...`
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  let filtered = [...passes];

  if (studentId) {
    filtered = filtered.filter((p) => p.studentId === studentId);
  }

  if (status && status !== "all") {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (type && type !== "all") {
    filtered = filtered.filter((p) => {
      const pType = (p.type || "").toLowerCase();
      const target = type.toLowerCase();
      return pType.includes(target);
    });
  }

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.passNumber && p.passNumber.toLowerCase().includes(q)) ||
        (p.destination && p.destination.toLowerCase().includes(q)) ||
        p.studentName.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const timeA = new Date(a.fromTime || a.departureTime || a.appliedAt).getTime();
    const timeB = new Date(b.fromTime || b.departureTime || b.appliedAt).getTime();
    return sort === "oldest" ? timeA - timeB : timeB - timeA;
  });

  const paginationMeta = paginate(filtered, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
  });
}

/**
 * Retrieve pass by unique ID
 * @param {string} passId
 */
export async function getPassById(passId) {
  await simulateLatency(150, 300);
  // TODO(BACKEND): replace with Supabase call `supabase.from('passes').select('*').eq('id', passId).single()`
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const found = passes.find((p) => p.id === passId || p.passNumber === passId);
  if (!found) {
    return errorResponse("NOT_FOUND", "Outpass record not found.");
  }
  return successResponse(found);
}

/**
 * Check eligibility for student pass application
 * Validates:
 * 1. No overdue passes
 * 2. No overlapping active/pending passes
 * 3. Local pass curfew (must return by 9:00 PM on same day)
 * 4. Home pass max duration (<= 15 days)
 * 5. Monthly Home Pass limit (<= 2 per month)
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.type
 * @param {string|Date} params.from
 * @param {string|Date} params.to
 * @returns {Promise<{ ok: boolean, data: { eligible: boolean, reasons: string[] } }>}
 */
export async function checkEligibility({ studentId, type = "Local Pass", from, to }) {
  await simulateLatency(100, 200);
  // TODO(BACKEND): replace with Supabase RPC `supabase.rpc('check_pass_eligibility', { student_id, type, from_time, to_time })`
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const studentPasses = passes.filter((p) => p.studentId === studentId);

  const reasons = [];

  // 1. Overdue Check
  const hasOverdue = studentPasses.some((p) => p.status === PASS_STATUSES.OVERDUE);
  if (hasOverdue) {
    reasons.push("Clear your overdue pass first. Report to the hostel warden immediately.");
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  if (fromDate && toDate) {
    const fromTimeMs = fromDate.getTime();
    const toTimeMs = toDate.getTime();

    if (toTimeMs <= fromTimeMs) {
      reasons.push("Return time must be later than departure time.");
    }

    // 2. Overlap Check with active or pending passes
    const activeStatuses = [
      PASS_STATUSES.PENDING,
      PASS_STATUSES.RECOMMENDED,
      PASS_STATUSES.APPROVED,
      PASS_STATUSES.GATE_PASS_ISSUED,
      PASS_STATUSES.OUT,
    ];

    const hasOverlap = studentPasses.some((p) => {
      if (!activeStatuses.includes(p.status)) return false;
      const pFrom = new Date(p.fromTime || p.departureTime).getTime();
      const pTo = new Date(p.toTime || p.expectedReturnTime).getTime();
      // Overlaps if (StartA <= EndB) and (EndA >= StartB)
      return fromTimeMs < pTo && toTimeMs > pFrom;
    });

    if (hasOverlap) {
      reasons.push("You already have an active or pending pass for an overlapping time window.");
    }

    // 3. Local Pass Specific Checks
    const isLocal = (type || "").toLowerCase().includes("local");
    if (isLocal) {
      // Must be same day
      const isSameDay =
        fromDate.getFullYear() === toDate.getFullYear() &&
        fromDate.getMonth() === toDate.getMonth() &&
        fromDate.getDate() === toDate.getDate();

      if (!isSameDay) {
        reasons.push("Local passes must be completed on the same day.");
      }

      // Latest return time: WORKFLOW_CONFIG.localPassLatestReturnTime (e.g. 21:00)
      const [cutoffH, cutoffM] = (WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00").split(":").map(Number);
      const cutoffTime = new Date(toDate);
      cutoffTime.setHours(cutoffH, cutoffM, 0, 0);

      if (toDate.getTime() > cutoffTime.getTime()) {
        reasons.push(`Local passes must return by ${WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"} (9:00 PM).`);
      }
    } else {
      // 4. Home Pass Specific Checks
      // Max days: WORKFLOW_CONFIG.maxHomePassDays (15 days)
      const durationDays = (toTimeMs - fromTimeMs) / (1000 * 60 * 60 * 24);
      const maxDays = WORKFLOW_CONFIG.maxHomePassDays || 15;
      if (durationDays > maxDays) {
        reasons.push(`Home passes cannot exceed ${maxDays} days duration.`);
      }

      // Monthly limit: count Home Passes for student in this month that are not rejected or cancelled
      const targetMonth = fromDate.getMonth();
      const targetYear = fromDate.getFullYear();
      const homePassesThisMonth = studentPasses.filter((p) => {
        const pType = (p.type || "").toLowerCase();
        if (!pType.includes("home")) return false;
        if (p.status === PASS_STATUSES.REJECTED || p.status === PASS_STATUSES.CANCELLED) return false;
        const pDate = new Date(p.fromTime || p.departureTime || p.appliedAt);
        return pDate.getMonth() === targetMonth && pDate.getFullYear() === targetYear;
      });

      const maxMonthly = WORKFLOW_CONFIG.maxHomePassesPerMonth || 2;
      if (homePassesThisMonth.length >= maxMonthly) {
        reasons.push(`Monthly Home Pass limit reached (maximum ${maxMonthly} home passes per calendar month).`);
      }
    }
  }

  const eligible = reasons.length === 0;
  return successResponse({
    eligible,
    reasons,
  });
}

/**
 * Apply for a new outpass
 * @param {object} passData
 */
export async function applyPass(passData) {
  await simulateLatency(400, 600);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  const policy = getPolicy();
  // Check letter requirement if enabled
  if (policy.studentLetters?.enabled && policy.studentLetters?.letterApprovalRequired) {
    const isHomePass = (passData.type || "").toLowerCase().includes("home");
    const dep = new Date(passData.fromTime || passData.departureTime || Date.now());
    const ret = new Date(passData.toTime || passData.expectedReturnTime || Date.now());
    const days = Math.max(1, Math.round((ret - dep) / (1000 * 60 * 60 * 24)));
    const threshold = policy.studentLetters.requiredHomeDays || 7;

    if (isHomePass && days > threshold) {
      if (!passData.letterId) {
        return errorResponse(
          "LETTER_REQUIRED",
          `Home passes exceeding ${threshold} days require an approved special permission letter from Principal or Correspondent.`
        );
      }
      const check = isLetterSatisfied({ letterId: passData.letterId });
      if (!check.satisfied) {
        return errorResponse(
          "LETTER_REQUIRED",
          `Attached letter is not yet approved: ${check.reason}`
        );
      }
    }
  }

  // TODO(BACKEND): replace with Supabase call `supabase.from('passes').insert([newPass])`
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const passIdx = passes.length + 1;
  const passId = `DMI-PASS-2026-${String(passIdx).padStart(4, "0")}`;
  const passNumber = `PASS-2026-${String(passIdx).padStart(4, "0")}`;

  const nowIso = new Date().toISOString();
  const rawPass = {
    ...passData,
    id: passId,
    passNumber,
    status: PASS_STATUSES.PENDING,
    appliedAt: nowIso,
    departureTime: passData.fromTime || passData.departureTime || nowIso,
    expectedReturnTime: passData.toTime || passData.expectedReturnTime || nowIso,
    letterId: passData.letterId || null,
    timeline: [
      {
        status: "applied",
        label: "Pass Request Submitted",
        timestamp: nowIso,
        actor: passData.studentName || "Resident",
        note: passData.reason || "Standard student request",
      },
    ],
  };

  const newPass = {
    ...rawPass,
  };

  const updated = [newPass, ...passes];
  setPersistentMock(STORAGE_KEYS.PASSES, updated);
  return successResponse(newPass);
}

/**
 * Recommend a pass (Academic Staff / HOD)
 */
export async function recommendPass(passId, actorName = "Prof. Rajesh Sharma (Faculty Advisor)", note = "Academic standing verified and cleared.") {
  await simulateLatency(300, 500);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  return updatePassStatus(passId, PASS_STATUSES.RECOMMENDED, actorName, note);
}

/**
 * Approve a pass (Warden)
 */
export async function approvePass(passId, actorName = "Dr. John Xavier (Chief Warden)", note = "Outpass approved for campus exit.") {
  await simulateLatency(300, 500);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const pass = passes.find((p) => p.id === passId || p.passNumber === passId);
  if (!pass) return errorResponse("NOT_FOUND", "Pass not found.");

  const policy = getPolicy();
  if (policy.requireStaffRecommendation) {
    const hasRecommend = (pass.recommendations || []).some((r) => r.verdict === "recommend");
    if (!hasRecommend) {
      return errorResponse(
        "RECOMMENDATION_REQUIRED",
        "Warden cannot approve: Staff or HOD recommendation is required before approval."
      );
    }
  }

  // Check letter requirement if enabled
  if (policy.studentLetters?.enabled && policy.studentLetters?.letterApprovalRequired) {
    const isHomePass = (pass.type || "").toLowerCase().includes("home");
    const dep = new Date(pass.departureTime || pass.fromTime || Date.now());
    const ret = new Date(pass.expectedReturnTime || pass.toTime || Date.now());
    const days = Math.max(1, Math.round((ret - dep) / (1000 * 60 * 60 * 24)));
    const threshold = policy.studentLetters.requiredHomeDays || 7;

    if (isHomePass && days > threshold) {
      const check = isLetterSatisfied({ passId: pass.id, letterId: pass.letterId });
      if (!check.satisfied) {
        return errorResponse(
          "LETTER_REQUIRED",
          `Warden cannot approve: An approved Principal/Correspondent letter is required for this extended pass (${check.reason}).`
        );
      }
    }
  }

  return updatePassStatus(passId, PASS_STATUSES.APPROVED, actorName, note);
}

/**
 * Reject a pass with reason
 */
export async function rejectPass(passId, actorName = "Dr. John Xavier (Chief Warden)", reason = "Curfew restriction during assessment period.") {
  await simulateLatency(300, 500);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  return updatePassStatus(passId, PASS_STATUSES.REJECTED, actorName, reason);
}

/**
 * Issue Digital Gate Pass (QR)
 */
export async function issueGatePass(passId) {
  await simulateLatency(300, 500);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  return updatePassStatus(passId, PASS_STATUSES.GATE_PASS_ISSUED, "Hostel Gate Pass Authority", "Digital QR gate pass issued for scanner.");
}

/**
 * Cancel an outpass
 */
export async function cancelPass(passId, reason = "Cancelled by student") {
  await simulateLatency(250, 450);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  return updatePassStatus(passId, PASS_STATUSES.CANCELLED, "Resident", reason);
}

/**
 * Advance pass status (for testing and DevPanel lifecycle cycling)
 * Transitions: pending -> recommended -> approved -> gate_pass_issued -> out -> returned
 * @param {string} passId
 * @param {string} [targetStatus]
 */
export async function advancePassStatus(passId, targetStatus) {
  await simulateLatency(250, 400);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const pass = passes.find((p) => p.id === passId || p.passNumber === passId);
  if (!pass) return errorResponse("NOT_FOUND", "Pass not found.");

  const sequence = [
    PASS_STATUSES.PENDING,
    PASS_STATUSES.RECOMMENDED,
    PASS_STATUSES.APPROVED,
    PASS_STATUSES.GATE_PASS_ISSUED,
    PASS_STATUSES.OUT,
    PASS_STATUSES.RETURNED,
  ];

  let nextStatus = targetStatus;
  if (!nextStatus) {
    const curIdx = sequence.indexOf(pass.status);
    if (curIdx >= 0 && curIdx < sequence.length - 1) {
      nextStatus = sequence[curIdx + 1];
    } else {
      nextStatus = PASS_STATUSES.GATE_PASS_ISSUED;
    }
  }

  const actorMap = {
    [PASS_STATUSES.RECOMMENDED]: "Prof. Rajesh Sharma (Faculty Advisor)",
    [PASS_STATUSES.APPROVED]: "Dr. John Xavier (Chief Warden)",
    [PASS_STATUSES.GATE_PASS_ISSUED]: "Gate Pass Authority",
    [PASS_STATUSES.OUT]: "Security Officer Sundaram (Gate 1)",
    [PASS_STATUSES.RETURNED]: "Security Officer Sundaram (Gate 1)",
    [PASS_STATUSES.OVERDUE]: "System Automated Monitor",
  };

  const noteMap = {
    [PASS_STATUSES.RECOMMENDED]: "Recommended after academic review",
    [PASS_STATUSES.APPROVED]: "Approved for scheduled exit",
    [PASS_STATUSES.GATE_PASS_ISSUED]: "Gate QR token activated",
    [PASS_STATUSES.OUT]: "Resident exited through Gate 1",
    [PASS_STATUSES.RETURNED]: "Resident returned and scanned in",
    [PASS_STATUSES.OVERDUE]: "Expected return curfew elapsed",
  };

  return updatePassStatus(passId, nextStatus, actorMap[nextStatus] || "Hostel Authority", noteMap[nextStatus] || `Advanced to ${nextStatus}`);
}

/**
 * Internal helper to update status and append timeline entry
 */
function updatePassStatus(passId, newStatus, actor, note) {
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const index = passes.findIndex((p) => p.id === passId || p.passNumber === passId);
  if (index === -1) {
    return errorResponse("NOT_FOUND", "Pass not found.");
  }

  const pass = passes[index];
  const nowIso = new Date().toISOString();

  const updatedTimeline = [
    ...(pass.timeline || []),
    {
      status: newStatus,
      label: `Status: ${newStatus.replace(/_/g, " ").toUpperCase()}`,
      timestamp: nowIso,
      actor: actor || "Authority",
      note: note || "",
    },
  ];

  const updatedPass = {
    ...pass,
    status: newStatus,
    timeline: updatedTimeline,
    updatedAt: nowIso,
    actualExitTime: newStatus === PASS_STATUSES.OUT ? nowIso : pass.actualExitTime,
    actualReturnTime: newStatus === PASS_STATUSES.RETURNED ? nowIso : pass.actualReturnTime,
    wardenReason: newStatus === PASS_STATUSES.REJECTED ? note : pass.wardenReason,
  };

  passes[index] = updatedPass;
  setPersistentMock(STORAGE_KEYS.PASSES, passes);
  return successResponse(updatedPass);
}

/**
 * Get pass history for a specific student sorted newest first
 * @param {string} studentId
 */
export async function getPassHistory(studentId) {
  await simulateLatency(150, 300);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const history = passes
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => new Date(b.fromTime || b.departureTime || b.appliedAt) - new Date(a.fromTime || a.departureTime || a.appliedAt));
  return successResponse(history);
}

/**
 * Get aggregate pass statistics
 */
export async function getPassStats() {
  await simulateLatency(200, 400);
  // TODO(BACKEND): replace with Supabase RPC `supabase.rpc('get_pass_dashboard_stats')`
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  return successResponse({
    total: passes.length,
    pending: passes.filter((p) => p.status === PASS_STATUSES.PENDING).length,
    recommended: passes.filter((p) => p.status === PASS_STATUSES.RECOMMENDED).length,
    approved: passes.filter((p) => p.status === PASS_STATUSES.APPROVED).length,
    gatePassIssued: passes.filter((p) => p.status === PASS_STATUSES.GATE_PASS_ISSUED).length,
    currentlyOut: passes.filter((p) => p.status === PASS_STATUSES.OUT).length,
    overdue: passes.filter((p) => p.status === PASS_STATUSES.OVERDUE).length,
    returned: passes.filter((p) => p.status === PASS_STATUSES.RETURNED).length,
  });
}

/**
 * Helper to get current staff or hod user from session or fallback
 */
function getActiveStaffOrHod() {
  const session = getCurrentSession();
  if (session?.user && (session.user.role === ROLES.STAFF || session.user.role === ROLES.HOD)) {
    return session.user;
  }
  // Fallback demo user
  return MOCK_USERS.find((u) => u.role === ROLES.STAFF) || MOCK_USERS[3];
}

/**
 * List passes scoped strictly to department and staff assigned years
 * @param {object} params
 */
export async function listForDepartment({ filters = {}, page = 1, pageSize = 20 } = {}) {
  await simulateLatency(150, 300);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";
  const isStaff = user.role === ROLES.STAFF;
  const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Department & Year scoping
  let filtered = passes.filter((p) => {
    const passDept = p.department || p.dept || "";
    if (passDept !== dept) return false;
    if (isStaff && assignedYears.length > 0) {
      return assignedYears.includes(Number(p.year));
    }
    return true;
  });

  // Tab filter: 'awaiting_recommendation' | 'recommended_by_me' | 'all'
  const tab = filters.tab || "awaiting_recommendation";
  if (tab === "awaiting_recommendation") {
    filtered = filtered.filter(
      (p) =>
        p.status === PASS_STATUSES.PENDING &&
        !(p.recommendations || []).some((r) => r.byId === user.id)
    );
  } else if (tab === "recommended_by_me") {
    filtered = filtered.filter((p) =>
      (p.recommendations || []).some((r) => r.byId === user.id)
    );
  }

  // Search filter
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        (p.studentName && p.studentName.toLowerCase().includes(q)) ||
        (p.studentId && p.studentId.toLowerCase().includes(q)) ||
        (p.passNumber && p.passNumber.toLowerCase().includes(q)) ||
        (p.destination && p.destination.toLowerCase().includes(q)) ||
        (p.reason && p.reason.toLowerCase().includes(q))
    );
  }

  // Year filter
  if (filters.year && filters.year !== "all") {
    filtered = filtered.filter((p) => String(p.year) === String(filters.year));
  }

  // Floor filter
  if (filters.floor && filters.floor !== "all") {
    filtered = filtered.filter((p) => p.floor === filters.floor);
  }

  // Emergency filter
  if (filters.emergency === true || filters.emergency === "true") {
    filtered = filtered.filter((p) => p.emergency === true);
  }

  // Status filter
  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  // Sort newest first
  filtered.sort((a, b) => {
    const tA = new Date(a.appliedAt || a.fromTime || a.departureTime || 0).getTime();
    const tB = new Date(b.appliedAt || b.fromTime || b.departureTime || 0).getTime();
    return tB - tA;
  });

  const paginationMeta = paginate(filtered, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
  });
}

/**
 * Submit an advisory recommendation on a pass (Staff / HOD)
 * @param {object} params
 * @param {string} params.passId
 * @param {'recommend'|'do_not_recommend'} params.verdict
 * @param {string} [params.note]
 */
export async function recommend({ passId, verdict, note = "" }) {
  await simulateLatency(250, 450);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  if (!["recommend", "do_not_recommend"].includes(verdict)) {
    return errorResponse("INVALID_VERDICT", "Verdict must be 'recommend' or 'do_not_recommend'.");
  }

  if (verdict === "do_not_recommend" && (!note || !note.trim())) {
    return errorResponse("VALIDATION_FAILED", "Please provide a reason note when declining recommendation.");
  }

  const user = getActiveStaffOrHod();
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const index = passes.findIndex((p) => p.id === passId || p.passNumber === passId);
  if (index === -1) {
    return errorResponse("NOT_FOUND", "Pass not found.");
  }

  const pass = passes[index];

  // Scope check
  const dept = user.dept || user.department || "CSE";
  if ((pass.department || pass.dept) !== dept) {
    return errorResponse("NOT_ALLOWED", "Out of department scope.");
  }
  if (user.role === ROLES.STAFF && Array.isArray(user.assignedYears) && user.assignedYears.length > 0) {
    if (!user.assignedYears.includes(Number(pass.year))) {
      return errorResponse("NOT_ALLOWED", "Out of assigned year scope.");
    }
  }

  const nowIso = new Date().toISOString();
  const newRec = {
    byId: user.id,
    name: user.name,
    role: user.role,
    verdict,
    note: note.trim(),
    at: nowIso,
  };

  // Filter out any previous recommendation by this same user to replace it
  const existingRecs = (pass.recommendations || []).filter((r) => r.byId !== user.id);
  const updatedRecs = [...existingRecs, newRec];

  // Verdict action:
  // If recommend and pass is pending -> status becomes 'recommended'
  // If do_not_recommend -> pass status remains as-is (e.g. pending), but rec is recorded
  let newStatus = pass.status;
  if (verdict === "recommend" && pass.status === PASS_STATUSES.PENDING) {
    newStatus = PASS_STATUSES.RECOMMENDED;
  }

  const roleLabel = user.role === ROLES.HOD ? "HOD" : "Faculty Advisor";
  const updatedTimeline = [
    ...(pass.timeline || []),
    {
      status: verdict === "recommend" ? PASS_STATUSES.RECOMMENDED : "do_not_recommend",
      label: verdict === "recommend" ? `Recommended by ${roleLabel}` : `Not Recommended by ${roleLabel}`,
      timestamp: nowIso,
      actor: `${user.name} (${roleLabel})`,
      note: note.trim() || (verdict === "recommend" ? "Academic standing verified and cleared." : ""),
    },
  ];

  const updatedPass = {
    ...pass,
    status: newStatus,
    recommendations: updatedRecs,
    timeline: updatedTimeline,
    updatedAt: nowIso,
    lastRecommendationVerdict: verdict,
  };

  passes[index] = updatedPass;
  setPersistentMock(STORAGE_KEYS.PASSES, passes);
  return successResponse(updatedPass);
}

/**
 * Bulk recommend passes in one action (skipping overdue students)
 * @param {object} params
 * @param {string[]} params.passIds
 * @param {string} [params.note]
 */
export async function bulkRecommend({ passIds = [], note = "Bulk academic clearance verified." }) {
  await simulateLatency(350, 600);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  const user = getActiveStaffOrHod();
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Identify all students who have an overdue pass currently
  const overdueStudentIds = new Set(
    passes.filter((p) => p.status === PASS_STATUSES.OVERDUE).map((p) => p.studentId)
  );

  let recommendedCount = 0;
  const skippedPasses = [];
  const nowIso = new Date().toISOString();
  const roleLabel = user.role === ROLES.HOD ? "HOD" : "Faculty Advisor";

  passes.forEach((pass, idx) => {
    if (!passIds.includes(pass.id) && !passIds.includes(pass.passNumber)) return;

    // Check if student has an overdue pass
    if (overdueStudentIds.has(pass.studentId)) {
      skippedPasses.push({
        passId: pass.id,
        studentName: pass.studentName,
        studentId: pass.studentId,
        reason: "Student currently has an overdue pass",
      });
      return;
    }

    // Only pending passes can be recommended
    if (pass.status !== PASS_STATUSES.PENDING && pass.status !== PASS_STATUSES.RECOMMENDED) {
      skippedPasses.push({
        passId: pass.id,
        studentName: pass.studentName,
        studentId: pass.studentId,
        reason: `Pass is already in ${pass.status} status`,
      });
      return;
    }

    const newRec = {
      byId: user.id,
      name: user.name,
      role: user.role,
      verdict: "recommend",
      note: note.trim(),
      at: nowIso,
    };

    const existingRecs = (pass.recommendations || []).filter((r) => r.byId !== user.id);
    const updatedRecs = [...existingRecs, newRec];

    const updatedTimeline = [
      ...(pass.timeline || []),
      {
        status: PASS_STATUSES.RECOMMENDED,
        label: `Recommended by ${roleLabel}`,
        timestamp: nowIso,
        actor: `${user.name} (${roleLabel})`,
        note: note.trim(),
      },
    ];

    passes[idx] = {
      ...pass,
      status: PASS_STATUSES.RECOMMENDED,
      recommendations: updatedRecs,
      timeline: updatedTimeline,
      updatedAt: nowIso,
      lastRecommendationVerdict: "recommend",
    };
    recommendedCount++;
  });

  setPersistentMock(STORAGE_KEYS.PASSES, passes);

  return successResponse({
    recommendedCount,
    skippedCount: skippedPasses.length,
    skippedPasses,
  });
}

/**
 * Undo recommendation for the current user within grace window
 * @param {object} params
 * @param {string} params.passId
 */
export async function undoRecommendation({ passId }) {
  await simulateLatency(200, 350);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  const user = getActiveStaffOrHod();
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const index = passes.findIndex((p) => p.id === passId || p.passNumber === passId);
  if (index === -1) {
    return errorResponse("NOT_FOUND", "Pass not found.");
  }

  const pass = passes[index];
  const updatedRecs = (pass.recommendations || []).filter((r) => r.byId !== user.id);

  // If no other positive recommendation exists and pass was 'recommended', revert to 'pending'
  const hasOtherRecommend = updatedRecs.some((r) => r.verdict === "recommend");
  let newStatus = pass.status;
  if (pass.status === PASS_STATUSES.RECOMMENDED && !hasOtherRecommend) {
    newStatus = PASS_STATUSES.PENDING;
  }

  const nowIso = new Date().toISOString();
  const updatedTimeline = [
    ...(pass.timeline || []),
    {
      status: "recommendation_undone",
      label: "Recommendation Undone",
      timestamp: nowIso,
      actor: user.name,
      note: "Recommendation reverted by advisor.",
    },
  ];

  const updatedPass = {
    ...pass,
    status: newStatus,
    recommendations: updatedRecs,
    timeline: updatedTimeline,
    updatedAt: nowIso,
  };

  passes[index] = updatedPass;
  setPersistentMock(STORAGE_KEYS.PASSES, passes);
  return successResponse(updatedPass);
}

/**
 * Aggregate department recommendation statistics for badges & counters
 */
export async function getRecommendationStats() {
  await simulateLatency(100, 200);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";
  const isStaff = user.role === ROLES.STAFF;
  const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Scope filter
  const deptPasses = passes.filter((p) => {
    if ((p.department || p.dept) !== dept) return false;
    if (isStaff && assignedYears.length > 0) {
      return assignedYears.includes(Number(p.year));
    }
    return true;
  });

  const awaiting = deptPasses.filter(
    (p) => p.status === PASS_STATUSES.PENDING && !(p.recommendations || []).some((r) => r.byId === user.id)
  ).length;

  const recommendedByMe = deptPasses.filter((p) =>
    (p.recommendations || []).some((r) => r.byId === user.id)
  ).length;

  const emergencyCount = deptPasses.filter(
    (p) => p.emergency === true && p.status === PASS_STATUSES.PENDING
  ).length;

  const overdueCount = deptPasses.filter((p) => p.status === PASS_STATUSES.OVERDUE).length;

  return successResponse({
    awaiting,
    recommendedByMe,
    all: deptPasses.length,
    emergency: emergencyCount,
    overdue: overdueCount,
  });
}

export const passService = {
  listPasses,
  listForDepartment,
  getPassById,
  checkEligibility,
  applyPass,
  recommend,
  recommendPass,
  bulkRecommend,
  undoRecommendation,
  getRecommendationStats,
  approvePass,
  rejectPass,
  issueGatePass,
  cancelPass,
  advancePassStatus,
  getPassHistory,
  getPassStats,
};

export default passService;
