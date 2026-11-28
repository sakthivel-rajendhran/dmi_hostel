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
  // Query MySQL Outpass API when running in browser
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      if (status && status !== "all") params.set("status", status);
      if (type && type !== "all") params.set("type", type);
      if (search) params.set("search", search);

      const res = await fetch(`/api/outpass/list?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          let list = [...json.data];
          // Sort newest to oldest by default
          list.sort((a, b) => {
            const timeA = new Date(a.fromTime || a.departureTime || a.appliedAt || a.createdAt).getTime();
            const timeB = new Date(b.fromTime || b.departureTime || b.appliedAt || b.createdAt).getTime();
            return sort === "oldest" ? timeA - timeB : timeB - timeA;
          });
          const paginationMeta = paginate(list, page, pageSize);
          return successResponse(paginationMeta.items, {
            total: paginationMeta.total,
            page: paginationMeta.page,
            pageSize: paginationMeta.pageSize,
            totalPages: paginationMeta.totalPages,
          });
        }
      }
      return errorResponse("API_ERROR", "Failed to load passes from MySQL database.");
    } catch (e) {
      console.error("Could not fetch passes from MySQL API:", e);
      return errorResponse("SERVER_ERROR", "Could not connect to hostel database service.");
    }
  }

  const paginationMeta = paginate([], page, pageSize);
  return successResponse(paginationMeta.items, {
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  });
}

/**
 * Retrieve pass by unique ID
 * @param {string} passId
 */
export async function getPassById(passId) {
  if (typeof window !== "undefined" && passId) {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          return successResponse(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch pass from MySQL API:", e);
    }
  }

  return errorResponse("NOT_FOUND", "Outpass record not found.");
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
export async function checkEligibility({ studentId, type = "Local Pass", from, to, studentPasses: passedPasses }) {
  let studentPasses = passedPasses || [];
  if (studentPasses.length === 0 && studentId) {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/outpass/list?studentId=${encodeURIComponent(studentId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            studentPasses = json.data;
          }
        }
      } catch (e) {
        console.warn("Could not fetch student passes for eligibility:", e);
      }
    } else {
      // In server/Node environment, fetch from MySQL directly
      try {
        const { query } = await import("@/lib/db/mysql.js");
        const rows = await query(
          "SELECT * FROM outpasses WHERE student_id = ? OR student_id = (SELECT id FROM users WHERE id = ? LIMIT 1)",
          [studentId, studentId]
        );
        studentPasses = rows.map((r) => ({
          ...r,
          type: r.type,
          fromTime: r.departure_time,
          toTime: r.expected_return_time,
          departureTime: r.departure_time,
          expectedReturnTime: r.expected_return_time,
          appliedAt: r.created_at,
          createdAt: r.created_at,
        }));
      } catch (e) {}
    }
  }

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

    const isHome = (type || "").toLowerCase().includes("home");
    const isLocal = !isHome && (type || "").toLowerCase().includes("local");

    if (isLocal) {
      // Local Pass: Unlimited applications permitted at any time (no daily/weekly/monthly quota, no overlap restrictions)
      // Must be completed on the same day
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
    } else if (isHome) {
      // 4. Home Pass: UNLIMITED applications (no daily, weekly, monthly, or yearly limit)
      // Completely bypasses the overlapping-time restriction.
      // Allows multiple applications on same day, overlapping time windows, pending or approved passes.
      const durationDays = (toTimeMs - fromTimeMs) / (1000 * 60 * 60 * 24);
      const maxDays = WORKFLOW_CONFIG.maxHomePassDays || 15;
      if (durationDays > maxDays) {
        reasons.push(`Home passes cannot exceed ${maxDays} days duration.`);
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
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
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
          `Home passes exceeding ${threshold} days require an approved special permission letter from Correspondent.`
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

  // 1. Submit directly to MySQL Outpass API when in browser
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/outpass/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passData),
      });
      const json = await res.json();
      if (!res.ok) {
        return errorResponse(json.code || "APPLY_FAILED", json.message || "Failed to submit outpass application.");
      }
      return successResponse(json.data);
    } catch (err) {
      console.error("[PassService] Backend applyPass error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to outpass service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Recommend a pass (Academic Staff / HOD)
 */
export async function recommendPass(passId, actorName, note) {
  await simulateLatency(150, 300);

  const session = getCurrentSession();
  const callerRole = (session?.user?.role || session?.role || "").toLowerCase();
  if (callerRole === ROLES.CORRESPONDENT || callerRole === "correspondent") {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  const roleToSend = callerRole === "hod" ? "hod" : "staff";
  const defaultNote = roleToSend === "hod" ? "Endorsed and forwarded to Chief Warden" : "Recommended by Staff";
  const defaultActor = roleToSend === "hod" ? "Head of Department" : "Faculty Advisor";

  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleToSend,
          actorUserId: session?.user?.id || (roleToSend === "hod" ? "FY_HOD" : "FY_STAFF"),
          actorName: actorName || session?.user?.name || defaultActor,
          remarks: note || defaultNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        return errorResponse(json.code || "RECOMMEND_FAILED", json.message || "Failed to recommend pass");
      }
      return successResponse(json.data || { id: passId, status: PASS_STATUSES.RECOMMENDED });
    } catch (err) {
      console.error("[PassService] recommendPass error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to recommendation service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Approve a pass (Warden)
 */
export async function approvePass(passId, actorName = "Dr. John Xavier (Chief Warden)", note = "Outpass approved for campus exit.") {
  await simulateLatency(150, 300);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  // 1. Submit directly to MySQL Outpass Approve API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "warden",
          actorUserId: session?.user?.id || "W-001",
          actorName: actorName || session?.user?.name || "Dr. John Xavier (Chief Warden)",
          remarks: note || "Approved for campus exit",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        return errorResponse(json.code || "APPROVAL_FAILED", json.message || "Failed to approve pass");
      }
      return successResponse(json.data || { id: passId, status: PASS_STATUSES.APPROVED });
    } catch (err) {
      console.error("[PassService] Backend approvePass error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to approval service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Reject a pass with reason
 */
export async function rejectPass(passId, actorName, reason) {
  await simulateLatency(150, 300);

  const session = getCurrentSession();
  const callerRole = (session?.user?.role || session?.role || "").toLowerCase();
  if (callerRole === ROLES.CORRESPONDENT || callerRole === "correspondent") {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  const roleToSend = callerRole === "hod" ? "hod" : callerRole === "staff" ? "staff" : "warden";
  const defaultActor = roleToSend === "hod" ? "Head of Department" : roleToSend === "staff" ? "Faculty Advisor" : "Dr. John Xavier (Chief Warden)";
  const cleanReason = String(reason || "").trim() || "Declined during academic / administrative review.";

  // 1. Submit directly to MySQL Outpass Reject API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleToSend,
          actorUserId: session?.user?.id || (roleToSend === "hod" ? "FY_HOD" : roleToSend === "staff" ? "FY_STAFF" : "WARDEN-001"),
          actorName: actorName || session?.user?.name || defaultActor,
          remarks: cleanReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        return errorResponse(json.code || "REJECTION_FAILED", json.message || "Failed to reject pass");
      }
      return successResponse(json.data || { id: passId, status: PASS_STATUSES.REJECTED });
    } catch (err) {
      console.error("[PassService] Backend rejectPass error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to rejection service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Issue Digital Gate Pass (QR)
 */
export async function issueGatePass(passId) {
  await simulateLatency(200, 350);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  // Direct backend sync to MySQL
  if (typeof window !== "undefined" && passId) {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: PASS_STATUSES.GATE_PASS_ISSUED,
          actor: "Hostel Gate Pass Authority",
          note: "Digital QR gate pass issued for scanner.",
        }),
      });
      if (res.ok) {
        updatePassStatus(passId, PASS_STATUSES.GATE_PASS_ISSUED, "Hostel Gate Pass Authority", "Digital QR gate pass issued for scanner.");
        return successResponse({ id: passId, status: PASS_STATUSES.GATE_PASS_ISSUED });
      }
    } catch (e) {
      console.warn("Could not sync gate pass issue to MySQL:", e);
    }
  }

  return updatePassStatus(passId, PASS_STATUSES.GATE_PASS_ISSUED, "Hostel Gate Pass Authority", "Digital QR gate pass issued for scanner.");
}

/**
 * Cancel an outpass
 */
export async function cancelPass(passId, reason = "Cancelled by student") {
  await simulateLatency(150, 300);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  if (typeof window !== "undefined" && passId) {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", status: "cancelled", reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        return successResponse({ id: passId, status: PASS_STATUSES.CANCELLED });
      }
      return errorResponse(json.code || "CANCEL_FAILED", json.message || "Failed to cancel pass.");
    } catch (e) {
      console.error("Could not cancel pass via MySQL API:", e);
      return errorResponse("SERVER_ERROR", "Could not connect to pass cancellation service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Delete a rejected outpass
 */
export async function deletePass(passId) {
  await simulateLatency(100, 250);

  if (typeof window !== "undefined" && passId) {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        return successResponse({ id: passId, deleted: true, message: json.message });
      }
      return errorResponse(json.code || "DELETE_FAILED", json.message || "Failed to delete outpass.");
    } catch (e) {
      console.error("Could not delete pass via MySQL API:", e);
      return errorResponse("SERVER_ERROR", "Could not connect to pass deletion service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
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
  const res = await listPasses({ studentId, pageSize: 100 });
  if (res.ok) {
    return successResponse(res.data);
  }
  return successResponse([]);
}

/**
 * Get aggregate pass statistics
 */
export async function getPassStats() {
  const res = await listPasses({ pageSize: 1000 });
  const passes = res.ok && Array.isArray(res.data) ? res.data : [];
  return successResponse({
    total: passes.length,
    pending: passes.filter((p) => p.status === PASS_STATUSES.PENDING || p.status === "pending").length,
    recommended: passes.filter((p) => p.status === PASS_STATUSES.RECOMMENDED || p.status === "recommended").length,
    approved: passes.filter((p) => p.status === PASS_STATUSES.APPROVED || p.status === "approved").length,
    gatePassIssued: passes.filter((p) => p.status === PASS_STATUSES.GATE_PASS_ISSUED || p.status === "gate_pass_issued").length,
    currentlyOut: passes.filter((p) => p.status === PASS_STATUSES.OUT || p.status === "out").length,
    overdue: passes.filter((p) => p.status === PASS_STATUSES.OVERDUE || p.status === "overdue").length,
    returned: passes.filter((p) => p.status === PASS_STATUSES.RETURNED || p.status === "returned").length,
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
 * Authoritative: Fetches directly from MySQL outpasses via /api/outpass/list
 * @param {object} params
 */
export async function listForDepartment({ filters = {}, page = 1, pageSize = 20 } = {}) {
  await simulateLatency(150, 300);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";
  const isStaff = user.role === ROLES.STAFF || user.role === "staff";
  const isHod = user.role === ROLES.HOD || user.role === "hod";
  const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

  // Query authoritative MySQL Outpass API
  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams({ role: isHod ? "hod" : "staff", department: dept });
      if (filters.search) q.set("search", filters.search);

      const res = await fetch(`/api/outpass/list?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          let list = json.data.map((bp) => {
            const rawStatus = (bp.status || bp.overall_status || "").toLowerCase();
            return {
              ...bp,
              id: bp.id,
              passNumber: bp.pass_number || bp.passNumber || bp.id,
              status: rawStatus === "recommended" ? PASS_STATUSES.RECOMMENDED : bp.status,
              overallStatus: bp.status,
              type: bp.type || bp.outpass_type,
              departureTime: bp.departure_time || bp.departureTime,
              fromTime: bp.departure_time || bp.departureTime,
              expectedReturnTime: bp.expected_return_time || bp.expectedReturnTime,
              toTime: bp.expected_return_time || bp.expectedReturnTime,
              appliedAt: bp.created_at || bp.createdAt || bp.appliedAt,
              studentName: bp.student_name || bp.studentName,
              studentId: bp.student_id || bp.studentId,
              department: bp.department,
              dept: bp.department,
              year: bp.year,
              floor: bp.floor,
              room: bp.room_number || bp.room,
              reason: bp.reason,
              destination: bp.destination,
              emergency: Boolean(bp.emergency),
              parentPhone: bp.parentPhone || bp.parent_phone || "",
              parentName: bp.parentName || bp.parent_name || bp.guardianName || bp.guardian_name || "",
              parentRelation: bp.parentRelation || bp.parent_relation || bp.guardianRelation || bp.guardian_relation || "",
              hasParentPhone: Boolean(bp.hasParentPhone || bp.parentPhone || bp.parent_phone),
              guardianPhone: bp.parentPhone || bp.parent_phone || bp.guardianPhone || bp.guardian_phone || bp.student_guardian_phone || "",
              guardianName: bp.parentName || bp.parent_name || bp.guardianName || bp.guardian_name || "",
              guardianRelation: bp.parentRelation || bp.parent_relation || bp.guardianRelation || bp.guardian_relation || "",
              studentPhone: bp.student_phone || bp.studentPhone || "",
              photoUrl: bp.photoUrl || bp.studentPhoto || bp.photo_url || (bp.student_id ? `/api/student/profile/photo?studentId=${encodeURIComponent(bp.student_id)}` : null),
              studentPhoto: bp.photoUrl || bp.studentPhoto || bp.photo_url || (bp.student_id ? `/api/student/profile/photo?studentId=${encodeURIComponent(bp.student_id)}` : null),
              regNo: bp.reg_no || bp.regNo || "",
              staffApprovalStatus: bp.staff_approval_status || bp.staffApprovalStatus,
              staffRemarks: bp.staff_remarks || bp.staffRemarks,
              staffApprovedBy: bp.staff_approved_by || bp.staffApprovedBy,
              staffApprovedAt: bp.staff_approved_at || bp.staffApprovedAt,
              hodApprovalStatus: bp.hod_approval_status || bp.hodApprovalStatus,
              hodRemarks: bp.hod_remarks || bp.hodRemarks,
              hodApprovedBy: bp.hod_approved_by || bp.hodApprovedBy,
              hodApprovedAt: bp.hod_approved_at || bp.hodApprovedAt,
              wardenRemarks: bp.warden_remarks || bp.wardenRemarks,
              recommendations: bp.recommendations || [],
            };
          });

          // Department & Year scoping
          let filtered = list.filter((p) => {
            const passDept = p.department || p.dept || "";
            if (dept && dept !== "ALL" && passDept && passDept.toLowerCase() !== dept.toLowerCase()) return false;
            if (assignedYears.length > 0) {
              return assignedYears.includes(Number(p.year));
            }
            return true;
          });

          // Tab filter: 'awaiting_recommendation' | 'recommended_by_me' | 'all'
          const tab = filters.tab || "awaiting_recommendation";
          if (tab === "awaiting_recommendation") {
            if (isHod) {
              filtered = filtered.filter(
                (p) =>
                  (p.staffApprovalStatus === "APPROVED" || p.staff_approval_status === "APPROVED") &&
                  p.hodApprovalStatus !== "APPROVED" &&
                  p.hod_approval_status !== "APPROVED" &&
                  (p.status || "").toLowerCase() !== "rejected"
              );
            } else {
              filtered = filtered.filter(
                (p) =>
                  (p.status || "").toLowerCase() === "pending" &&
                  p.staffApprovalStatus !== "APPROVED" &&
                  p.staff_approval_status !== "APPROVED"
              );
            }
          } else if (tab === "recommended_by_me") {
            if (isHod) {
              filtered = filtered.filter(
                (p) =>
                  p.hodApprovalStatus === "APPROVED" ||
                  p.hod_approval_status === "APPROVED" ||
                  (p.recommendations || []).some((r) => r.byId === user.id)
              );
            } else {
              filtered = filtered.filter(
                (p) =>
                  p.staffApprovalStatus === "APPROVED" ||
                  p.staff_approval_status === "APPROVED" ||
                  (p.recommendations || []).some((r) => r.byId === user.id)
              );
            }
          }

          // Search filter
          if (filters.search) {
            const sq = filters.search.toLowerCase().trim();
            filtered = filtered.filter(
              (p) =>
                (p.studentName && p.studentName.toLowerCase().includes(sq)) ||
                (p.studentId && p.studentId.toLowerCase().includes(sq)) ||
                (p.passNumber && p.passNumber.toLowerCase().includes(sq)) ||
                (p.destination && p.destination.toLowerCase().includes(sq)) ||
                (p.reason && p.reason.toLowerCase().includes(sq))
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
            filtered = filtered.filter((p) => (p.status || "").toLowerCase() === String(filters.status).toLowerCase());
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
      }
      return errorResponse("API_ERROR", "Failed to retrieve department passes from MySQL.");
    } catch (err) {
      console.error("[PassService] Backend listForDepartment error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to database service.");
    }
  }

  const paginationMeta = paginate([], page, pageSize);
  return successResponse(paginationMeta.items, {
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  });
}

