/**
 * Centralized Student Notification Visuals and Icon Mapping
 *
 * MAPPING SPECIFICATION:
 * - Pass Approved: CheckCircle2 / BadgeCheck, Green visual treatment
 * - Local Pass Submitted: FileCheck / Send, Blue visual treatment
 * - Pass Rejected: XCircle / CircleX, Red visual treatment
 * - Pass Pending: Clock / Hourglass, Amber visual treatment
 * - Pass Returned / Completed: CheckCheck, Green visual treatment
 * - Other categories (e.g. Announcement): Megaphone / Bell, Category-appropriate fallback
 */

import {
  CheckCircle2,
  FileCheck,
  XCircle,
  Clock,
  CheckCheck,
  Bell,
  Megaphone,
} from "lucide-react";

/**
 * Returns icon, visual colors, and styling classes for any notification item.
 * @param {object} notif
 */
export function getNotificationVisual(notif) {
  const type = String(notif?.type || notif?.category || "").toLowerCase();
  const title = String(notif?.title || "").toLowerCase();

  // 1. Pass Approved: CheckCircle2, Green visual treatment
  if (
    type === "pass_approved" ||
    type === "approved" ||
    title.includes("approved")
  ) {
    return {
      icon: CheckCircle2,
      label: "APPROVED",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60",
      badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      cardBorder: "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400",
      dotClass: "bg-emerald-500",
    };
  }

  // 2. Local / Home Pass Submitted: FileCheck, Blue visual treatment
  if (
    type === "pass_submitted" ||
    type === "submitted" ||
    type === "pass_applied" ||
    title.includes("submitted") ||
    title.includes("applied")
  ) {
    return {
      icon: FileCheck,
      label: "SUBMITTED",
      iconColor: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60",
      badgeClass: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      cardBorder: "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400",
      dotClass: "bg-blue-500",
    };
  }

  // 3. Pass Rejected: XCircle, Red visual treatment
  if (
    type === "pass_rejected" ||
    type === "rejected" ||
    title.includes("rejected") ||
    title.includes("declined")
  ) {
    return {
      icon: XCircle,
      label: "REJECTED",
      iconColor: "text-rose-600 dark:text-rose-400",
      bgClass: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60",
      badgeClass: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      cardBorder: "border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400",
      dotClass: "bg-rose-500",
    };
  }

  // 4. Pass Returned / Completed: CheckCheck, Green visual treatment
  if (
    type === "pass_returned" ||
    type === "pass_completed" ||
    type === "returned" ||
    type === "completed" ||
    title.includes("returned") ||
    title.includes("completed") ||
    title.includes("re-entry")
  ) {
    return {
      icon: CheckCheck,
      label: "COMPLETED",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60",
      badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      cardBorder: "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400",
      dotClass: "bg-emerald-500",
    };
  }

  // 5. Pass Pending: Clock, Amber visual treatment
  if (
    type === "pass_pending" ||
    type === "pending" ||
    title.includes("pending") ||
    title.includes("awaiting")
  ) {
    return {
      icon: Clock,
      label: "PENDING",
      iconColor: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60",
      badgeClass: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      cardBorder: "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400",
      dotClass: "bg-amber-500",
    };
  }

  // 6. Other notification categories / fallback: Megaphone / Bell
  if (type === "announcement" || title.includes("announcement")) {
    return {
      icon: Megaphone,
      label: "ANNOUNCEMENT",
      iconColor: "text-purple-600 dark:text-purple-400",
      bgClass: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60",
      badgeClass: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
      cardBorder: "border-purple-200/80 dark:border-purple-900/40 hover:border-purple-400",
      dotClass: "bg-purple-500",
    };
  }

  return {
    icon: Bell,
    label: "NOTICE",
    iconColor: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
    badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    cardBorder: "border-slate-200 dark:border-slate-800 hover:border-slate-400",
    dotClass: "bg-slate-400",
  };
}

/**
 * Returns safe fallback content ensuring neither title nor message is empty/undefined.
 * @param {object} notif
 */
export function getSafeNotificationContent(notif) {
  const rawTitle = notif?.title && String(notif.title).trim();
  const rawMessage =
    (notif?.message && String(notif.message).trim()) ||
    (notif?.body && String(notif.body).trim());

  const title = rawTitle || "Notification";
  const message = rawMessage || "You have a new notification.";

  return { title, message };
}
