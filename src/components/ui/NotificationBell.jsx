"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/queries/useNotifications.js";
import { useAuth } from "@/hooks/use-auth.js";
import { DropdownMenu } from "./DropdownMenu.jsx";
import { timeAgo } from "@/lib/utils/format.js";
import {
  getNotificationVisual,
  getSafeNotificationContent,
} from "@/lib/utils/notificationIcons.js";

export function NotificationBell({ className = "" }) {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "";

  // Scope to student if authenticated as a student
  const { data: notifications = [] } = useNotifications(
    studentId ? { studentId } : {}
  );
  const markAll = useMarkAllNotificationsRead();
  const markSingle = useMarkNotificationRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (arg1, arg2) => {
    // Resolve notification object regardless of argument order or missing event
    const notif =
      (arg2 && typeof arg2 === "object" && arg2.id ? arg2 : null) ||
      (arg1 && typeof arg1 === "object" && arg1.id ? arg1 : null);

    if (!notif) return;

    if (!notif.read && notif.id) {
      markSingle.mutate(notif.id);
    }
    if (notif.passId) {
      router.push(`/student/passes/${notif.passId}`);
    } else if (user?.role === "student") {
      router.push("/student/notifications");
    }
  };

  const trigger = (
    <button
      type="button"
      className="relative p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
      aria-label="View notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  const notificationItems =
    notifications.length === 0
      ? [
          {
            as: "div",
            className: "p-0",
            label: (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No notifications yet
              </div>
            ),
          },
        ]
      : notifications.slice(0, 5).map((n) => {
          const { icon: Icon, iconColor, bgClass } = getNotificationVisual(n);
          const { title, message } = getSafeNotificationContent(n);

          return {
            as: "div",
            className: "p-0",
            onClick: () => handleNotificationClick(n),
            label: (
              <div
                className={`p-3 w-full text-left rounded-xl transition-colors flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                  !n.read ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                }`}
              >
                {/* Visual Icon Container with subtle background */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}
                >
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                      {timeAgo(n.date)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                    {message}
                  </p>
                </div>

                {/* Unread Indicator Dot */}
                {!n.read && (
                  <span
                    className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-1.5"
                    aria-label="Unread"
                  />
                )}
              </div>
            ),
          };
        });

  return (
    <div className={className}>
      <DropdownMenu
        trigger={trigger}
        align="right"
        className="w-80 sm:w-96 p-0"
        items={[
          {
            as: "div",
            className: "p-0",
            label: (
              <div className="p-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between w-full">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      markAll.mutate(studentId);
                    }}
                    className="text-xs font-semibold text-primary-blue dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
            ),
          },
          ...notificationItems,
          ...(notifications.length > 0 && user?.role === "student"
            ? [
                {
                  as: "div",
                  className: "p-0",
                  label: (
                    <div className="p-2.5 border-t border-slate-100 dark:border-white/10 text-center">
                      <Link
                        href="/student/notifications"
                        className="text-xs font-bold text-primary-blue dark:text-indigo-400 hover:underline"
                      >
                        View all notifications
                      </Link>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

export default NotificationBell;