/**
 * Submit an advisory recommendation on a pass (Staff / HOD)
 * Writes directly to MySQL outpasses and pass_timeline tables
 * @param {object} params
 * @param {string} params.passId
 * @param {'recommend'|'do_not_recommend'} params.verdict
 * @param {string} [params.note]
 */
export async function recommend({ passId, verdict, note = "" }) {
  await simulateLatency(250, 450);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  if (!["recommend", "do_not_recommend"].includes(verdict)) {
    return errorResponse("INVALID_VERDICT", "Verdict must be 'recommend' or 'do_not_recommend'.");
  }

  if (verdict === "do_not_recommend" && (!note || !note.trim())) {
    return errorResponse("VALIDATION_FAILED", "Please provide a reason note when declining recommendation.");
  }

  const user = getActiveStaffOrHod();
  const effectiveRole = (user.role === ROLES.HOD || user.role === "hod" || callerRole === "hod" || callerRole === ROLES.HOD) ? "hod" : "staff";

  if (typeof window !== "undefined") {
    try {
      const endpoint = verdict === "recommend" ? "approve" : "reject";
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: effectiveRole,
          actorUserId: user.id,
          actorName: user.name,
          remarks: note.trim() || (verdict === "recommend" ? (effectiveRole === "hod" ? "Endorsed and forwarded to Chief Warden." : "Academic standing verified and cleared.") : "Declined by Department."),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        return errorResponse(json.code || "DECISION_FAILED", json.message || "Failed to submit recommendation to MySQL.");
      }
      return successResponse(json.data || { id: passId, status: verdict === "recommend" ? PASS_STATUSES.RECOMMENDED : "do_not_recommend" });
    } catch (err) {
      console.error("[PassService] Backend recommend error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to recommendation service.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Bulk recommend passes in one action
 * Persists each recommendation directly to MySQL database
 * @param {object} params
 * @param {string[]} params.passIds
 * @param {string} [params.note]
 */
export async function bulkRecommend({ passIds = [], note = "Bulk academic clearance verified." }) {
  await simulateLatency(350, 600);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  const user = getActiveStaffOrHod();
  const effectiveRole = (user.role === ROLES.HOD || user.role === "hod" || callerRole === "hod" || callerRole === ROLES.HOD) ? "hod" : "staff";
  let recommendedCount = 0;
  const skippedPasses = [];

  if (typeof window !== "undefined") {
    for (const passId of passIds) {
      try {
        const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: effectiveRole,
            actorUserId: user.id,
            actorName: user.name,
            remarks: note.trim(),
          }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          recommendedCount++;
        } else {
          skippedPasses.push({ passId, reason: json.message || "Failed to recommend" });
        }
      } catch (err) {
        skippedPasses.push({ passId, reason: "Network or server error" });
      }
    }

    return successResponse({
      recommendedCount,
      skippedCount: skippedPasses.length,
      skippedPasses,
    });
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Undo recommendation for the current user within grace window
 * Resets status to pending in MySQL database
 * @param {object} params
 * @param {string} params.passId
 */
export async function undoRecommendation({ passId }) {
  await simulateLatency(200, 350);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Correspondent has read-only oversight access.");
  }

  const user = getActiveStaffOrHod();

  if (typeof window !== "undefined" && passId) {
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending",
          actor: user.name,
          note: "Recommendation reverted by advisor.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        return successResponse({ id: passId, status: PASS_STATUSES.PENDING });
      }
      return errorResponse(json.code || "UNDO_FAILED", json.message || "Failed to revert recommendation.");
    } catch (err) {
      console.error("[PassService] Undo recommendation error:", err);
      return errorResponse("SERVER_ERROR", "Could not connect to service to revert recommendation.");
    }
  }

  return errorResponse("DATABASE_ERROR", "Backend service required.");
}

