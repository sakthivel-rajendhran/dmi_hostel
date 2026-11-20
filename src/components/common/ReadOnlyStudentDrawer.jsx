"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Mail,
  Copy,
  Check,
  Calendar,
  Clock,
  AlertTriangle,
  Building,
  GraduationCap,
  ShieldAlert,
  FileText,
  Activity,
  Bed,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useOversightStudent } from "@/hooks/queries/useOversight.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

/**
 * Shared Read-Only Student Drawer for Staff, HOD, Principal, and Correspondent
 * With locked banner: "Student details are managed by the warden"
 */
export function ReadOnlyStudentDrawer({
  studentId,
  isOpen,
  onClose,
  initialTab = "profile",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copiedKey, setCopiedKey] = useState(null);
  const { policy } = usePolicy();

  const { data: student, isLoading } = useOversightStudent(studentId);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "passes", label: `Passes (${student?.passes?.length || 0})` },
    { id: "activity", label: "Gate Activity" },
    ...(policy?.studentLetters?.enabled ? [{ id: "letters", label: "Letters" }] : []),
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={student?.name || "Student Profile"}
      description={`ID: ${student?.studentId || studentId || "Loading..."}`}
      size="lg"
    >
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !student ? (
        <div className="p-8 text-center text-text-muted dark:text-slate-400">
          Student record not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Read-Only Disciplinary & Management Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <Lock className="w-4 h-4 text-amber-600 flex-none" />
            <span>Student details and disciplinary actions are managed exclusively by the Chief Warden.</span>
          </div>

          {/* Student Header Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-4">
            <Avatar
              name={student.name}
              src={student.photoDataUrl || student.avatar}
              size="lg"
              className="border-2 border-primary/20 flex-none"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-base text-text-dark dark:text-white truncate">
                  {student.name}
                </h3>
                <Badge
                  variant={
                    student.campusStatus === "overdue"
                      ? "danger"
                      : student.campusStatus === "out"
                      ? "info"
                      : "success"
                  }
                  size="sm"
                >
                  {student.campusStatus === "overdue"
                    ? "Overdue Return"
                    : student.campusStatus === "out"
                    ? "Outside Campus"
                    : "Inside Campus"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <span>{student.studentId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(student.studentId, "studentId")}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Copy Student ID"
                >
                  {copiedKey === "studentId" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <span className="text-slate-400">·</span>
                <span className="text-text-muted dark:text-slate-400 font-sans">
                  Reg No: {student.regNo || student.regNumber || "N/A"}
                </span>
              </div>

              <p className="text-xs text-text-muted dark:text-slate-400">
                {student.department} · Year {student.year} · {student.floorLabel || "Floor"} · Room {student.roomNo || student.room || "N/A"}
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[11px] text-text-muted dark:text-slate-400">Total Passes</span>
              <span className="font-bold text-sm text-text-dark dark:text-white">
                {student.passes?.length || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[11px] text-text-muted dark:text-slate-400">Late Returns (90d)</span>
              <span className={cn("font-bold text-sm", (student.lateReturnsCount || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                {student.lateReturnsCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="block text-[11px] text-text-muted dark:text-slate-400">Hostel Verification</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 capitalize">
                {student.hostelVerification || "Verified"}
              </span>
            </div>
          </div>

          {/* Drawer Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-bold text-text-dark dark:text-white uppercase tracking-wider text-[11px]">
                  Guardian & Emergency Contact
                </h4>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-text-muted dark:text-slate-400">Guardian Name</span>
                  <span className="font-semibold text-text-dark dark:text-white">{student.guardianName || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-text-muted dark:text-slate-400">Guardian Phone</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-text-dark dark:text-white">{student.guardianPhone || "N/A"}</span>
                    {student.guardianPhone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(student.guardianPhone, "guardianPhone")}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        {copiedKey === "guardianPhone" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-bold text-text-dark dark:text-white uppercase tracking-wider text-[11px]">
                  Hostel Allocation
                </h4>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-text-muted dark:text-slate-400">Floor</span>
                  <span className="font-semibold text-text-dark dark:text-white">{student.floorLabel || "Floor"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-text-muted dark:text-slate-400">Room Number</span>
                  <span className="font-semibold font-mono text-text-dark dark:text-white">{student.roomNo || student.room || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-text-muted dark:text-slate-400">Building</span>
                  <span className="font-semibold text-text-dark dark:text-white">Main Hostel Complex</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASSES */}
          {activeTab === "passes" && (
            <div className="space-y-3">
              {(student.passes || []).length === 0 ? (
                <p className="text-center py-6 text-xs text-text-muted dark:text-slate-400">
                  No pass requests on record.
                </p>
              ) : (
                (student.passes || []).slice(0, 10).map((pass) => (
                  <div
                    key={pass.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono font-bold text-text-dark dark:text-white">
                          {pass.passNumber || pass.id}
                        </span>
                        <span className="block text-[11px] text-text-muted dark:text-slate-400">
                          {pass.type} · Destination: {pass.destination}
                        </span>
                      </div>
                      <StatusBadge status={pass.status} />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <span>Out: {formatDateTime(pass.departureTime)}</span>
                      <span>Expected: {formatDateTime(pass.expectedReturnTime)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted dark:text-slate-400">
                Gate scanner transactions and movement history.
              </p>
              {(student.passes || []).filter((p) => p.actualExitTime).length === 0 ? (
                <p className="text-center py-6 text-xs text-text-muted dark:text-slate-400">
                  No gate scanner movements recorded for this student.
                </p>
              ) : (
                (student.passes || [])
                  .filter((p) => p.actualExitTime)
                  .map((pass) => (
                    <div
                      key={pass.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-semibold text-text-dark dark:text-white">{pass.id}</span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Verified Scan</span>
                      </div>
                      <div className="text-[11px] text-text-muted dark:text-slate-400 space-y-0.5">
                        <p>Gate Exit: {formatDateTime(pass.actualExitTime)}</p>
                        {pass.actualReturnTime && (
                          <p>
                            Gate Entry: {formatDateTime(pass.actualReturnTime)}{" "}
                            {pass.isLate && <span className="text-red-500 font-bold">(Late by {pass.lateMinutes || 30}m)</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB 4: LETTERS */}
          {activeTab === "letters" && policy?.studentLetters?.enabled && (
            <div className="space-y-3 text-xs">
              <p className="text-text-muted dark:text-slate-400">
                Special permission letters submitted by this student.
              </p>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-text-dark dark:text-white block">Special Letter Clearance</span>
                <span className="text-[11px] text-text-muted dark:text-slate-400">
                  Reviewed under institutional approver mode ({policy.studentLetters.approverMode}).
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default ReadOnlyStudentDrawer;
