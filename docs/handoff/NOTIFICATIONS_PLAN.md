# DMI College Hostel Management PWA — Push & In-App Notifications Plan

## 1. Multi-Tier Notification Architecture

1. **In-App Notification Center**:
   - Polled / Realtime notification feed displayed in top navbar bell popover (`/components/ui/NotificationBell.jsx`) and dedicated screen (`/student/notifications`).
   - Grouped by category (`pass`, `curfew`, `announcement`, `system`).
   - Tracks `isRead: boolean`, unread badge count, and deep-link click routing.
2. **Web Push (PWA & Mobile Browsers)**:
   - Web Push API integration stubbed in `src/lib/services/pushService.js`.
   - VAPID key exchange via `pushService.subscribeToPush()`.
   - Background push handler in Service Worker (`/public/sw.js`).

---

## 2. Notification Trigger Events

| Event Trigger | Recipient Role | Push Title | Push Message Body | Deep Link |
| :--- | :--- | :--- | :--- | :--- |
| **Pass Recommended** | Warden | Advisory Update | *"{staffName} recommended pass #{passNumber} for {studentName}."* | `/warden/approvals` |
| **Pass Approved** | Student | Pass Approved! | *"Your outpass request has been approved by Chief Warden."* | `/student/passes/{id}` |
| **Gate Pass Issued** | Student | Gate Pass Active | *"Your Digital Gate Pass is now active. You may scan at the Main Gate."* | `/student/scan` |
| **Pass Rejected** | Student | Pass Rejected | *"Your outpass request was rejected: {wardenReason}"* | `/student/passes/{id}` |
| **Curfew Reminder** | Student (Out) | Return Reminder | *"Curfew warning: Please return to campus within 30 minutes (before 9:00 PM)."* | `/student/scan` |
| **Pass Overdue** | Student, Warden, Guardian | Curfew Overdue | *"ALERT: Student {studentName} is overdue by {lateMinutes} minutes."* | `/warden/security-log` |

---

## 3. Backend Implementation (FCM / Web Push)

```typescript
// Backend server-side notification dispatcher (Node.js)
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendNotificationToUser(userId: string, payload: object) {
  const subscriptions = await getSubscriptionsForUser(userId);
  for (const sub of subscriptions) {
    await webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
      if (err.statusCode === 410) deleteSubscription(sub.endpoint);
    });
  }
}
```
