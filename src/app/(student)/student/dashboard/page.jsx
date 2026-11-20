"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  PlusCircle,
  QrCode,
  User,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  Calendar,
  MapPin,
  Bell,
  Shield,
  Home,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useStudentPasses, useMyActivePass } from "@/hooks/queries/usePasses.js";
import { useMyNotifications } from "@/hooks/queries/useNotifications.js";
import { useMyProfile } from "@/hooks/queries/useStudents.js";
import { useCountdownTimer } from "@/hooks/useCountdownTimer.js";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ProfileCompletenessBanner } from "@/components/student/ProfileCompletenessBanner.jsx";
import { formatDateTime, timeAgo } from "@/lib/utils/format.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { PASS_STATUSES } from "@/config/status.js";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys.js";
import { cn } from "@/lib/utils/cn.js";

/* ─────────────────────────── Active Pass Card ─────────────────────────── */

function ActivePassCard({ pass }) {
  const { isOverdue, text: countdownText } = useCountdownTimer(
    pass.expectedReturnTime || pass.toTime
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
        isOverdue
          ? "border-red-400 bg-gradient-to-br from-red-50 via-white to-rose-50 dark:border-red-500/50 dark:from-red-950/30 dark:via-slate-900 dark:to-red-950/20"
          : "border-primary/30 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 dark:border-indigo-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30"
      )}
    >
      {/* Accent strip */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isOverdue
            ? "bg-red-500 animate-pulse"
            : "bg-gradient-to-r from-primary to-indigo-500"
        )}
      />

      <div className="p-4 sm:p-5 space-y-3">
        {/* Header: Pass Number + Type + Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {pass.passNumber || pass.id}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
              {pass.type}
            </span>
          </div>
          <StatusChip status={pass.status} />
        </div>

        {/* Destination */}
        <div>
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm sm:text-base">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{pass.destination}</span>
          </div>
          {pass.reason && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 ml-[22px]">
              {pass.reason}
            </p>
          )}
        </div>

        {/* Timings */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
              Exit Time
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
              Expected Return
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
            </span>
          </div>
        </div>

        {/* Live Countdown */}
        <div
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl font-mono text-xs font-bold",
            isOverdue
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className={cn("w-4 h-4", isOverdue ? "text-red-600" : "text-indigo-600")} />
            <span>{countdownText}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-sans font-bold">
            {isOverdue ? "Curfew Exceeded" : "Until Curfew"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {["gate_pass_issued", "out", "overdue"].includes(pass.status) ? (
            <Link href="/student/scan" className="flex-1">
              <Button variant="primary" size="sm" className="w-full text-xs font-bold" iconLeft={QrCode}>
                {pass.status === "gate_pass_issued" ? "Scan to EXIT" : "Scan to RE-ENTER"}
              </Button>
            </Link>
          ) : (
            <Link href={`/student/passes/${pass.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold" iconLeft={Clock}>
                Waiting for Approval
              </Button>
            </Link>
          )}
          <Link href={`/student/passes/${pass.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full text-xs font-bold" iconRight={ChevronRight}>
              Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Quick Action Tile ──────────────────────────── */

function QuickActionTile({ href, icon: Icon, label, sublabel, color, badge }) {
  return (
    <Link href={href} className="block group">
      <Card className="p-3.5 hover:border-primary/40 transition-all duration-200 group-hover:shadow-md h-full flex flex-col justify-between relative">
        {badge > 0 && (
          <span className="absolute top-2.5 right-2.5 min-w-[20px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold text-center shadow-sm">
            {badge}
          </span>
        )}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform",
            color
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
            {label}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {sublabel}
          </span>
        </div>
      </Card>
    </Link>
  );
}

/* ═══════════════════════ Main Dashboard Page ═════════════════════════ */

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const studentId = user?.studentId || user?.id || "CSE-3-001";

  /* ── Data Hooks ── */
  const { data: profile } = useMyProfile(studentId);
  const { data: passes = [], isLoading: passesLoading } = useStudentPasses(studentId);
  const { data: activePass, isLoading: activeLoading } = useMyActivePass(studentId);
  const { data: notifications = [] } = useMyNotifications(studentId);

  /* ── Computed Values ── */
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  const displayName = profile?.name || user?.name || "Student";
  const displayId = profile?.studentId || user?.studentId || "—";
  const displayDept = profile?.department || user?.department || "—";
  const displayYear = profile?.year || user?.year || "—";
  const displayRoom = profile?.roomNo || profile?.room || user?.roomNo || user?.room;
  const displayFloor = profile?.floorLabel || user?.floorLabel;

  // Campus status
  let campusStatus = { label: "In Campus", variant: "success", dotClass: "bg-emerald-500" };
  if (activePass?.status === PASS_STATUSES.OVERDUE) {
    campusStatus = { label: "Overdue", variant: "danger", dotClass: "bg-red-500 animate-ping" };
  } else if (activePass?.status === PASS_STATUSES.OUT) {
    const isHome = (activePass.type || "").toLowerCase().includes("home");
    campusStatus = {
      label: isHome ? "Out (Home)" : "Out (Local)",
      variant: "warning",
      dotClass: "bg-amber-500",
    };
  }

  const campusBadgeClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700",
    danger: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700",
    warning: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  };

  // Pending count
  const pendingCount = passes.filter(
    (p) => p.status === PASS_STATUSES.PENDING || p.status === PASS_STATUSES.RECOMMENDED
  ).length;

  // Monthly home pass usage
  const now = new Date();
  const homePassesThisMonth = passes.filter((p) => {
    if (!(p.type || "").toLowerCase().includes("home")) return false;
    if (p.status === PASS_STATUSES.REJECTED || p.status === PASS_STATUSES.CANCELLED) return false;
    const d = new Date(p.fromTime || p.departureTime || p.appliedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const maxHomePasses = WORKFLOW_CONFIG.maxHomePassesPerMonth || 2;
  const homePassPct = Math.min((homePassesThisMonth / maxHomePasses) * 100, 100);

  // Recent data
  const recentPasses = passes.slice(0, 3);
  const recentNotifications = notifications.slice(0, 4);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  /* ═══════════════════════════ RENDER ═══════════════════════════════ */

  return (
    <div className="space-y-5 pb-4">
      {/* ── Breadcrumb + Refresh ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Student Dashboard
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          <span>{isRefreshing ? "Updating…" : "Refresh"}</span>
        </button>
      </div>

      {/* ── Profile Completeness Banner ── */}
      <ProfileCompletenessBanner />

      {/* ═══════ 12-col Grid: Left (8) | Right (4) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div className="space-y-5 lg:col-span-8">
          {/* ── 1. Greeting Hero Card ── */}
          <section
            aria-label="Student identity"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-indigo-800 p-5 sm:p-6 text-white shadow-lg"
          >
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-amber-400/10 blur-xl" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-semibold tracking-wider text-indigo-200">
                    {greeting},
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 truncate">
                    {displayName}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                      {displayId}
                    </span>
                    <span className="text-indigo-100 font-medium">
                      {displayDept} · Year {displayYear}
                    </span>
                    {displayRoom && (
                      <span className="text-indigo-100 font-medium">
                        · {displayFloor ? `${displayFloor} · ` : ""}Room {displayRoom}
                      </span>
                    )}
                  </div>
                </div>

                <Link href="/student/profile" className="shrink-0" aria-label="View profile">
                  <Avatar
                    name={displayName}
                    size="lg"
                    className="ring-2 ring-white/40 cursor-pointer shadow-md"
                  />
                </Link>
              </div>

              {/* Campus Status */}
              <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs text-indigo-200 font-medium">Current Status:</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm",
                    campusBadgeClasses[campusStatus.variant]
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", campusStatus.dotClass)} />
                  {campusStatus.label}
                </span>
              </div>
            </div>
          </section>

          {/* ── 2. Active Outpass (or Empty State) ── */}
          <section aria-labelledby="active-pass-heading">
            <h3
              id="active-pass-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Active Outpass
            </h3>

            {activeLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : activePass ? (
              <ActivePassCard pass={activePass} />
            ) : (
              <Card className="p-6 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-primary mb-3">
                    <Ticket className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    No Active Outpass
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                    You&apos;re currently inside the hostel campus. Need to step out?
                  </p>
                  <div className="mt-4">
                    <Link href="/student/apply">
                      <Button variant="primary" size="sm" iconLeft={PlusCircle} className="font-bold text-xs">
                        Apply for a Pass
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </section>

          {/* ── 3. Recent Passes ── */}
          <section aria-labelledby="recent-passes-heading">
            <div className="flex items-center justify-between mb-2">
              <h3
                id="recent-passes-heading"
                className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Recent Passes
              </h3>
              <Link
                href="/student/passes"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {passesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : recentPasses.length > 0 ? (
              <div className="space-y-2">
                {recentPasses.map((p) => (
                  <Link key={p.id} href={`/student/passes/${p.id}`} className="block group">
                    <Card className="p-3.5 hover:border-primary/40 transition flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {p.passNumber || p.id}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            • {p.type}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {p.destination}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDateTime(p.departureTime || p.fromTime, "dd MMM, hh:mm a")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusChip status={p.status} />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-5 text-center">
                <div className="flex flex-col items-center py-2">
                  <Ticket className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No pass applications on record yet.
                  </p>
                  <Link href="/student/apply" className="mt-3">
                    <Button variant="outline" size="sm" className="text-xs font-bold">
                      Apply for your first pass
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </section>
        </div>

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <div className="space-y-5 lg:col-span-4">
          {/* ── 4. Quick Actions ── */}
          <section aria-labelledby="quick-actions-heading">
            <h3
              id="quick-actions-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickActionTile
                href="/student/apply"
                icon={PlusCircle}
                label="Apply Pass"
                sublabel="Local or Home"
                color="bg-primary/10 text-primary"
              />
              <QuickActionTile
                href="/student/passes"
                icon={Ticket}
                label="My Passes"
                sublabel="History & Status"
                color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                badge={pendingCount}
              />
              <QuickActionTile
                href="/student/scan"
                icon={QrCode}
                label="Scan Gate QR"
                sublabel="Exit & Check-in"
                color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
              />
              <QuickActionTile
                href="/student/profile"
                icon={User}
                label="My Profile"
                sublabel="Hostel & Room"
                color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </section>

          {/* ── 5. Pass Allowance & Curfew ── */}
          <section aria-labelledby="allowance-heading">
            <h3
              id="allowance-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2"
            >
              Pass Allowance & Curfew
            </h3>
            <Card className="p-4 space-y-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900/80 dark:to-slate-800/60 border-slate-200/80 dark:border-slate-800">
              {/* Home pass progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Home passes this month:
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {homePassesThisMonth} of {maxHomePasses} used
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      homePassesThisMonth >= maxHomePasses ? "bg-red-500" : "bg-primary"
                    )}
                    style={{ width: `${homePassPct}%` }}
                  />
                </div>
              </div>

              {/* Curfew */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Curfew return deadline:</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"} (9:00 PM)
                </span>
              </div>
            </Card>
          </section>

          {/* ── 6. Recent Notifications ── */}
          <section aria-labelledby="recent-notifs-heading">
            <div className="flex items-center justify-between mb-2">
              <h3
                id="recent-notifs-heading"
                className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 rounded-full bg-primary text-white text-[9px] font-extrabold align-middle">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <Link
                href="/student/notifications"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentNotifications.length > 0 ? (
              <div className="space-y-2">
                {recentNotifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.passId ? `/student/passes/${n.passId}` : "/student/notifications"}
                    className="block"
                  >
                    <Card
                      className={cn(
                        "p-3 transition hover:border-primary/40",
                        !n.read &&
                          "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {n.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                            {n.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                          {timeAgo(n.date)}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center">
                <div className="flex flex-col items-center py-2">
                  <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No recent notices.</p>
                </div>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
