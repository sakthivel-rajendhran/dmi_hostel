"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { GreetingCard } from "@/components/common/GreetingCard.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useDeptDashboard } from "@/hooks/queries/useDepartment.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";

export function DepartmentDashboard({ role = "staff" }) {
  const router = useRouter();
  const { user } = useAuth();
  const isHod = role === "hod";

  // Data fetching
  const { data: dashData, isLoading: isDashLoading, refetch: refetchDash, isRefetching } = useDeptDashboard();

  const kpis = dashData?.kpis || {
    totalStudent: 0,
    inCampus: 0,
    homeOut: 0,
    pendingRequest: 0,
    inScope: 0,
    awaitingRecommendation: 0,
  };

  const needsAttention = dashData?.needsAttention || [];
  const hodOverview = dashData?.hodOverview;
  const deptName = user?.departmentName || "Computer Science & Engineering";
  const deptCode = user?.dept || user?.department || "CSE";
  const assignedYears = user?.assignedYears || [];

  return (
    <div className="space-y-6">
      {/* Universal Portal Greeting Card */}
      <GreetingCard
        role={isHod ? "hod" : "staff"}
        user={user}
        name={user?.name || (isHod ? "Dr. Meenakshi Sundaram" : "Prof. Rajesh Sharma")}
        uniqueId={user?.id || (isHod ? "HOD" : "STAFF")}
        department={deptCode}
        statusLabel="Portal Role"
        statusValue={isHod ? "HEAD OF DEPARTMENT · ACTIVE" : "FACULTY ADVISOR · ACTIVE"}
      />

      {/* Action Bar: Scope description, Sync Feed & Recommendation Queue */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{deptName}</span>
          <span className="mx-1.5">•</span>
          <span>
            {isHod || assignedYears.length === 0
              ? "All Academic Years Scope"
              : `Assigned: Year ${assignedYears.join(", ")} Residents`}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDash()}
            isLoading={isRefetching}
            leftIcon={RefreshCw}
            className="text-xs"
          >
            Sync Feed
          </Button>
          <Link href={isHod ? "/hod/requests" : "/staff/requests"}>
            <Button
              size="sm"
              className={cn(
                "text-xs font-semibold shadow-sm",
                isHod ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
              )}
            >
              Recommendation Queue ({kpis.pendingRequest ?? kpis.awaitingRecommendation ?? 0})
            </Button>
          </Link>
        </div>
      </div>

      {/* HOD Monthly Quick Overview Strip */}
      {isHod && hodOverview && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                This Month's Department Performance
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Total Passes: <strong className="text-slate-900 dark:text-white font-bold">{hodOverview.monthTotalPasses}</strong>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              On-Time Return Rate: <strong className="text-emerald-600 font-bold">{hodOverview.onTimeReturnRate}</strong>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Primary Destination: <strong className="text-slate-900 dark:text-white font-bold">{hodOverview.topDestination}</strong>
            </div>
          </div>
          <Link
            href="/hod/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 shrink-0"
          >
            <span>Department Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 4 Simple Dashboard Statistic Cards (No Icons, Text-Focused) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href={isHod ? "/hod/students" : "/staff/students"} className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-blue-700 dark:text-blue-300">Total Student</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-950 dark:text-white mt-1">
              {kpis.totalStudent ?? kpis.inScope ?? 0}
            </span>
          </div>
        </Link>

        <Link href={isHod ? "/hod/students?status=in_campus" : "/staff/students?status=in_campus"} className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 hover:bg-emerald-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300">In Campus</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white mt-1">
              {kpis.inCampus ?? 0}
            </span>
          </div>
        </Link>

        <Link href={isHod ? "/hod/students?status=out" : "/staff/students?status=out"} className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-amber-700 dark:text-amber-300">Home Out</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-950 dark:text-white mt-1">
              {kpis.homeOut ?? kpis.outHome ?? 0}
            </span>
          </div>
        </Link>

        <Link href={isHod ? "/hod/requests" : "/staff/requests"} className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 hover:bg-purple-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-purple-700 dark:text-purple-300">Pending Request</span>
            <span className="text-xl sm:text-2xl font-bold text-purple-950 dark:text-white mt-1">
              {kpis.pendingRequest ?? kpis.awaitingRecommendation ?? 0}
            </span>
          </div>
        </Link>
      </div>

      {/* Needs Attention Row (Full Width - Today's Movements Removed from Staff & HOD) */}
      <div>
        <Card className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Needs Attention ({needsAttention.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Overdue Curfews & Emergency Outpass Requests
            </span>
          </div>

          <div className="p-4 flex-1">
            {needsAttention.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All clear right now</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No overdue residents or unreviewed emergency passes in your scope.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {needsAttention.map((item) => {
                  const isOverdue = item.type === "overdue";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition",
                        isOverdue
                          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                          : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
                            isOverdue ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          )}
                        >
                          {isOverdue ? "LATE" : "EMRG"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{item.studentName}</span>
                            <span className="text-slate-500">({item.studentId})</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-800 font-medium">
                              Year {item.year} • Room {item.room}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {isOverdue ? (
                              <span className="font-medium text-rose-600 dark:text-rose-400">
                                Expected return was {formatDateTime(item.expectedReturnTime)} (Destination: {item.destination})
                              </span>
                            ) : (
                              <span>Emergency Reason: {item.reason || item.destination}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>Student</span>
                          </a>
                        )}
                        {item.guardianPhone && (
                          <a
                            href={`tel:${item.guardianPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold"
                          >
                            <Phone className="w-3 h-3 text-rose-600" />
                            <span>Guardian</span>
                          </a>
                        )}
                        <Link href={isHod ? `/hod/requests?pass=${item.passId}` : `/staff/requests?pass=${item.passId}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DepartmentDashboard;
