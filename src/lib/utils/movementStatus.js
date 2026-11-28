/**
 * Authoritative Outpass Movement Status Utility
 *
 * Source of truth: MySQL database fields (status, actual_exit_time, actual_return_time)
 *
 * WORKFLOW STATES:
 * - NOT_EXITED: Outpass approved/issued, no actual exit recorded yet. Button: "Scan to OUT"
 * - OUTSIDE_CAMPUS: Actual exit timestamp recorded or status OUT/OVERDUE, no return recorded. Button: "Scan at Gate to RE-ENTER"
 * - RETURNED: Actual return timestamp recorded or status RETURNED. Display: "PASS COMPLETED"
 */

export const MOVEMENT_STATES = {
  NOT_EXITED: "NOT_EXITED",
  OUTSIDE_CAMPUS: "OUTSIDE_CAMPUS",
  RETURNED: "RETURNED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  UNKNOWN: "UNKNOWN",
};

/**
 * Determine the exact movement state of an outpass record.
 * @param {object} pass
 * @returns {string} One of MOVEMENT_STATES
 */
export function getMovementStatus(pass) {
  if (!pass) return MOVEMENT_STATES.UNKNOWN;

  const rawStatus = (pass.status || pass.overallStatus || pass.rawStatus || "").toLowerCase();
  const hasExit = Boolean(pass.actualExitTime || pass.actual_exit_time);
  const hasReturn = Boolean(pass.actualReturnTime || pass.actual_return_time || pass.actualEntryTime || pass.actual_entry_time);

  // STATE 3: RETURNED
  if (rawStatus === "returned" || hasReturn) {
    return MOVEMENT_STATES.RETURNED;
  }

  // STATE 2: OUTSIDE CAMPUS
  if (rawStatus === "out" || rawStatus === "overdue" || (hasExit && !hasReturn)) {
    return MOVEMENT_STATES.OUTSIDE_CAMPUS;
  }

  // STATE 1: APPROVED, NOT YET EXITED
  if (["approved", "gate_pass_issued"].includes(rawStatus)) {
    return MOVEMENT_STATES.NOT_EXITED;
  }

  if (["pending", "recommended", "applied", "pending_staff", "pending_warden"].includes(rawStatus)) {
    return MOVEMENT_STATES.PENDING;
  }

  if (["rejected", "staff_rejected", "warden_rejected"].includes(rawStatus)) {
    return MOVEMENT_STATES.REJECTED;
  }

  if (["cancelled", "expired"].includes(rawStatus)) {
    return MOVEMENT_STATES.CANCELLED;
  }

  return rawStatus ? rawStatus.toUpperCase() : MOVEMENT_STATES.UNKNOWN;
}
