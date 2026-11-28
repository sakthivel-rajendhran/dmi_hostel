"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Search, Download, CheckSquare, Square, Users,
  Check, X, AlertCircle, Loader2, ChevronDown, Filter, Eye, Phone, Mail, User, ShieldCheck, Clock, Trash2,
} from "lucide-react";
import { PageHeader }  from "@/components/ui/PageHeader.jsx";
import { Card }        from "@/components/ui/Card.jsx";
import { Button }      from "@/components/ui/Button.jsx";
import { Input }       from "@/components/ui/Input.jsx";
import { Modal }       from "@/components/ui/Modal.jsx";
import { Avatar }      from "@/components/ui/Avatar.jsx";
import { useAuth }     from "@/hooks/use-auth.js";
import {
  useStudentAllocations,
  useAcceptStudent,
  useRejectStudent,
  useBulkAccept,
  useBulkReject,
} from "@/hooks/queries/useStudentAllocations.js";
import { cn } from "@/lib/utils/cn.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

// ─── helpers ─────────────────────────────────────────────────────────────────
const DEPTS = ["all", ...WORKFLOW_CONFIG.departments.map((d) => d.code)];
const YEARS = ["all", "1", "2", "3", "4"];
const STATUS_OPTS = [
  { value: "all",      label: "All Status"        },
  { value: "pending",  label: "Pending Approval"  },
  { value: "accepted", label: "Approved / Active" },
  { value: "rejected", label: "Rejected"          },
];

function statusChip(s, accountStatus) {
  const st = (accountStatus || s || "").toLowerCase();
  if (st === "approved" || st === "accepted") {
    return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800";
  }
  if (st === "rejected") {
    return "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800";
  }
  return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
}

