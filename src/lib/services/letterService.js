/**
 * DMI College Hostel Management PWA - Student Letter Service
 * Manages institutional approval workflow for special student permission letters.
 * Fully decoupled, feature-flagged, and read-only guarded.
 */

import { MOCK_LETTERS, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { simulateLatency, successResponse, errorResponse, paginate } from "./base.js";
import { LETTER_STATUSES } from "@/config/status.js";
import { ROLES } from "@/config/roles.js";
import { PERMISSIONS, can } from "@/config/permissions.js";
import { getPolicy } from "./settingsService.js";
import { getCurrentSession } from "./authService.js";
import { notificationService } from "./notificationService.js";

/**
 * Helper to get calling user from active session
 */
function getActiveCaller() {
  const session = getCurrentSession();
  if (session?.user) return session.user;
  return {
    id: "PRINCIPAL-001",
    name: "Dr. Joseph Lawrence",
    role: ROLES.PRINCIPAL,
    designation: "College Principal",
  };
}

/**
 * Calculates current resolution of a letter based on decisions and policy approverMode
 * @param {Array} decisions
 * @param {string} approverMode - 'either' | 'both' | 'principal_only' | 'correspondent_only'
 * @returns {string} - Status from LETTER_STATUSES
 */
export function evaluateLetterStatus(decisions = [], approverMode = "either") {
  const principalDec = decisions.find((d) => d.byRole === ROLES.PRINCIPAL);
  const correspondentDec = decisions.find((d) => d.byRole === ROLES.CORRESPONDENT);

  if (approverMode === "principal_only") {
    if (!principalDec) return LETTER_STATUSES.SUBMITTED;
    return principalDec.verdict === "approve" ? LETTER_STATUSES.APPROVED : LETTER_STATUSES.DECLINED;
  }

  if (approverMode === "correspondent_only") {
    if (!correspondentDec) return LETTER_STATUSES.SUBMITTED;
    return correspondentDec.verdict === "approve" ? LETTER_STATUSES.APPROVED : LETTER_STATUSES.DECLINED;
  }

  if (approverMode === "both") {
    // Both must approve. If either declines, letter is declined.
    if (principalDec?.verdict === "decline" || correspondentDec?.verdict === "decline") {
      return LETTER_STATUSES.DECLINED;
    }
    if (principalDec?.verdict === "approve" && correspondentDec?.verdict === "approve") {
      return LETTER_STATUSES.APPROVED;
    }
    return LETTER_STATUSES.SUBMITTED;
  }

  // Default: 'either'
  // Any one approve makes it approved. If both have reviewed and both declined, it's declined.
  if (principalDec?.verdict === "approve" || correspondentDec?.verdict === "approve") {
    return LETTER_STATUSES.APPROVED;
  }
  if (principalDec?.verdict === "decline" && correspondentDec?.verdict === "decline") {
    return LETTER_STATUSES.DECLINED;
  }
  return LETTER_STATUSES.SUBMITTED;
}

/**
 * List letters with filtering and pagination
 * @param {object} params
 */
export async function list({
  page = 1,
  pageSize = 15,
  search = "",
  type = "all",
  department = "all",
  year = "all",
  status = "all",
  tab = "all", // 'all' | 'awaiting' | 'decided_by_me'
} = {}) {
  await simulateLatency(200, 400);

  const policy = getPolicy();
  if (!policy.studentLetters?.enabled) {
    return errorResponse("LETTERS_DISABLED", "Special letters module is disabled.");
  }

  const caller = getActiveCaller();
  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);

  let filtered = [...letters];

  // Tab filters
  if (tab === "awaiting") {
    filtered = filtered.filter((l) => {
      if (l.status !== LETTER_STATUSES.SUBMITTED) return false;
      const myDecision = (l.decisions || []).find((d) => d.byId === caller.id || d.byRole === caller.role);
      return !myDecision;
    });
  } else if (tab === "decided_by_me") {
    filtered = filtered.filter((l) =>
      (l.decisions || []).some((d) => d.byId === caller.id || d.byRole === caller.role)
    );
  }

  // Type filter
  if (type && type !== "all") {
    filtered = filtered.filter((l) => l.type === type);
  }

  // Department filter
  if (department && department !== "all") {
    filtered = filtered.filter((l) => l.department === department);
  }

  // Year filter
  if (year && year !== "all") {
    filtered = filtered.filter((l) => String(l.year) === String(year));
  }

  // Status filter
  if (status && status !== "all") {
    filtered = filtered.filter((l) => l.status === status);
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        (l.studentName && l.studentName.toLowerCase().includes(q)) ||
        (l.studentId && l.studentId.toLowerCase().includes(q)) ||
        (l.subject && l.subject.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.id && l.id.toLowerCase().includes(q))
    );
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const paginationMeta = paginate(filtered, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
    awaitingCount: letters.filter((l) => l.status === LETTER_STATUSES.SUBMITTED).length,
  });
}

