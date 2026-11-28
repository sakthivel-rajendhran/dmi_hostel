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
  Megaphone,
  ShieldCheck,
  ShieldAlert,
  FileText,
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
import { cn } from "@/lib/utils/cn.js";
import {
  getNotificationVisual,
  getSafeNotificationContent,
} from "@/lib/utils/notificationIcons.js";

const NOTIF_FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "pass", label: "Pass Updates" },
  { id: "announcement", label: "College Announcements" },
];

export default function StudentNotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "";

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
      result = result.filter((n) => n.category === "announcement" || n.type === "announcement" || (!n.passId && !n.type?.startsWith("pass_")));
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

  // Helper to determine notification card styling, badges, and icon
  const getCardMetadata = (notif) => {
    const visual = getNotificationVisual(notif);
    const type = (notif.type || "").toLowerCase();
    const isAnnouncement = visual.label === "ANNOUNCEMENT" || type === "announcement";

    return {
      isAnnouncement,
      categoryTag: isAnnouncement ? "COLLEGE ANNOUNCEMENT" : "PASS UPDATE",
      tagClass: isAnnouncement
        ? "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
        : "bg-indigo-100 dark:bg-indigo-950/70 text-primary dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      borderClass: visual.cardBorder,
      icon: visual.icon,
      iconBg: `${visual.bgClass} ${visual.iconColor}`,
      statusBadge: isAnnouncement
        ? null
        : {
            label: visual.label,
            class: visual.badgeClass,
          },
    };
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
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
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
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
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
              <div key={groupTitle} className="space-y-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 block">
                  {groupTitle} ({items.length})
                </span>

                <div className="space-y-2.5">
                  {items.map((notif) => {
                    const meta = getCardMetadata(notif);
                    const IconComponent = meta.icon;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-xs",
                          meta.borderClass,
                          !notif.read
                            ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-l-4 border-l-primary"
                            : "bg-white dark:bg-slate-900/80"
                        )}
                      >
                        {/* Top Metadata Row: Tags, Badges & Timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Category Tag */}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                meta.tagClass
                              )}
                            >
                              {meta.isAnnouncement && <Megaphone className="w-3 h-3" />}
                              {meta.categoryTag}
                            </span>

                            {/* Status Badge */}
                            {meta.statusBadge && (
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                                  meta.statusBadge.class
                                )}
                              >
                                {meta.statusBadge.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Timestamp */}
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                              {timeAgo(notif.date || notif.createdAt)}
                            </span>

                            {/* Unread Indicator */}
                            {!notif.read && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                New
                              </span>
                            )}

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
                        </div>

                        {/* Card Body: Icon & Message Details */}
                        <div className="flex items-start gap-3.5">
                          {/* Category Icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5",
                              meta.iconBg
                            )}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            {(() => {
                              const { title, message } = getSafeNotificationContent(notif);
                              return (
                                <>
                                  <h4
                                    className={cn(
                                      "text-sm leading-snug",
                                      !notif.read
                                        ? "font-extrabold text-slate-900 dark:text-white"
                                        : "font-bold text-slate-800 dark:text-slate-200"
                                    )}
                                  >
                                    {title}
                                  </h4>

                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {message}
                                  </p>
                                </>
                              );
                            })()}

                            {/* Footer Information & Deep Links */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">
                                {meta.isAnnouncement
                                  ? "DMI Hostel Management Circular"
                                  : notif.passId
                                  ? `Pass Reference #${notif.passId}`
                                  : "Hostel Authority Clearance"}
                              </span>

                              {notif.passId && (
                                <span className="text-primary dark:text-indigo-400 font-bold inline-flex items-center gap-0.5 group-hover:underline">
                                  View Pass Details <ChevronRight className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
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
