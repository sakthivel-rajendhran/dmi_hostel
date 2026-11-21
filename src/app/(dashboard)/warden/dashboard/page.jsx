"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  QrCode,
  ShieldAlert,
  Clock,
  ArrowRight,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { useStudents } from "@/hooks/queries/useStudents.js";
import { useSecurityLogs } from "@/hooks/queries/useSecurityLogs.js";
import { passService } from "@/lib/services/passService.js";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenDashboardPage() {
  const { data: passes = [], isLoading: passesLoading, refetch: refetchPasses } = usePasses();
  const { data: students = [] } = useStudents();
  const { data: logs = [] } = useSecurityLogs();

  const pendingPasses = passes.filter((p) => ["pending", "recommended"].includes(p.status));
  const outCount = passes.filter((p) => p.status === "out").length;
  const overdueCount = passes.filter((p) => p.status === "overdue").length;

  const handleApprove = async (id) => {
    const res = await passService.approvePass(id, "Approved by Warden");
    if (res.ok) {
      toast.success(`Pass #${id} approved!`);
      refetchPasses();
    }
  };

  const handleReject = async (id) => {
    const res = await passService.rejectPass(id, "Rejected by Warden", "Disciplinary review required");
    if (res.ok) {
      toast.error(`Pass #${id} rejected.`);
      refetchPasses();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warden Dashboard"
        subtitle="Hostel administration, resident clearances & gate surveillance"
        actions={
          <div className="flex gap-2">
            <Link href="/warden/approvals">
              <Button size="sm" leftIcon={CheckSquare}>
                Review Passes ({pendingPasses.length})
              </Button>
            </Link>
            <Link href="/warden/announcements">
              <Button size="sm" variant="outline">
                Broadcast Alert
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={pendingPasses.length}
          subtitle="Awaiting clearance"
          icon={CheckSquare}
          variant="indigo"
        />
        <StatCard
          title="Currently Outside"
          value={outCount}
          subtitle="Signed out at gate"
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Overdue Residents"
          value={overdueCount}
          subtitle="Exceeded return curfew"
          icon={ShieldAlert}
          variant="danger"
        />
        <StatCard
          title="Total Residents"
          value={students.length}
          subtitle="Enrolled hostellers"
          icon={Users}
          variant="success"
        />
      </div>

      {/* Pending Approvals Queue */}
      <Card className="p-6">
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
          <div className="text-center py-8 text-xs text-slate-400">
            No pending requests at the moment. All clear!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingPasses.slice(0, 5).map((pass) => (
              <div key={pass.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-dark dark:text-white">
                      {pass.studentName}
                    </span>
                    <span className="font-mono text-xs text-primary font-semibold">
                      {pass.studentId}
                    </span>
                    <StatusChip status={pass.status} size="sm" />
                  </div>
                  <div className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                    <span className="capitalize font-medium">{pass.type} Pass</span> •{" "}
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
    </div>
  );
}
