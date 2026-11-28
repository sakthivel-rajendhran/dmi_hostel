"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  Check,
  X,
  Search,
  FileText,
  AlertTriangle,
  Trash2,
  Eye,
  Bed,
  Clock,
  Phone,
  ShieldCheck,
  Calendar,
  Building,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { passService } from "@/lib/services/passService.js";
import { letterService } from "@/lib/services/letterService.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Text-based initials generator for students when no photo is available
 */
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function WardenApprovalsPage() {
  const { data: passes = [], isLoading, refetch } = usePasses();
  const { policy } = usePolicy();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [previewLetter, setPreviewLetter] = useState(null);
  const [rejectingPass, setRejectingPass] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passToDelete, setPassToDelete] = useState(null);
  const [isDeletingPass, setIsDeletingPass] = useState(false);
  const [viewingPass, setViewingPass] = useState(null);

  const isRejectedLocalFilter = filterType === "rejected_local";

  // Filter pending queues vs rejected local queue
  const targetList = useMemo(() => {
    return isRejectedLocalFilter
      ? passes.filter((p) => {
          const status = (p.status || "").toLowerCase();
          const isHome = (p.type || "").toLowerCase().includes("home") || p.workflowType === "HOME";
          return status === "rejected" && !isHome;
        })
      : passes.filter((p) => {
          const status = (p.status || "").toLowerCase();
          if (!["pending", "recommended"].includes(status)) return false;

          const isHome = (p.type || "").toLowerCase().includes("home") || p.workflowType === "HOME";
          if (isHome) {
            return status === "recommended";
          }
          return status === "pending";
        });
  }, [passes, isRejectedLocalFilter]);

  // Priority sorting: emergency passes first, then newest departure/creation
  const sortedTargetList = useMemo(() => {
    return [...targetList].sort((a, b) => {
      if (a.emergency && !b.emergency) return -1;
      if (!a.emergency && b.emergency) return 1;
      const timeA = new Date(a.departureTime || a.fromTime || a.appliedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.departureTime || b.fromTime || b.appliedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [targetList]);

  // Compute category counts for filter tabs
  const counts = useMemo(() => {
    const pendingList = passes.filter((p) => {
      const status = (p.status || "").toLowerCase();
      if (!["pending", "recommended"].includes(status)) return false;
      const isHome = (p.type || "").toLowerCase().includes("home") || p.workflowType === "HOME";
      return isHome ? status === "recommended" : status === "pending";
    });

    const rejectedLocalList = passes.filter((p) => {
      const status = (p.status || "").toLowerCase();
      const isHome = (p.type || "").toLowerCase().includes("home") || p.workflowType === "HOME";
      return status === "rejected" && !isHome;
    });

    return {
      all: pendingList.length,
      local: pendingList.filter((p) => !((p.type || "").toLowerCase().includes("home"))).length,
      home: pendingList.filter((p) => (p.type || "").toLowerCase().includes("home")).length,
      emergency: pendingList.filter((p) => p.emergency || (p.type || "").toLowerCase().includes("emergency")).length,
      rejected_local: rejectedLocalList.length,
    };
  }, [passes]);

  // Filter by search query, department, and category tab
  const filtered = useMemo(() => {
    return sortedTargetList.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (p.studentName?.toLowerCase() || "").includes(term) ||
        (p.studentId?.toLowerCase() || "").includes(term) ||
        (p.regNo?.toLowerCase() || "").includes(term) ||
        (p.department?.toLowerCase() || "").includes(term) ||
        (p.passNumber?.toLowerCase() || "").includes(term) ||
        (p.destination?.toLowerCase() || "").includes(term) ||
        (p.reason?.toLowerCase() || "").includes(term);

      const passDept = p.department || p.dept || "";
      const matchDept = selectedDept === "all" || passDept.toUpperCase() === selectedDept.toUpperCase();

      if (isRejectedLocalFilter) return matchSearch && matchDept;

      const matchType =
        filterType === "all" ||
        (filterType === "emergency"
          ? Boolean(p.emergency) || (p.type || "").toLowerCase().includes("emergency")
          : (p.type || "").toLowerCase().includes(filterType.toLowerCase()));

      return matchSearch && matchDept && matchType;
    });
  }, [sortedTargetList, searchTerm, selectedDept, filterType, isRejectedLocalFilter]);

  const handleConfirmDeletePass = async () => {
    if (!passToDelete) return;
    setIsDeletingPass(true);
    try {
      const res = await fetch(`/api/outpass/${encodeURIComponent(passToDelete.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "warden" }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        toast.success(`Rejected Local Outpass #${passToDelete.passNumber || passToDelete.id} deleted successfully.`);
        setPassToDelete(null);
        refetch();
      } else {
        toast.error(json.message || "Failed to delete pass.");
      }
    } catch (e) {
      toast.error("Could not connect to service to delete pass.");
    } finally {
      setIsDeletingPass(false);
    }
  };

  const handleApprove = async (id) => {
    const res = await passService.approvePass(id, "Dr. John Xavier (Chief Warden)", "Approved for campus exit");
    if (res.ok) {
      toast.success(`Pass #${id} approved successfully!`);
      if (viewingPass && viewingPass.id === id) setViewingPass(null);
      refetch();
    } else {
      if (res.code === "LETTER_REQUIRED") {
        toast.error(res.message, {
          duration: 6000,
          description: "An approved Correspondent special permission letter is required for this extended pass.",
        });
      } else {
        toast.error(res.message || "Failed to approve pass");
      }
    }
  };

  const handleOpenReject = (pass) => {
    setRejectingPass(pass);
    setRejectReason("Application declined after administrative review.");
  };

  const handleConfirmReject = async () => {
    if (!rejectingPass) return;
    setIsSubmitting(true);
    try {
      const res = await passService.rejectPass(
        rejectingPass.id,
        "Dr. John Xavier (Chief Warden)",
        rejectReason || "Application declined"
      );
      if (res.ok) {
        toast.error(`Pass #${rejectingPass.id} rejected.`);
        setRejectingPass(null);
        if (viewingPass && viewingPass.id === rejectingPass.id) setViewingPass(null);
        refetch();
      } else {
        toast.error(res.message || "Failed to reject pass.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLetter = async (letterId) => {
    const res = await letterService.getById(letterId);
    if (res.ok) {
      setPreviewLetter(res.data);
    } else {
      toast.error("Could not load attached letter.");
    }
  };

  // Staff Review Status Badge Helper
  const renderStaffBadge = (pass) => {
    const isHome = (pass.type || "").toLowerCase().includes("home") || pass.workflowType === "HOME";
    if (!isHome) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Not Required
        </span>
      );
    }
    const st = (pass.staffApprovalStatus || "").toUpperCase();
    if (st === "APPROVED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          Recommended
        </span>
      );
    }
    if (st === "REJECTED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        Pending Staff Review
      </span>
    );
  };

  // HOD Review Status Badge Helper
  const renderHodBadge = (pass) => {
    const isHome = (pass.type || "").toLowerCase().includes("home") || pass.workflowType === "HOME";
    if (!isHome) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Not Required
        </span>
      );
    }
    const st = (pass.hodApprovalStatus || "").toUpperCase();
    if (st === "APPROVED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
          Forwarded to Warden
        </span>
      );
    }
    if (st === "REJECTED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        Pending HOD Review
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Outpass Clearance Queue"
        subtitle="Review, approve, and authorize digital outpass applications"
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search student, ID, reg #, pass #, destination..."
            leftIcon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="all">All Depts</option>
            {WORKFLOW_CONFIG.departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "all", label: "All Pending", count: counts.all },
              { id: "local", label: "Local Passes", count: counts.local },
              { id: "home", label: "Home Passes", count: counts.home },
              { id: "emergency", label: "Emergency / Medical", count: counts.emergency },
              { id: "rejected_local", label: "Rejected Local Passes", count: counts.rejected_local },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition flex items-center gap-1.5 flex-none ${
                  filterType === t.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                    filterType === t.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Compact Student Application Cards */}
      {isLoading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading applications...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-text-dark dark:text-white">No outpass applications match criteria.</h4>
          <p className="text-xs text-text-muted dark:text-slate-400 mt-1">
            All student outpasses are verified and clear.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((pass) => {
            const isHome = (pass.type || "").toLowerCase().includes("home") || pass.workflowType === "HOME";

            return (
              <div
                key={pass.id}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition space-y-4",
                  pass.emergency && "border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10"
                )}
              >
                {/* 1. Header: Student Identity + Pass Meta */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  {/* Student Identity: Avatar + Names */}
                  <div className="flex items-center gap-3">
                    {pass.photoUrl ? (
                      <img
                        src={pass.photoUrl}
                        alt={pass.studentName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.classList.remove("hidden");
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm",
                        pass.photoUrl && "hidden"
                      )}
                    >
                      {getInitials(pass.studentName)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                          {pass.studentName}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                          {pass.department || pass.dept}
                        </span>
                        {pass.emergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Urgent Medical
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Year {pass.year || 1} • Room {pass.roomNo || pass.room || "—"} ({pass.floor || "Hostel"})
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        Reg: {pass.regNo || "—"} • ID: {pass.studentId}
                      </p>
                    </div>
                  </div>

                  {/* Pass Meta: Category & ID */}
                  <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        #{pass.passNumber || pass.id}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          isHome
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                        )}
                      >
                        {pass.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Applied: {formatDateTime(pass.appliedAt || pass.createdAt, "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                </div>

                {/* 2. Destination, Purpose & Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                        Destination:
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {pass.destination}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                        Purpose:
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 line-clamp-2">
                        {pass.reason}
                      </span>
                    </div>
                    {policy?.studentLetters?.enabled && pass.letterId && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleViewLetter(pass.letterId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Attached Letter #{pass.letterId}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 md:border-l md:border-slate-200 md:dark:border-slate-700/60 md:pl-3">
                    <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                        Exit Time:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                        Expected Return:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Review Sections: Staff & HOD Snapshots */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Staff Review Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Staff Review
                      </span>
                      {renderStaffBadge(pass)}
                    </div>

                    {!isHome ? (
                      <p className="text-[11px] text-slate-400">
                        Local outpasses do not require faculty advisor recommendation.
                      </p>
                    ) : (pass.staffApprovalStatus || "").toUpperCase() === "APPROVED" ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400">Reviewed By: </span>
                          <strong className="text-slate-900 dark:text-white">
                            {pass.staffApprovedBy || "Designated Faculty Advisor"}
                          </strong>
                          <span className="text-slate-400 ml-1">({pass.department})</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                          "{pass.staffRemarks || pass.staff_remarks || "Academic standing verified and cleared."}"
                        </div>
                        {pass.staffApprovedAt && (
                          <div className="text-[10px] text-slate-400">
                            Cleared: {formatDateTime(pass.staffApprovedAt, "dd MMM yyyy, hh:mm a")}
                          </div>
                        )}
                      </div>
                    ) : (pass.staffApprovalStatus || "").toUpperCase() === "REJECTED" ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400">Reviewed By: </span>
                          <strong className="text-slate-900 dark:text-white">
                            {pass.staffApprovedBy || "Faculty Advisor"}
                          </strong>
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900 italic">
                          "{pass.staffRemarks || pass.staff_remarks || "Declined by Staff"}"
                        </div>
                        {pass.staffApprovedAt && (
                          <div className="text-[10px] text-slate-400">
                            Date: {formatDateTime(pass.staffApprovedAt, "dd MMM yyyy, hh:mm a")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Awaiting Faculty Advisor recommendation for {pass.department}.
                      </p>
                    )}
                  </div>

                  {/* HOD Review Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        HOD Review
                      </span>
                      {renderHodBadge(pass)}
                    </div>

                    {!isHome ? (
                      <p className="text-[11px] text-slate-400">
                        Local outpasses do not require departmental HOD endorsement.
                      </p>
                    ) : (pass.hodApprovalStatus || "").toUpperCase() === "APPROVED" ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400">Endorsed By: </span>
                          <strong className="text-slate-900 dark:text-white">
                            {pass.hodApprovedBy || "Head of Department"}
                          </strong>
                          <span className="text-slate-400 ml-1">({pass.department})</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                          "{pass.hodRemarks || pass.hod_remarks || "Endorsed for Warden final clearance."}"
                        </div>
                        {pass.hodApprovedAt && (
                          <div className="text-[10px] text-slate-400">
                            Cleared: {formatDateTime(pass.hodApprovedAt, "dd MMM yyyy, hh:mm a")}
                          </div>
                        )}
                      </div>
                    ) : (pass.hodApprovalStatus || "").toUpperCase() === "REJECTED" ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400">Reviewed By: </span>
                          <strong className="text-slate-900 dark:text-white">
                            {pass.hodApprovedBy || "Head of Department"}
                          </strong>
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900 italic">
                          "{pass.hodRemarks || pass.hod_remarks || "Declined by HOD"}"
                        </div>
                        {pass.hodApprovedAt && (
                          <div className="text-[10px] text-slate-400">
                            Date: {formatDateTime(pass.hodApprovedAt, "dd MMM yyyy, hh:mm a")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Awaiting Head of Department endorsement for {pass.department}.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Action Strip */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span>Approval Authority: </span>
                    <strong className="text-slate-700 dark:text-slate-300">Warden Clearance</strong>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setViewingPass(pass)}
                      leftIcon={Eye}
                      title="Inspect full application and history"
                    >
                      View Details
                    </Button>

                    {isRejectedLocalFilter || (pass.status || "").toLowerCase() === "rejected" ? (
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => setPassToDelete(pass)}
                        leftIcon={Trash2}
                      >
                        Delete Pass
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleOpenReject(pass)}
                          leftIcon={X}
                        >
                          Reject
                        </Button>
                        <Button
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={() => handleApprove(pass.id)}
                          leftIcon={Check}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Full Pass Details Modal */}
      {viewingPass && (
        <Modal
          isOpen={Boolean(viewingPass)}
          onClose={() => setViewingPass(null)}
          title={`Outpass Application #${viewingPass.passNumber || viewingPass.id}`}
          description={`Resident: ${viewingPass.studentName} (${viewingPass.studentId})`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Student & Room Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
                Resident Profile & Room
              </h5>
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Department & Year</span>
                  <span className="font-semibold">{viewingPass.department} • Year {viewingPass.year}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Register Number</span>
                  <span className="font-semibold font-mono">{viewingPass.regNo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Room Allocation</span>
                  <span className="font-semibold">Room {viewingPass.roomNo || viewingPass.room || "—"} ({viewingPass.floor || "Hostel Floor"})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Parent / Guardian Contact</span>
                  <span className="font-semibold font-mono">{viewingPass.parentPhone || viewingPass.studentPhone || "—"}</span>
                </div>
              </div>
            </div>

            {/* Travel Schedule */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
                Travel Schedule & Reason
              </h5>
              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">Pass Category:</span>
                  <span className="font-bold capitalize">{viewingPass.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-semibold">{viewingPass.destination}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">Purpose / Reason:</span>
                  <span className="font-medium text-right max-w-xs">{viewingPass.reason}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">Exit Departure:</span>
                  <span className="font-semibold font-mono">{formatDateTime(viewingPass.departureTime || viewingPass.fromTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Expected Campus Return:</span>
                  <span className="font-semibold font-mono">{formatDateTime(viewingPass.expectedReturnTime || viewingPass.toTime)}</span>
                </div>
              </div>
            </div>

            {/* Review Chain Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
                Administrative Approval Trail
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>1. Staff Faculty Advisor</span>
                  {renderStaffBadge(viewingPass)}
                </div>
                {viewingPass.staffRemarks && (
                  <p className="text-[11px] italic text-slate-500 pl-3 border-l-2 border-emerald-400">
                    "{viewingPass.staffRemarks}" — {viewingPass.staffApprovedBy || "Staff"}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <span>2. Department HOD</span>
                  {renderHodBadge(viewingPass)}
                </div>
                {viewingPass.hodRemarks && (
                  <p className="text-[11px] italic text-slate-500 pl-3 border-l-2 border-indigo-400">
                    "{viewingPass.hodRemarks}" — {viewingPass.hodApprovedBy || "HOD"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setViewingPass(null)}>
                Close
              </Button>
              {(viewingPass.status || "").toLowerCase() === "pending" ||
              (viewingPass.status || "").toLowerCase() === "recommended" ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      const p = viewingPass;
                      setViewingPass(null);
                      handleOpenReject(p);
                    }}
                    leftIcon={X}
                  >
                    Reject Application
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(viewingPass.id)}
                    leftIcon={Check}
                  >
                    Approve Outpass
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Confirmation Modal */}
      {rejectingPass && (
        <Modal
          isOpen={Boolean(rejectingPass)}
          onClose={() => setRejectingPass(null)}
          title={`Decline Pass Application #${rejectingPass.id}`}
          description={`Student: ${rejectingPass.studentName || rejectingPass.studentId} • Type: ${rejectingPass.type}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Rejection Reason (will be logged in timeline and notified to resident)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Specify the reason for declining this outpass application..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectingPass(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleConfirmReject}
                isLoading={isSubmitting}
                leftIcon={X}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Letter Preview Modal */}
      {previewLetter && (
        <Modal
          isOpen={Boolean(previewLetter)}
          onClose={() => setPreviewLetter(null)}
          title={`Attached Permission Letter (${previewLetter.id})`}
          description={`Submitted by ${previewLetter.studentName} (${previewLetter.studentId})`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-text-dark dark:text-white block">{previewLetter.subject}</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{previewLetter.details}</p>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Status: <strong className="capitalize text-primary">{previewLetter.status}</strong></span>
              <span>Document: {previewLetter.fileName}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewLetter(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Rejected Local Outpass Modal */}
      {passToDelete && (
        <Modal
          isOpen={Boolean(passToDelete)}
          onClose={() => setPassToDelete(null)}
          title="Delete Rejected Local Outpass"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete rejected local outpass{" "}
              <strong className="text-slate-900 dark:text-white">
                #{passToDelete.passNumber || passToDelete.id}
              </strong>{" "}
              for resident{" "}
              <strong className="text-slate-900 dark:text-white">
                {passToDelete.studentName || passToDelete.studentId}
              </strong>?
              This record will be permanently purged from the database.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPassToDelete(null)}
                disabled={isDeletingPass}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleConfirmDeletePass}
                isLoading={isDeletingPass}
                leftIcon={Trash2}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
