"use client";

import React from "react";
import Link from "next/link";
import {
  CheckSquare,
  ArrowRight,
  Check,
  X,
  UserPlus,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { GreetingCard } from "@/components/common/GreetingCard.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { useWardenStats } from "@/hooks/queries/useWardenStats.js";
import { passService } from "@/lib/services/passService.js";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenDashboardPage() {
  const { user } = useAuth();
  const { data: passes = [], isLoading: passesLoading, refetch: refetchPasses } = usePasses();
  const { data: stats = {}, isLoading: statsLoading, refetch: refetchStats } = useWardenStats();

  const pendingPasses = [...passes]
    .filter((p) => {
      const status = (p.status || "").toLowerCase();
      if (!["pending", "recommended"].includes(status)) return false;
      const isHome = (p.type || "").toLowerCase().includes("home") || p.workflowType === "HOME";
      if (isHome) {
        // Home pass requires staff recommendation before reaching Warden queue
        return status === "recommended";
      }
      // Local pass goes directly to Warden approval
      return status === "pending";
    })
    .sort((a, b) => (b.emergency ? 1 : 0) - (a.emergency ? 1 : 0));

  const totalStudents = stats.totalStudents ?? stats.approvedStudents ?? stats.totalRegistered ?? 0;
  const campusOut = stats.campusOut ?? stats.studentsOutside ?? 0;
  const campusIn = stats.campusIn ?? Math.max(0, totalStudents - campusOut);
  const complaintsCount = stats.complaints ?? 0;

  const totalRegistered = stats.totalRegistered ?? 0;
  const approvedStudents = stats.approvedStudents ?? 0;
  const pendingStudents = stats.pendingStudents ?? 0;
  const rejectedStudents = stats.rejectedStudents ?? 0;
  const allocatedStudents = stats.allocatedStudents ?? 0;
  const pendingLocalPasses = stats.pendingLocalPasses ?? 0;
  const pendingHomePasses = stats.pendingHomePasses ?? 0;
  const pendingCount = stats.pendingPasses ?? pendingPasses.length;
  const outCount = campusOut;
  const overdueCount = stats.overdueStudents ?? 0;
  const recentActivity = stats.recentActivity || [];

  const handleApprove = async (id) => {
    const res = await passService.approvePass(id, "Approved by Warden");
    if (res.ok) {
      toast.success(`Pass #${id} approved!`);
      refetchPasses();
      refetchStats();
    }
  };

  const handleReject = async (id) => {
    const res = await passService.rejectPass(id, "Rejected by Warden", "Disciplinary review required");
    if (res.ok) {
      toast.error(`Pass #${id} rejected.`);
      refetchPasses();
      refetchStats();
    }
  };

  return (
    <div className="space-y-6">
      {/* Universal Portal Greeting Card */}
      <GreetingCard
        role="warden"
        user={user}
        name={user?.name || "Dr. Anthony Xavier"}
        uniqueId="CHIEF WARDEN"
        department="HOSTEL ADMINISTRATION"
        statusLabel="Account Status"
        statusValue="CHIEF WARDEN · ACTIVE"
      />

      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Hostel Administration & Clearances
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live surveillance, pending outpasses, and resident clearance queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/warden/student-allocation">
            <Button size="sm" variant="outline" leftIcon={UserPlus}>
              Registration Requests ({pendingStudents})
            </Button>
          </Link>
          <Link href="/warden/approvals">
            <Button size="sm" leftIcon={CheckSquare}>
              Review Passes ({pendingCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Simple Dashboard Statistic Cards (No Icons, Text-Focused) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/warden/students" className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-blue-700 dark:text-blue-300">Total Student</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-950 dark:text-white mt-1">{totalStudents}</span>
          </div>
        </Link>

        <Link href="/warden/gate-passes?status=inside" className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 hover:bg-emerald-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300">In Campus</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white mt-1">{campusIn}</span>
          </div>
        </Link>

        <Link href="/warden/gate-passes?type=home&status=outside" className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-amber-700 dark:text-amber-300">Home Out</span>
            <span className="text-xl sm:text-2xl font-bold text-amber-950 dark:text-white mt-1">{stats.homeOut ?? 0}</span>
          </div>
        </Link>

        <Link href="/warden/approvals" className="block h-full">
          <div className="p-3.5 sm:p-4 h-full rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 hover:bg-purple-100/70 transition flex flex-col justify-center">
            <span className="block text-xs font-semibold text-purple-700 dark:text-purple-300">Pending Request</span>
            <span className="text-xl sm:text-2xl font-bold text-purple-950 dark:text-white mt-1">{pendingCount}</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Queue (Left 2 Columns) */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-text-dark dark:text-white">
                Pending Outpass Clearance Queue
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400">
                Students waiting for warden verification and gate QR issuance
              </p>
            </div>
            <Link
              href="/warden/approvals"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all ({pendingPasses.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingPasses.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No pending outpass clearances.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingPasses.slice(0, 5).map((pass) => (
                <div
                  key={pass.id}
                  className={`py-3 px-2 flex items-center justify-between gap-4 rounded-lg transition-colors ${
                    pass.emergency
                      ? "bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-l-rose-500 pl-3"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-text-dark dark:text-white">
                        {pass.studentName}
                      </span>
                      <span className="font-mono text-xs text-primary font-semibold">
                        {pass.studentId}
                      </span>
                      <StatusChip status={pass.status} size="sm" />
                      {Boolean(pass.emergency) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                          Urgent Medical
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                      <span className="capitalize font-medium">{pass.type}</span> •{" "}
                      {pass.destination} • {pass.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-none">
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onClick={() => handleApprove(pass.id)}
                      leftIcon={Check}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => handleReject(pass.id)}
                      leftIcon={X}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Real MySQL Recent Activity Feed (Right 1 Column) */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-base text-text-dark dark:text-white">
              Recent Activity
            </h3>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No recent activity recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">
                      {item.student_name || item.student_id}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.type} • {item.destination}
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <StatusChip status={item.status} size="xs" />
                    <span className="text-[10px] text-slate-400 mt-1">
                      {formatDateTime(item.updated_at || item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
