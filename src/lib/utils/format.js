/**
 * Date, time and pass ID formatting utilities
 */

import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

/**
 * Formats a pass ID or sequence into a human-friendly format
 * e.g. "DMI-PASS-2026-0042"
 * @param {string|number} passId
 * @returns {string}
 */
export function formatPassId(passId) {
  if (!passId) return "DMI-PASS-000";
  const str = String(passId);
  if (str.startsWith("DMI-")) return str;
  return `DMI-PASS-${str.padStart(4, "0")}`;
}

/**
 * Standard date & time formatter
 * @param {string|Date} date
 * @param {string} [formatStr="dd MMM yyyy, hh:mm a"]
 * @returns {string}
 */
export function formatDateTime(date, formatStr = "dd MMM yyyy, hh:mm a") {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return format(d, formatStr);
  } catch (e) {
    return "—";
  }
}

/**
 * Standard date-only formatter (e.g. "19 Nov 2026")
 * @param {string|Date} date
 * @param {string} [formatStr="dd MMM yyyy"]
 * @returns {string}
 */
export function formatDate(date, formatStr = "dd MMM yyyy") {
  return formatDateTime(date, formatStr);
}

/**
 * Relative time ago formatter (e.g. "5 minutes ago", "2 hours ago")
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return "—";
  }
}