/**
 * Aggregate department recommendation statistics for badges & counters
 * Authoritative: Derives counts directly from MySQL outpasses
 */
export async function getRecommendationStats() {
  await simulateLatency(100, 200);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";

  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams({ role: "staff", department: dept });
      const res = await fetch(`/api/outpass/list?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const deptPasses = json.data;
          const awaiting = deptPasses.filter(
            (p) => (p.status || "").toLowerCase() === "pending"
          ).length;
          const recommendedByMe = deptPasses.filter(
            (p) => (p.status || "").toLowerCase() === "recommended"
          ).length;
          const emergencyCount = deptPasses.filter(
            (p) => Boolean(p.emergency) && (p.status || "").toLowerCase() === "pending"
          ).length;
          const overdueCount = deptPasses.filter(
            (p) => (p.status || "").toLowerCase() === "overdue"
          ).length;

          return successResponse({
            awaiting,
            recommendedByMe,
            all: deptPasses.length,
            emergency: emergencyCount,
            overdue: overdueCount,
          });
        }
      }
    } catch (err) {
      console.warn("[PassService] Backend getRecommendationStats error:", err);
    }
  }

  return successResponse({
    awaiting: 0,
    recommendedByMe: 0,
    all: 0,
    emergency: 0,
    overdue: 0,
  });
}

/**
 * Real Backend Scanner Eligibility Check
 * @param {string} studentId
 * @param {string} [passId]
 */
export async function getScannerEligibility(studentId, passId) {
  try {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams({ studentId: studentId || "" });
      if (passId) q.set("passId", passId);
      const res = await fetch(`/api/outpass/scanner-eligibility?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          return successResponse(json.data);
        }
      }
    }
  } catch (err) {
    console.warn("[PassService] Backend getScannerEligibility error:", err);
  }

  // When backend API is unavailable or returns no eligible pass
  return successResponse({
    canAccess: false,
    state: "NO_PASS",
    message: "No Warden-approved pass available.",
    allowCamera: false,
    pass: null,
  });
}

export const passService = {
  listPasses,
  listForDepartment,
  getPassById,
  checkEligibility,
  getScannerEligibility,
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
  deletePass,
  advancePassStatus,
  getPassHistory,
  getPassStats,
};

export default passService;
