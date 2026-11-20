"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  XCircle,
  QrCode,
  Clock,
  AlertTriangle,
  Ticket,
  Check,
  X,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from "@/hooks/queries/useNotifications.js";
import { timeAgo, formatDateTime } from "@/lib/utils/format.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

const NOTIF_FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "pass", label: "Passes" },
  { id: "announcement", label: "Announcements" },
];

export default function StudentNotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: notifications = [], isLoading, refetch } = useMyNotifications(studentId);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const dismissMutation = useDismissNotification();

  const [activeFilter, setActiveFilter] = useState("all");

  // Filtering
  const filteredNotifs = useMemo(() => {
    let result = [...notifications];

    if (activeFilter === "unread") {
      result = result.filter((n) => !n.read);
    } else if (activeFilter === "pass") {
      result = result.filter((n) => n.category === "pass" || !!n.passId || n.type?.startsWith("pass_"));
    } else if (activeFilter === "announcement") {
      result = result.filter((n) => n.category === "announcement" || n.type === "announcement");
    }

    return result;
  }, [notifications, activeFilter]);

  // Grouping by Date (Today, Yesterday, Earlier)
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      Today: [],
      Yesterday: [],
      "Earlier Notices": [],
    };

    filteredNotifs.forEach((n) => {
      const d = new Date(n.date || n.createdAt || Date.now());
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) {
        groups.Today.push(n);
      } else if (d.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(n);
      } else {
        groups["Earlier Notices"].push(n);
      }
    });

    return groups;
  }, [filteredNotifs]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync(studentId);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark notifications.");
    }
  };

  // Handle Item Click (Mark read and deep link)
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.passId) {
      router.push(`/student/passes/${notif.passId}`);
    }
  };

  // Handle Dismiss
  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await dismissMutation.mutateAsync(id);
      toast.success("Notification dismissed.");
    } catch {
      toast.error("Failed to dismiss.");
    }
  };

  // Notification Icon & Accent Helper
  const getIconConfig = (type) => {
    switch (type) {
      case "pass_approved":
        return {
          icon: CheckCircle2,
          bgClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
        };
      case "pass_rejected":
        return {
          icon: XCircle,
          bgClass: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
        };
      case "gate_pass_issued":
        return {
          icon: QrCode,
          bgClass: "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
        };
      case "return_reminder":
        return {
          icon: Clock,
          bgClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
        };
      case "overdue_alert":
        return {
          icon: AlertTriangle,
          bgClass: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
        };
      default:
        return {
          icon: Bell,
          bgClass: "bg-primary/10 text-primary",
        };
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-[calc(var(--tabbar-h)+1.5rem)] lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/student/dashboard"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white font-mono font-bold">
                  {unreadCount} new
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hostel announcements, circulars & pass updates
            </span>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleMarkAllRead}
            leftIcon={Check}
            className="text-xs font-semibold"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {NOTIF_FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Notification Groups */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : filteredNotifs.length === 0 ? (
        /* Empty State */
        <Card className="p-8 text-center space-y-3 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-primary mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {activeFilter !== "all"
                ? `You have no ${activeFilter} notifications.`
                : "You are completely up to date with all hostel circulars and outpass alerts."}
            </p>
          </div>
          {activeFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="text-xs"
            >
              Show All Notices
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedNotifications).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupTitle} className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 block">
                  {groupTitle}
                </span>

                <div className="space-y-2">
                  {items.map((notif) => {
                    const iconConfig = getIconConfig(notif.type);
                    const IconComponent = iconConfig.icon;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex items-start gap-3 group ${
                          !notif.read
                            ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/60 shadow-xs"
                            : "bg-white dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800 hover:border-primary/40"
                        }`}
                      >
                        {/* Unread Accent Dot */}
                        {!notif.read && (
                          <div className="absolute top-3 left-2 w-2 h-2 rounded-full bg-primary" />
                        )}

                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            iconConfig.bgClass
                          } ${!notif.read ? "ml-1.5" : ""}`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4
                              className={`text-xs truncate ${
                                !notif.read
                                  ? "font-extrabold text-slate-900 dark:text-white"
                                  : "font-bold text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {timeAgo(notif.date)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Footer Info & Deep Link */}
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              {notif.author || "Hostel Office"}
                            </span>

                            {notif.passId && (
                              <span className="text-primary font-bold inline-flex items-center gap-0.5 group-hover:underline">
                                View Pass <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dismiss Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(e, notif.id)}
                          aria-label="Dismiss notification"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
