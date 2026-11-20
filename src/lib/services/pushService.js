/**
 * Push Notification Service (Stub)
 * Handles browser notification permissions and device push token registration.
 *
 * TODO(BACKEND): Replace client stubs with Firebase Cloud Messaging (FCM) Web SDK:
 * 1. Initialize Firebase app with `initializeApp(firebaseConfig)`
 * 2. Retrieve FCM registration token via `getToken(messaging, { vapidKey })`
 * 3. Persist registration token in Supabase table `fcm_device_tokens(user_id, token, platform, updated_at)`
 * 4. Trigger server-side push messages via Firebase Admin SDK in Edge Functions / pg_cron jobs.
 */

import { simulateLatency, successResponse, errorResponse } from "./base.js";

const PUSH_STORAGE_KEY = "dmi_push_subscribed_mock";

/**
 * Checks whether browser push notifications are supported
 * @returns {boolean}
 */
export function isSupported() {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Gets current notification permission status ('default' | 'granted' | 'denied')
 * @returns {NotificationPermission|'unsupported'}
 */
export function getPermission() {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests permission from the user to display notifications
 * @returns {Promise<{ ok: boolean, permission: string }>}
 */
export async function requestPermission() {
  if (!isSupported()) {
    return errorResponse("UNSUPPORTED", "Push notifications are not supported on this browser.");
  }

  try {
    const permission = await Notification.requestPermission();
    return successResponse({ permission });
  } catch (err) {
    return errorResponse("PERMISSION_ERROR", err.message || "Failed to request notification permission");
  }
}

/**
 * Subscribes current device to institutional push notifications
 * @returns {Promise<{ ok: boolean, data?: { token: string }, error?: string }>}
 */
export async function subscribe() {
  await simulateLatency(300, 600);

  if (!isSupported()) {
    return errorResponse("UNSUPPORTED", "Push notifications are not supported on this device.");
  }

  const permission = Notification.permission;
  if (permission !== "granted") {
    const req = await requestPermission();
    if (req.permission !== "granted") {
      return errorResponse("PERMISSION_DENIED", "Notification permission was not granted by user.");
    }
  }

  // TODO(BACKEND): replace mock token with FCM token generation:
  // const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
  // await supabase.from('fcm_device_tokens').upsert({ user_id, token, platform: 'web' });

  const mockFcmToken = `fcm_token_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  if (typeof window !== "undefined") {
    localStorage.setItem(PUSH_STORAGE_KEY, "true");
  }

  return successResponse({
    token: mockFcmToken,
    subscribed: true,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Unsubscribes current device from institutional push notifications
 * @returns {Promise<{ ok: boolean }>}
 */
export async function unsubscribe() {
  await simulateLatency(200, 400);

  // TODO(BACKEND): delete token from `fcm_device_tokens` table via Supabase RPC

  if (typeof window !== "undefined") {
    localStorage.removeItem(PUSH_STORAGE_KEY);
  }

  return successResponse({ unsubscribed: true });
}

/**
 * Checks whether user has enabled push notifications in mock store
 * @returns {boolean}
 */
export function isSubscribed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUSH_STORAGE_KEY) === "true";
}

export const pushService = {
  isSupported,
  getPermission,
  requestPermission,
  subscribe,
  unsubscribe,
  isSubscribed,
};

export default pushService;