/**
 * Get letter details by ID with student risk context
 * @param {string} id
 */
export async function getById(id) {
  await simulateLatency(150, 300);

  const policy = getPolicy();
  if (!policy.studentLetters?.enabled) {
    return errorResponse("LETTERS_DISABLED", "Special letters module is disabled.");
  }

  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);
  const letter = letters.find((l) => l.id === id || l.letterNumber === id);
  if (!letter) {
    return errorResponse("NOT_FOUND", "Letter record not found.");
  }

  return successResponse(letter);
}

/**
 * Submit a special permission letter (Student resident)
 * @param {object} payload
 */
export async function submit({
  type,
  subject,
  details,
  linkedPassId = null,
  from,
  to,
  fileDataUrl,
  fileName,
  fileSize,
  fileType,
  studentId,
  studentName,
  department,
  year,
  floor,
  roomNo,
} = {}) {
  await simulateLatency(350, 600);

  const policy = getPolicy();
  if (!policy.studentLetters?.enabled) {
    return errorResponse("LETTERS_DISABLED", "Special letters module is currently disabled by administration.");
  }

  const cfg = policy.studentLetters;
  const maxBytes = cfg.maxLetterBytes || 2097152;
  const allowedMime = cfg.accept || ["application/pdf", "image/jpeg", "image/png"];

  // File size validation
  if (!fileSize || fileSize > maxBytes) {
    const sizeMb = ((fileSize || 0) / 1048576).toFixed(1);
    const maxMb = (maxBytes / 1048576).toFixed(0);
    return errorResponse(
      "LETTER_INVALID_FILE",
      `File is too large (${sizeMb} MB). Maximum permitted size is ${maxMb} MB.`
    );
  }

  // MIME type validation
  const cleanMime = (fileType || "").toLowerCase();
  const ext = (fileName || "").split(".").pop().toLowerCase();
  const isPdf = cleanMime === "application/pdf" || ext === "pdf";
  const isJpg = cleanMime === "image/jpeg" || cleanMime === "image/jpg" || ext === "jpg" || ext === "jpeg";
  const isPng = cleanMime === "image/png" || ext === "png";

  if (!isPdf && !isJpg && !isPng) {
    return errorResponse(
      "LETTER_INVALID_FILE",
      "Invalid file type. Only PDF documents and JPG/PNG images are accepted."
    );
  }

  // Text length validations
  if (!subject || subject.trim().length < 5 || subject.trim().length > 80) {
    return errorResponse("VALIDATION_FAILED", "Subject must be between 5 and 80 characters.");
  }

  if (!details || details.trim().length < 10 || details.trim().length > 500) {
    return errorResponse("VALIDATION_FAILED", "Details must be between 10 and 500 characters.");
  }

  const caller = getActiveCaller();
  const sId = studentId || caller.studentId || caller.id || "CSE-3-001";
  const sName = studentName || caller.name || "Rahul Kumar";

  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);
  const nextSeq = letters.length + 1;
  const letterId = `LTR-2026-${String(nextSeq).padStart(4, "0")}`;

  const typeObj = (cfg.letterTypes || []).find((t) => t.id === type) || { label: type };

  const nowIso = new Date().toISOString();
  const newLetter = {
    id: letterId,
    letterNumber: letterId,
    studentId: sId,
    studentName: sName,
    studentAvatar: sName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    department: department || caller.department || caller.dept || "CSE",
    year: year || caller.year || 3,
    floor: floor || caller.floor || "F3",
    floorLabel: caller.floorLabel || "3rd Floor",
    room: roomNo || caller.roomNo || caller.room || "304",
    roomNo: roomNo || caller.roomNo || caller.room || "304",
    type,
    typeLabel: typeObj.label || type,
    subject: subject.trim(),
    details: details.trim(),
    linkedPassId: linkedPassId || null,
    from: from || nowIso,
    to: to || nowIso,
    fileName: fileName || "attached_letter.pdf",
    fileSize,
    fileType: isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg",
    fileDataUrl: fileDataUrl || "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==",
    status: LETTER_STATUSES.SUBMITTED,
    decisions: [],
    timeline: [
      {
        status: "submitted",
        label: "Letter Submitted",
        timestamp: nowIso,
        actor: `${sName} (Resident)`,
        note: `Submitted permission letter: ${subject.trim()}`,
      },
    ],
    createdAt: nowIso,
  };

  try {
    const updated = [newLetter, ...letters];
    setPersistentMock(STORAGE_KEYS.LETTERS, updated);
  } catch (err) {
    if (err.name === "QuotaExceededError" || err.code === 22) {
      return errorResponse("STORAGE_FULL", "Browser storage limit reached. Please remove older letters or downscale image.");
    }
    throw err;
  }

  // TODO(BACKEND): upload to Cloudinary or Supabase Storage with server-side type and size validation, and store only the URL.

  // Notify Warden, Principal & Correspondent
  try {
    await notificationService.createNotification({
      type: "announcement",
      category: "pass",
      title: "New Student Letter Submitted",
      message: `${sName} (${sId}) submitted a special permission letter for review.`,
      author: sName,
    });
  } catch (e) {}

  return successResponse(newLetter);
}

