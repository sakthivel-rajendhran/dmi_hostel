/**
 * Notification Service
 * Manages announcements, circulars and resident alerts backed by MySQL API.
 */

import { successResponse, errorResponse } from "./base.js";

/**
 * List notifications
 * @param {object} [params]
 * @param {boolean} [params.unreadOnly=false]
 * @param {string} [params.studentId=""]
 * @param {string} [params.category=""]
 */
export async function listNotifications({ unreadOnly = false, studentId = "", category = "" } = {}) {
  if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams();
      if (studentId) sp.set("studentId", studentId);
      if (unreadOnly) sp.set("unreadOnly", "true");
      if (category && category !== "all") sp.set("category", category);

      const res = await fetch(`/api/notifications?${sp.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          return successResponse(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch notifications from MySQL API:", e);
    }
  }

  return successResponse([]);
}

/**
 * Mark a single notification as read
 * @param {string} notifId
 */
export async function markNotificationRead(notifId) {
  if (typeof window !== "undefined" && notifId) {
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(notifId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      if (res.ok) {
        return successResponse({ id: notifId, read: true });
      }
    } catch (e) {
      console.warn("Could not mark notification read in MySQL API:", e);
    }
  }

  return successResponse({ id: notifId, read: true });
}

export const markRead = markNotificationRead;

/**
 * Mark all notifications as read
 * @param {string} [studentId]
 */
export async function markAllNotificationsRead(studentId = "") {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/notifications/all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, studentId }),
      });
      if (res.ok) {
        const json = await res.json();
        return successResponse(json);
      }
    } catch (e) {
      console.warn("Could not mark all notifications read in MySQL API:", e);
    }
  }

  return successResponse({ ok: true });
}

export const markAllRead = markAllNotificationsRead;

/**
 * Dismiss / remove a single notification
 * @param {string} notifId
 */
export async function dismissNotification(notifId) {
  if (typeof window !== "undefined" && notifId) {
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(notifId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        return successResponse({ id: notifId, dismissed: true });
      }
    } catch (e) {
      console.warn("Could not dismiss notification in MySQL API:", e);
    }
  }

  return successResponse({ id: notifId, dismissed: true });
}

export const dismiss = dismissNotification;

/**
 * Broadcast an announcement or circular / send notification
 * @param {object} notifData
 */
export async function sendNotification(notifData) {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifData),
      });
      if (res.ok) {
        const json = await res.json();
        return successResponse(json.data);
      }
    } catch (e) {
      console.warn("Could not post notification to MySQL API:", e);
    }
  }

  return errorResponse("FAILED", "Could not send notification.");
}

export const createNotification = sendNotification;

export const notificationService = {
  listNotifications,
  markNotificationRead,
  markRead,
  markAllNotificationsRead,
  markAllRead,
  dismissNotification,
  dismiss,
  sendNotification,
  createNotification,
};

export default notificationService;
