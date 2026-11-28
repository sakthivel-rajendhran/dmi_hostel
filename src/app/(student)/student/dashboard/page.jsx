"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  PlusCircle,
  QrCode,
  Clock,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  MapPin,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useStudentPasses, useMyActivePass } from "@/hooks/queries/usePasses.js";
import { useMyProfile } from "@/hooks/queries/useStudents.js";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ProfileCompletenessBanner } from "@/components/student/ProfileCompletenessBanner.jsx";
import StudentGreetingCard from "@/components/student/StudentGreetingCard.jsx";
import { formatDateTime } from "@/lib/utils/format.js";
import { PASS_STATUSES } from "@/config/status.js";
import { getMovementStatus, MOVEMENT_STATES } from "@/lib/utils/movementStatus.js";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys.js";
import { cn } from "@/lib/utils/cn.js";

/* ─────────────────────────── Active Pass Card ─────────────────────────── */

function ActivePassCard({ pass }) {
  const movementStatus = pass.movementStatus || getMovementStatus(pass);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-white/95 dark:bg-slate-900/95 shadow-sm transition-all duration-300">
      {/* College Main Gate Photograph Layer - Enhanced Visibility */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-38 dark:opacity-42 pointer-events-none"
        style={{ backgroundImage: "url('/images/college-gate.jpg')" }}
        aria-hidden="true"
      />

      {/* Subtle Navy-Blue & Light Overlay (Preserves strong text contrast & blue dashboard identity) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-50/65 via-white/70 to-blue-50/55 dark:from-slate-900/80 dark:via-slate-900/75 dark:to-indigo-950/70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Elegant Top Accent Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500"
        aria-hidden="true"
      />

      <div className="relative z-10 p-4 sm:p-5 space-y-3">
        {/* Header: Pass Number + Type + Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {pass.passNumber || pass.id}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 backdrop-blur-xs">
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
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/75 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-xs text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
              Exit Time
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
              Expected Return
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
            </span>
          </div>
        </div>

        {/* Actions - State-Aware Gate Scanning Actions */}
        <div className="flex gap-2 pt-1">
          {movementStatus === MOVEMENT_STATES.RETURNED ? (
            <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-center flex items-center justify-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>PASS COMPLETED</span>
            </div>
          ) : movementStatus === MOVEMENT_STATES.OUTSIDE_CAMPUS ? (
            <Link href="/student/scan" className="flex-1">
              <Button variant="primary" size="sm" className="w-full text-xs font-bold shadow-xs cursor-pointer" iconLeft={QrCode}>
                Scan at Gate to RE-ENTER
              </Button>
            </Link>
          ) : movementStatus === MOVEMENT_STATES.NOT_EXITED ? (
            <Link href="/student/scan" className="flex-1">
              <Button variant="primary" size="sm" className="w-full text-xs font-bold shadow-xs cursor-pointer" iconLeft={QrCode}>
                Scan to OUT
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

/* ═══════════════════════ Main Dashboard Page ═════════════════════════ */

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const studentId = user?.studentId || user?.id;

  /* ── Data Hooks ── */
  const { data: profile } = useMyProfile(studentId);
  const { data: passes = [], isLoading: passesLoading, refetch: refetchPasses } = useStudentPasses(studentId);
  const { data: activePass, isLoading: activeLoading, refetch: refetchActive } = useMyActivePass(studentId);

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
  const allocationStatus = profile?.allocationStatus || user?.allocationStatus || "accepted";

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

  // Recent data
  const recentPasses = passes.slice(0, 3);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPasses(),
      refetchActive(),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  /* ═══════════════════════════ RENDER ═══════════════════════════════ */

  return (
    <div className="space-y-5 pb-4 max-w-4xl mx-auto">
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

      {/* ── Hostel Allocation Status Banner ── */}
      {allocationStatus === "waiting_for_warden" && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-amber-800 dark:text-amber-300">
              Hostel Allocation Pending Review
            </div>
            <p className="mt-0.5 text-amber-700/90 dark:text-amber-300/80">
              Your resident registration has been submitted and is currently awaiting approval from the Chief Warden. You will be notified once your hostel room allocation is confirmed.
            </p>
          </div>
        </div>
      )}

      {allocationStatus === "rejected" && (
        <div className="rounded-2xl border border-red-300 dark:border-red-700/60 bg-red-50/90 dark:bg-red-950/40 p-4 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-red-800 dark:text-red-300">
              Hostel Allocation Request Rejected
            </div>
            <p className="mt-0.5 text-red-700/90 dark:text-red-300/80">
              Your hostel allocation request was not approved by the Warden administration. Please meet with the Chief Warden office for assistance and resolution.
            </p>
          </div>
        </div>
      )}

      {/* ── Dashboard Sections Stack ── */}
      <div className="space-y-5">
        {/* ── 1. Nature-Inspired Greeting Hero Card ── */}
        <StudentGreetingCard
          profile={profile}
          user={user}
          campusStatus={campusStatus}
        />

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
    </div>
  );
}