/**
 * Withdraw a letter while still under review
 * @param {string} id
 */
export async function withdraw(id) {
  await simulateLatency(200, 350);

  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);
  const idx = letters.findIndex((l) => l.id === id || l.letterNumber === id);
  if (idx === -1) {
    return errorResponse("NOT_FOUND", "Letter record not found.");
  }

  const letter = letters[idx];
  if (letter.status !== LETTER_STATUSES.SUBMITTED) {
    return errorResponse("LETTER_NOT_DECIDABLE", "Only letters currently under review can be withdrawn.");
  }

  const nowIso = new Date().toISOString();
  const caller = getActiveCaller();

  const updatedLetter = {
    ...letter,
    status: LETTER_STATUSES.WITHDRAWN,
    timeline: [
      ...(letter.timeline || []),
      {
        status: "withdrawn",
        label: "Withdrawn by Student",
        timestamp: nowIso,
        actor: caller.name || letter.studentName,
        note: "Letter application withdrawn by student.",
      },
    ],
    updatedAt: nowIso,
  };

  letters[idx] = updatedLetter;
  setPersistentMock(STORAGE_KEYS.LETTERS, letters);

  return successResponse(updatedLetter);
}

/**
 * Principal or Correspondent registers an institutional decision (Endorse / Decline)
 * @param {object} params
 * @param {string} params.letterId
 * @param {string} params.verdict - 'approve' | 'decline'
 * @param {string} [params.note]
 */
export async function decide({ letterId, verdict, note = "" } = {}) {
  await simulateLatency(300, 500);

  const policy = getPolicy();
  if (!policy.studentLetters?.enabled) {
    return errorResponse("LETTERS_DISABLED", "Special letters module is disabled.");
  }

  const caller = getActiveCaller();
  if (!can(caller, PERMISSIONS.LETTERS_APPROVE)) {
    return errorResponse("NOT_ALLOWED", "You do not have permission to endorse student letters.");
  }

  const approverMode = policy.studentLetters.approverMode || "either";

  // Check single-role enforcement
  if (approverMode === "principal_only" && caller.role !== ROLES.PRINCIPAL) {
    return errorResponse("NOT_ALLOWED", "Institutional policy requires approval exclusively from College Principal.");
  }

  if (approverMode === "correspondent_only" && caller.role !== ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Institutional policy requires approval exclusively from College Correspondent.");
  }

  if (verdict === "decline" && (!note || note.trim().length === 0)) {
    return errorResponse("VALIDATION_FAILED", "A reason note is required when declining a student letter.");
  }

  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);
  const idx = letters.findIndex((l) => l.id === letterId || l.letterNumber === letterId);
  if (idx === -1) {
    return errorResponse("NOT_FOUND", "Letter record not found.");
  }

  const letter = letters[idx];
  if (letter.status === LETTER_STATUSES.WITHDRAWN || letter.status === LETTER_STATUSES.EXPIRED) {
    return errorResponse("LETTER_NOT_DECIDABLE", `Cannot review letter in ${letter.status} state.`);
  }

  const nowIso = new Date().toISOString();
  const newDecision = {
    byId: caller.id,
    byRole: caller.role,
    byName: caller.name,
    verdict,
    note: note.trim(),
    at: nowIso,
  };

  const existingDecisions = (letter.decisions || []).filter((d) => d.byRole !== caller.role);
  const updatedDecisions = [...existingDecisions, newDecision];

  const newStatus = evaluateLetterStatus(updatedDecisions, approverMode);

  const roleLabel = caller.role === ROLES.PRINCIPAL ? "Principal" : "Correspondent";
  const actionLabel = verdict === "approve" ? `Endorsed by ${roleLabel}` : `Declined by ${roleLabel}`;

  const updatedTimeline = [
    ...(letter.timeline || []),
    {
      status: verdict === "approve" ? "approved" : "declined",
      label: actionLabel,
      timestamp: nowIso,
      actor: `${caller.name} (${roleLabel})`,
      note: note.trim() || (verdict === "approve" ? "Endorsed without additional remarks." : "Declined."),
    },
  ];

  const updatedLetter = {
    ...letter,
    status: newStatus,
    decisions: updatedDecisions,
    timeline: updatedTimeline,
    updatedAt: nowIso,
  };

  letters[idx] = updatedLetter;
  setPersistentMock(STORAGE_KEYS.LETTERS, letters);

  // Notify student & warden
  try {
    await notificationService.createNotification({
      userId: letter.studentId,
      studentId: letter.studentId,
      type: "announcement",
      category: "pass",
      title: `Special Letter ${verdict === "approve" ? "Endorsed" : "Declined"}`,
      message: `Your permission letter "${letter.subject}" has been ${verdict === "approve" ? "endorsed" : "declined"} by ${caller.name} (${roleLabel}).`,
      author: `${caller.name} (${roleLabel})`,
    });
  } catch (e) {}

  return successResponse(updatedLetter);
}