function statusLabel(s, accountStatus) {
  const st = (accountStatus || s || "").toLowerCase();
  if (st === "approved" || st === "accepted") return "Approved";
  if (st === "rejected") return "Rejected";
  return "Pending Approval";
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtFull(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Excel export (SheetJS via CDN shim — bundled via xlsx package) ───────────
async function downloadExcel(rows, filename = "Student_Registration_Report.xlsx") {
  if (!rows || rows.length === 0) {
    toast.error("No records to export.");
    return;
  }
  const XLSX = await import("xlsx");
  const wsData = [
    ["Student ID", "Register Number", "Name", "Email", "Phone", "Department", "Year", "Room No", "Registered On",
     "Approval Status", "Decision Date", "Rejection Reason"],
    ...rows.map((r) => [
      r.student_id || r.id,
      r.reg_no || "—",
      r.name,
      r.email,
      r.phone || "—",
      r.department,
      r.year,
      r.room_number || "—",
      fmt(r.registered_at),
      statusLabel(r.allocation_status, r.account_status),
      fmt(r.decided_at),
      r.rejection_reason || "—",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RegistrationRequests");
  XLSX.writeFile(wb, filename);
  toast.success(`Exported ${rows.length} record(s) to ${filename}`);
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value ?? "—"}</p>
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentAllocationPage() {
  const { user } = useAuth();
  const wardenId = user?.id || "WARDEN-001";

  // Filter state
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // Modal states
  const [viewDetailsTarget, setViewDetailsTarget] = useState(null); // row object
  const [acceptTarget, setAcceptTarget] = useState(null); // { id, name }
  const [rejectTarget, setRejectTarget] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState("");
  const [bulkAction, setBulkAction] = useState(null); // "accept" | "reject"
  const [bulkReason, setBulkReason] = useState("");

  // Data
  const { data: allocationData, isLoading, isError } = useStudentAllocations(
    { status: statusFilter, dept, year, search }
  );
  const rows = allocationData?.data || [];
  const meta = allocationData?.meta || {};

  // Mutations
  const acceptMut = useAcceptStudent();
  const rejectMut = useRejectStudent();
  const bulkAcceptMut = useBulkAccept();
  const bulkRejectMut = useBulkReject();

  // Pending rows = eligible for selection / approval
  const isPendingRow = (r) => {
    const acc = (r.account_status || "").toUpperCase();
    return acc === "PENDING_WARDEN" || acc === "PENDING" || r.allocation_status === "waiting_for_warden";
  };

  const isRejectedRow = (r) => {
    if (!r) return false;
    const acc = (r.account_status || "").toUpperCase();
    const alloc = (r.allocation_status || "").toLowerCase();
    return acc === "REJECTED" || alloc === "rejected";
  };

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    setIsDeletingStudent(true);
    try {
      const res = await fetch(`/api/warden/student-allocations/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        toast.success(`Rejected student ${deleteTarget.name} deleted successfully.`);
        setDeleteTarget(null);
        refetch();
      } else {
        toast.error(json.message || "Failed to delete student record.");
      }
    } catch (e) {
      toast.error("Could not connect to service to delete student.");
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const pendingRows = useMemo(() => rows.filter(isPendingRow), [rows]);

  // ─── Selection helpers ──────────────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    setSelectionMode(true);
    setSelected(new Set(pendingRows.map((r) => r.id || r.student_id)));
  }, [pendingRows]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const toggleRow = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allPendingSelected =
    pendingRows.length > 0 &&
    pendingRows.every((r) => selected.has(r.id || r.student_id));

  const toggleAllVisible = useCallback(() => {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRows.map((r) => r.id || r.student_id)));
    }
  }, [allPendingSelected, pendingRows]);

  // ─── Accept individual ──────────────────────────────────────────────────────
  const confirmAccept = async () => {
    if (!acceptTarget) return;
    try {
      await acceptMut.mutateAsync({ id: acceptTarget.id, wardenId });
      toast.success(`${acceptTarget.name} approved successfully! Student account is now active.`);
      if (viewDetailsTarget && (viewDetailsTarget.id === acceptTarget.id || viewDetailsTarget.student_id === acceptTarget.id)) {
        setViewDetailsTarget(null);
      }
    } catch (e) {
      toast.error(e.message || "Failed to approve student registration.");
    } finally {
      setAcceptTarget(null);
    }
  };

  // ─── Reject individual ──────────────────────────────────────────────────────
  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    try {
      await rejectMut.mutateAsync({ id: rejectTarget.id, wardenId, reason: rejectReason.trim() });
      toast.error(`${rejectTarget.name} has been rejected.`);
      if (viewDetailsTarget && (viewDetailsTarget.id === rejectTarget.id || viewDetailsTarget.student_id === rejectTarget.id)) {
        setViewDetailsTarget(null);
      }
    } catch (e) {
      toast.error(e.message || "Failed to reject student.");
    } finally {
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  // ─── Bulk operations ────────────────────────────────────────────────────────
  const confirmBulk = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      if (bulkAction === "accept") {
        const res = await bulkAcceptMut.mutateAsync({ studentIds: ids, wardenId });
        toast.success(res.message || `${ids.length} student(s) approved.`);
        if (res.results?.failed?.length) {
          toast.error(`${res.results.failed.length} record(s) could not be processed.`);
        }
      } else {
        if (!bulkReason.trim()) {
          toast.error("Please enter a rejection reason.");
          return;
        }
        const res = await bulkRejectMut.mutateAsync({ studentIds: ids, wardenId, reason: bulkReason.trim() });
        toast.error(res.message || `${ids.length} student(s) rejected.`);
      }
    } catch (e) {
      toast.error(e.message || "Bulk operation failed.");
    } finally {
      setBulkAction(null);
      setBulkReason("");
      setSelected(new Set());
    }
  };

  // ─── Excel export ───────────────────────────────────────────────────────────
  const handleDownload = () => {
    const exportRows = selected.size > 0
      ? rows.filter((r) => selected.has(r.id || r.student_id))
      : rows;
    const dateStr = new Date().getFullYear();
    downloadExcel(exportRows, `Student_Registration_Report_${dateStr}.xlsx`);
  };

  const isBulkLoading = bulkAcceptMut.isPending || bulkRejectMut.isPending;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Registration Requests"
        subtitle="Review, inspect details, approve, or reject new student registrations before login access is granted."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {selectionMode && selected.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => { setBulkAction("accept"); }}
                  iconLeft={Check}
                >
                  Approve Selected ({selected.size})
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => { setBulkAction("reject"); }}
                  iconLeft={X}
                >
                  Reject Selected ({selected.size})
                </Button>
              </>
            )}
            {!selectionMode ? (
              <Button size="sm" variant="secondary" iconLeft={CheckSquare} onClick={handleSelectAll}>
                Select Pending
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" iconLeft={Square} onClick={handleDeselectAll}>
                  Deselect All
                </Button>
                <Button size="sm" variant="ghost" onClick={handleExitSelection}>
                  Exit Selection
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" iconLeft={Download} onClick={handleDownload}>
              Download Excel
            </Button>
          </div>
        }
      />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Students"        value={meta.total}    color="bg-indigo-600"  icon={Users} />
        <StatCard label="Pending Approval"      value={meta.pending}  color="bg-amber-500"   icon={Clock} />
        <StatCard label="Approved & Active"     value={meta.accepted} color="bg-emerald-600" icon={ShieldCheck} />
        <StatCard label="Rejected"              value={meta.rejected} color="bg-red-500"     icon={X} />
      </div>

      {/* ── Section Title & Filter Controls ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Registration Requests
            </h2>
          </div>
          {selectionMode && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {selected.size} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by name, ID, Reg No, or email..."
              leftIcon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Department */}
          <div className="relative">
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEPTS.map((d) => (
                <option key={d} value={d}>{d === "all" ? "All Depts" : d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Year */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y === "all" ? "All Years" : `Year ${y}`}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Registration Requests Table ── */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading registration requests from MySQL...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Failed to load data. Check MySQL connection.</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No registration requests found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {selectionMode && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        checked={allPendingSelected}
                        onChange={toggleAllVisible}
                      />
                    </th>
                  )}
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Student ID / U.ID</th>
                  <th className="p-4">Register Number</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4 hidden sm:table-cell">Mobile Number</th>
                  <th className="p-4 hidden md:table-cell">Email</th>
                  <th className="p-4 hidden lg:table-cell">Registration Date</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => {
                  const id = row.id || row.student_id;
                  const isPending = isPendingRow(row);
                  const isChecked = selected.has(id);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors",
                        isChecked && "bg-indigo-50/60 dark:bg-indigo-950/20"
                      )}
                    >
                      {/* Checkbox column – only in selection mode, only for pending */}
                      {selectionMode && (
                        <td className="p-4">
                          {isPending ? (
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                              checked={isChecked}
                              onChange={() => toggleRow(id)}
                            />
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </td>
                      )}

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} src={row.photo_url} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {row.name}
                            </span>
                            <span className="text-[10px] text-slate-400 sm:hidden">
                              {row.phone || row.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {row.student_id || id}
                      </td>

                      <td className="p-4 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.reg_no || "—"}
                      </td>

                      <td className="p-4 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {row.department} · Year {row.year}
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400 font-mono hidden sm:table-cell whitespace-nowrap">
                        {row.phone || "—"}
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400 hidden md:table-cell max-w-[180px] truncate" title={row.email}>
                        {row.email || "—"}
                      </td>

                      <td className="p-4 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                        {fmt(row.registered_at)}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block shadow-2xs", statusChip(row.allocation_status, row.account_status))}>
                          {statusLabel(row.allocation_status, row.account_status)}
                        </span>
                        {((row.account_status || "").toUpperCase() === "REJECTED" || row.allocation_status === "rejected") && row.rejection_reason && (
                          <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 max-w-[150px] truncate" title={row.rejection_reason}>
                            {row.rejection_reason}
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. View Details Action */}
                          <button
                            type="button"
                            onClick={() => setViewDetailsTarget(row)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2 & 3. Approve / Reject Actions */}
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setAcceptTarget({ id, name: row.name })}
                                disabled={acceptMut.isPending}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRejectTarget({ id, name: row.name }); setRejectReason(""); }}
                                disabled={rejectMut.isPending}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : isRejectedRow(row) ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 italic px-1">
                                {fmt(row.decided_at)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id, name: row.name })}
                                className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Delete rejected student record"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">
                              {fmt(row.decided_at)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── View Details Modal ── */}
      <Modal
        isOpen={!!viewDetailsTarget}
        onClose={() => setViewDetailsTarget(null)}
        title="Student Registration Details"
        maxWidth="max-w-lg"
      >
        {viewDetailsTarget && (
          <div className="space-y-4">
            {/* Header Identity Card */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Avatar name={viewDetailsTarget.name} src={viewDetailsTarget.photo_url} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {viewDetailsTarget.name}
                  </h4>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold", statusChip(viewDetailsTarget.allocation_status, viewDetailsTarget.account_status))}>
                    {statusLabel(viewDetailsTarget.allocation_status, viewDetailsTarget.account_status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {viewDetailsTarget.student_id || viewDetailsTarget.id}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Reg: {viewDetailsTarget.reg_no || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Department</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTarget.department} · Year {viewDetailsTarget.year}
                  {viewDetailsTarget.gender ? ` · ${viewDetailsTarget.gender}` : ""}
                </span>
                <span className="text-slate-400 block text-[11px] mt-0.5">
                  {viewDetailsTarget.programme || "B.Tech"} ({viewDetailsTarget.section || "Sec A"})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Batch</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTarget.batch || "2023 - 2027"}
                </span>
                <span className="text-slate-400 block text-[11px] mt-0.5">
                  Registered: {fmt(viewDetailsTarget.registered_at)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Phone</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {viewDetailsTarget.phone || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={viewDetailsTarget.email}>
                  {viewDetailsTarget.email || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Guardian Information</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTarget.guardian_name || "—"} ({viewDetailsTarget.guardian_relation || "Father"})
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono block text-[11px] mt-0.5">
                  Phone: {viewDetailsTarget.guardian_phone || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Room & Floor Assignment</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewDetailsTarget.room_number ? `Room ${viewDetailsTarget.room_number} (Floor ${viewDetailsTarget.floor || "—"})` : "Awaiting Room Allocation"}
                </span>
              </div>
            </div>

            {/* Decision Information if already processed */}
            {viewDetailsTarget.decided_at && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Decision Recorded:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {fmtFull(viewDetailsTarget.decided_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 mt-1">
                  <span>Authorized By:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {viewDetailsTarget.warden_id || "Hostel Warden"}
                  </span>
                </div>
                {viewDetailsTarget.rejection_reason && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400">
                    <span className="font-bold">Rejection Reason: </span>
                    <span>{viewDetailsTarget.rejection_reason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar inside View Details */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewDetailsTarget(null)}
              >
                Close
              </Button>

              {isPendingRow(viewDetailsTarget) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    iconLeft={X}
                    onClick={() => {
                      setRejectTarget({ id: viewDetailsTarget.id || viewDetailsTarget.student_id, name: viewDetailsTarget.name });
                      setRejectReason("");
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={Check}
                    onClick={() => {
                      setAcceptTarget({ id: viewDetailsTarget.id || viewDetailsTarget.student_id, name: viewDetailsTarget.name });
                    }}
                  >
                    Approve Registration
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Accept Confirm Modal ── */}
      <Modal
        isOpen={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Approve Student Registration"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          Approve registration for <strong className="text-slate-900 dark:text-white">{acceptTarget?.name}</strong>?
          This will update their MySQL account status to <strong className="text-emerald-600 dark:text-emerald-400">APPROVED</strong> and allow the student to log in.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setAcceptTarget(null)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmAccept}
            disabled={acceptMut.isPending}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {acceptMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm Approve</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Student Registration"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          Rejecting registration for <strong className="text-slate-900 dark:text-white">{rejectTarget?.name}</strong>.
          Login access will remain permanently blocked.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter reason for rejection (e.g. Invalid register number, incomplete documentation)..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmReject}
            disabled={rejectMut.isPending || !rejectReason.trim()}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {rejectMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Confirm Reject</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Bulk Modal ── */}
      <Modal
        isOpen={!!bulkAction}
        onClose={() => { setBulkAction(null); setBulkReason(""); }}
        title={bulkAction === "accept" ? `Approve ${selected.size} Student(s)` : `Reject ${selected.size} Student(s)`}
        maxWidth="max-w-sm"
      >
        {bulkAction === "reject" && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Provide a mandatory rejection reason for all selected students.
            </p>
            <textarea
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
            />
          </>
        )}
        {bulkAction === "accept" && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
            Confirm approving <strong className="text-slate-900 dark:text-white">{selected.size}</strong> selected student registration(s)? Their accounts will be activated and login enabled.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => { setBulkAction(null); setBulkReason(""); }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmBulk}
            disabled={isBulkLoading || (bulkAction === "reject" && !bulkReason.trim())}
            className={cn(
              "px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 flex items-center gap-1.5",
              bulkAction === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isBulkLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm {bulkAction === "accept" ? "Approve" : "Reject"}</span>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Delete Rejected Student Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Rejected Student Record"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Permanently delete registration record for <strong className="text-slate-900 dark:text-white">{deleteTarget?.name}</strong>?
            This will safely purge the rejected student from database records. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteStudent}
              disabled={isDeletingStudent}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isDeletingStudent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
