/**
 * DMI College Hostel Management PWA - Pass Status Map
 * Single source of truth for outpass statuses, visual color tokens, and badge definitions.
 */

export const PASS_STATUSES = {
  PENDING: "pending",
  PENDING_STAFF: "pending_staff",
  PENDING_WARDEN: "pending_warden",
  RECOMMENDED: "recommended",
  APPROVED: "approved",
  REJECTED: "rejected",
  GATE_PASS_ISSUED: "gate_pass_issued",
  OUT: "out",
  RETURNED: "returned",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
};

export const STATUS_CONFIG = {
  [PASS_STATUSES.PENDING]: {
    key: "pending",
    label: "Pending",
    badge: "Amber",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    textClass: "text-amber-800 dark:text-amber-300",
    icon: "Clock",
  },
  [PASS_STATUSES.PENDING_STAFF]: {
    key: "pending_staff",
    label: "Pending Staff Review",
    badge: "Amber",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    textClass: "text-amber-800 dark:text-amber-300",
    icon: "Clock",
  },
  [PASS_STATUSES.PENDING_WARDEN]: {
    key: "pending_warden",
    label: "Pending Warden Approval",
    badge: "Sky",
    dotClass: "bg-sky-500",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    borderClass: "border-sky-200 dark:border-sky-800/60",
    textClass: "text-sky-800 dark:text-sky-300",
    icon: "UserCheck",
  },
  [PASS_STATUSES.RECOMMENDED]: {
    key: "recommended",
    label: "Recommended",
    badge: "Sky",
    dotClass: "bg-sky-500",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    borderClass: "border-sky-200 dark:border-sky-800/60",
    textClass: "text-sky-800 dark:text-sky-300",
    icon: "UserCheck",
  },
  [PASS_STATUSES.APPROVED]: {
    key: "approved",
    label: "Approved",
    badge: "Emerald",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800/60",
    textClass: "text-emerald-800 dark:text-emerald-300",
    icon: "CheckCircle2",
  },
  [PASS_STATUSES.REJECTED]: {
    key: "rejected",
    label: "Rejected",
    badge: "Rose",
    dotClass: "bg-rose-500",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    textClass: "text-rose-800 dark:text-rose-300",
    icon: "XCircle",
  },
  [PASS_STATUSES.GATE_PASS_ISSUED]: {
    key: "gate_pass_issued",
    label: "Gate Pass Issued",
    badge: "Indigo",
    dotClass: "bg-indigo-500",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    borderClass: "border-indigo-200 dark:border-indigo-800/60",
    textClass: "text-indigo-800 dark:text-indigo-300",
    icon: "QrCode",
  },
  [PASS_STATUSES.OUT]: {
    key: "out",
    label: "Outside Campus",
    badge: "Violet",
    dotClass: "bg-violet-500",
    bgClass: "bg-violet-50 dark:bg-violet-950/40",
    borderClass: "border-violet-200 dark:border-violet-800/60",
    textClass: "text-violet-800 dark:text-violet-300",
    icon: "ArrowUpRight",
  },
  [PASS_STATUSES.RETURNED]: {
    key: "returned",
    label: "Returned",
    badge: "Slate-Green",
    dotClass: "bg-teal-600",
    bgClass: "bg-teal-50 dark:bg-teal-950/40",
    borderClass: "border-teal-200 dark:border-teal-800/60",
    textClass: "text-teal-800 dark:text-teal-300",
    icon: "Check",
  },
  [PASS_STATUSES.OVERDUE]: {
    key: "overdue",
    label: "Overdue Return",
    badge: "Red",
    dotClass: "bg-red-600 animate-ping",
    bgClass: "bg-red-50 dark:bg-red-950/40",
    borderClass: "border-red-300 dark:border-red-800/70",
    textClass: "text-red-700 dark:text-red-300 font-semibold",
    hasPulsingDot: true,
    icon: "AlertTriangle",
  },
  [PASS_STATUSES.CANCELLED]: {
    key: "cancelled",
    label: "Cancelled",
    badge: "Gray",
    dotClass: "bg-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800/50",
    borderClass: "border-slate-200 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-400",
    icon: "Ban",
  },
};

/**
 * Get configuration for a status key (case-insensitive safe)
 * @param {string} statusKey
 */
export function getStatusConfig(statusKey) {
  if (!statusKey) return STATUS_CONFIG[PASS_STATUSES.PENDING];
  const normalized = statusKey.toLowerCase().replace(/[\s-]/g, "_");
  return STATUS_CONFIG[normalized] || STATUS_CONFIG[PASS_STATUSES.PENDING];
}

export default STATUS_CONFIG;

export const ALL_STATUSES = Object.values(PASS_STATUSES);

/**
 * Student Letters Statuses and Config (Optional Phase 5 Module)
 */
export const LETTER_STATUSES = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  DECLINED: "declined",
  WITHDRAWN: "withdrawn",
  EXPIRED: "expired",
};

export const LETTER_STATUS_CONFIG = {
  [LETTER_STATUSES.SUBMITTED]: {
    key: "submitted",
    label: "Under Review",
    badge: "Amber",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    textClass: "text-amber-800 dark:text-amber-300",
    icon: "Clock",
  },
  [LETTER_STATUSES.APPROVED]: {
    key: "approved",
    label: "Approved",
    badge: "Emerald",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800/60",
    textClass: "text-emerald-800 dark:text-emerald-300",
    icon: "CheckCircle2",
  },
  [LETTER_STATUSES.DECLINED]: {
    key: "declined",
    label: "Declined",
    badge: "Rose",
    dotClass: "bg-rose-500",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    textClass: "text-rose-800 dark:text-rose-300",
    icon: "XCircle",
  },
  [LETTER_STATUSES.WITHDRAWN]: {
    key: "withdrawn",
    label: "Withdrawn",
    badge: "Gray",
    dotClass: "bg-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800/50",
    borderClass: "border-slate-200 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-400",
    icon: "Ban",
  },
  [LETTER_STATUSES.EXPIRED]: {
    key: "expired",
    label: "Expired",
    badge: "Gray",
    dotClass: "bg-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800/50",
    borderClass: "border-slate-200 dark:border-slate-700",
    textClass: "text-slate-600 dark:text-slate-400",
    icon: "Clock",
  },
};

export function getLetterStatusConfig(statusKey) {
  if (!statusKey) return LETTER_STATUS_CONFIG[LETTER_STATUSES.SUBMITTED];
  const normalized = statusKey.toLowerCase().replace(/[\s-]/g, "_");
  return LETTER_STATUS_CONFIG[normalized] || LETTER_STATUS_CONFIG[LETTER_STATUSES.SUBMITTED];
}