/**
 * Undo recent decision within undo window
 * @param {object} params
 * @param {string} params.letterId
 */
export async function undoDecision({ letterId } = {}) {
  await simulateLatency(200, 350);

  const policy = getPolicy();
  const approverMode = policy.studentLetters?.approverMode || "either";

  const caller = getActiveCaller();
  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);
  const idx = letters.findIndex((l) => l.id === letterId || l.letterNumber === letterId);
  if (idx === -1) {
    return errorResponse("NOT_FOUND", "Letter record not found.");
  }

  const letter = letters[idx];
  const updatedDecisions = (letter.decisions || []).filter((d) => d.byRole !== caller.role);
  const newStatus = evaluateLetterStatus(updatedDecisions, approverMode);

  const nowIso = new Date().toISOString();
  const roleLabel = caller.role === ROLES.PRINCIPAL ? "Principal" : "Correspondent";

  const updatedTimeline = [
    ...(letter.timeline || []),
    {
      status: "undo",
      label: `Decision Reverted by ${roleLabel}`,
      timestamp: nowIso,
      actor: `${caller.name} (${roleLabel})`,
      note: "Endorsement decision rolled back.",
    },
  ];

  const updatedLetter = {
    ...letter,
    status: newStatus,
    decisions: updatedDecisions,
    timeline: updatedTimeline,
    updatedAt: nowIso,
  };

  letters[idx] = updatedLetter;
  setPersistentMock(STORAGE_KEYS.LETTERS, letters);

  return successResponse(updatedLetter);
}

/**
 * Check if a pass has an approved letter satisfying the active approverMode
 * @param {object} params
 * @param {string} [params.passId]
 * @param {string} [params.letterId]
 * @returns {object} { satisfied: boolean, reason?: string, letter?: object }
 */
export function isLetterSatisfied({ passId, letterId } = {}) {
  const policy = getPolicy();
  if (!policy.studentLetters?.enabled) {
    return { satisfied: true, reason: "Letters module is disabled" };
  }

  const approverMode = policy.studentLetters?.approverMode || "either";
  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);

  let targetLetter = null;
  if (letterId) {
    targetLetter = letters.find((l) => l.id === letterId || l.letterNumber === letterId);
  } else if (passId) {
    targetLetter = letters.find((l) => l.linkedPassId === passId);
  }

  if (!targetLetter) {
    return {
      satisfied: false,
      reason: "No special permission letter linked to this pass.",
    };
  }

  const status = evaluateLetterStatus(targetLetter.decisions || [], approverMode);
  if (status === LETTER_STATUSES.APPROVED) {
    return {
      satisfied: true,
      letter: targetLetter,
      reason: "Approved letter verified.",
    };
  }

  return {
    satisfied: false,
    letter: targetLetter,
    reason: `Letter is currently in '${status}' status (Needs approval under '${approverMode}' mode).`,
  };
}

/**
 * Return summary statistics for letters queue and widgets
 */
export async function getStats() {
  await simulateLatency(100, 200);
  const letters = getPersistentMock(STORAGE_KEYS.LETTERS, MOCK_LETTERS);

  return successResponse({
    total: letters.length,
    awaiting: letters.filter((l) => l.status === LETTER_STATUSES.SUBMITTED).length,
    approved: letters.filter((l) => l.status === LETTER_STATUSES.APPROVED).length,
    declined: letters.filter((l) => l.status === LETTER_STATUSES.DECLINED).length,
    withdrawn: letters.filter((l) => l.status === LETTER_STATUSES.WITHDRAWN).length,
  });
}

export const letterService = {
  list,
  getById,
  submit,
  withdraw,
  decide,
  undoDecision,
  isLetterSatisfied,
  getStats,
  evaluateLetterStatus,
};

export default letterService;
