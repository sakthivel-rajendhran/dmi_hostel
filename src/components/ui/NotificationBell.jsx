"use client";

import React, { useState } from "react";
import { Bell, Check, Clock } from "lucide-react";
import { useNotifications, useMarkAllNotificationsRead } from "@/hooks/queries/useNotifications.js";
import { DropdownMenu } from "./DropdownMenu.jsx";
import { timeAgo } from "@/lib/utils/format.js";

export function NotificationBell({ className = "" }) {
  const { data: notifications = [] } = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <div className={className}>
      <DropdownMenu
        trigger={trigger}
        align="right"
        className="w-80 sm:w-96 p-0"
        items={[
          {
            label: (
              <div className="p-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between w-full">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAll.mutate();
                    }}
                    className="text-xs font-semibold text-primary-blue dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
            ),
          },
          ...notifications.slice(0, 5).map((n) => ({
            label: (
              <div className={`p-3 space-y-1 w-full text-left rounded-xl transition-colors ${!n.read ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{n.title}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(n.date)}</span>
                </div>
                <p className="text-xs text-text-muted dark:text-slate-400 line-clamp-2">{n.message}</p>
              </div>
            ),
          })),
        ]}
      />
    </div>
  );
}

export default NotificationBell;
