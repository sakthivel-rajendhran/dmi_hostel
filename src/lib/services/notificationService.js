/**
 * Notification Service
 * Manages announcements, circulars and resident alerts.
 */

import { MOCK_NOTIFICATIONS, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { simulateLatency, successResponse } from "./base.js";

/**
 * List notifications
 * @param {object} [params]
 * @param {boolean} [params.unreadOnly=false]
 * @param {string} [params.studentId=""]
 * @param {string} [params.category=""]
 */
export async function listNotifications({ unreadOnly = false, studentId = "", category = "" } = {}) {
  await simulateLatency(150, 250);
  // TODO(BACKEND): replace with Supabase call `supabase.from('notifications').select('*').order('created_at', { ascending: false })`
  const notifs = getPersistentMock(STORAGE_KEYS.NOTIFS, MOCK_NOTIFICATIONS);

  let filtered = [...notifs];

  if (studentId) {
    filtered = filtered.filter((n) => !n.studentId || n.studentId === studentId || n.targetRole === "all" || n.targetRole === "student");
  }

  if (category && category !== "all") {
    filtered = filtered.filter((n) => n.category === category || n.type === category);
  }

  if (unreadOnly) {
    filtered = filtered.filter((n) => !n.read);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  return successResponse(filtered);
}

/**
 * Mark a single notification as read
 * @param {string} notifId
 */
export async function markNotificationRead(notifId) {
  const notifs = getPersistentMock(STORAGE_KEYS.NOTIFS, MOCK_NOTIFICATIONS);
  const updated = notifs.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  setPersistentMock(STORAGE_KEYS.NOTIFS, updated);
  return successResponse({ id: notifId, read: true });
}

export const markRead = markNotificationRead;

/**
 * Mark all notifications as read
 * @param {string} [studentId]
 */
export async function markAllNotificationsRead(studentId = "") {
  const notifs = getPersistentMock(STORAGE_KEYS.NOTIFS, MOCK_NOTIFICATIONS);
  const updated = notifs.map((n) => {
    if (!studentId || !n.studentId || n.studentId === studentId) {
      return { ...n, read: true };
    }
    return n;
  });
  setPersistentMock(STORAGE_KEYS.NOTIFS, updated);
  return successResponse({ count: updated.length });
}

export const markAllRead = markAllNotificationsRead;

/**
 * Dismiss / remove a single notification
 * @param {string} notifId
 */
export async function dismissNotification(notifId) {
  const notifs = getPersistentMock(STORAGE_KEYS.NOTIFS, MOCK_NOTIFICATIONS);
  const updated = notifs.filter((n) => n.id !== notifId);
  setPersistentMock(STORAGE_KEYS.NOTIFS, updated);
  return successResponse({ id: notifId, dismissed: true });
}

export const dismiss = dismissNotification;

/**
 * Broadcast an announcement or circular
 * @param {object} notifData
 */
export async function sendNotification(notifData) {
  await simulateLatency(300, 500);
  const notifs = getPersistentMock(STORAGE_KEYS.NOTIFS, MOCK_NOTIFICATIONS);
  const newNotif = {
    ...notifData,
    id: `NOTIF-${String(notifs.length + 1).padStart(2, "0")}`,
    date: new Date().toISOString(),
    read: false,
  };
  const updated = [newNotif, ...notifs];
  setPersistentMock(STORAGE_KEYS.NOTIFS, updated);
  return successResponse(newNotif);
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
