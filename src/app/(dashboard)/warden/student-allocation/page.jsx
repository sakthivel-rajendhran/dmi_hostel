"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Search, Download, CheckSquare, Square, Users,
  Check, X, AlertCircle, Loader2, ChevronDown, Filter,
} from "lucide-react";
import { PageHeader }  from "@/components/ui/PageHeader.jsx";
import { Card }        from "@/components/ui/Card.jsx";
import { Button }      from "@/components/ui/Button.jsx";
import { Input }       from "@/components/ui/Input.jsx";
import { Modal }       from "@/components/ui/Modal.jsx";
import { useAuth }     from "@/hooks/use-auth.js";
import {
  useStudentAllocations,
  useAcceptStudent,
  useRejectStudent,
  useBulkAccept,
  useBulkReject,
} from "@/hooks/queries/useStudentAllocations.js";
import { cn } from "@/lib/utils/cn.js";

// ─── helpers ─────────────────────────────────────────────────────────────────
const DEPTS = ["all", "CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AI&DS"];
const YEARS = ["all", "1", "2", "3", "4"];
const STATUS_OPTS = [
  { value: "all",                label: "All Status"  },
  { value: "waiting_for_warden", label: "Pending"     },
  { value: "accepted",           label: "Accepted"    },
  { value: "rejected",           label: "Rejected"    },
];

function statusChip(s) {
  if (s === "accepted")          return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
  if (s === "rejected")          return "bg-red-100    dark:bg-red-950/60    text-red-700    dark:text-red-300";
  return                                "bg-amber-100  dark:bg-amber-950/60  text-amber-700  dark:text-amber-300";
}
function statusLabel(s) {
  if (s === "accepted")          return "Accepted";
  if (s === "rejected")          return "Rejected";
  return                                "Pending";
}
function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Excel export (SheetJS via CDN shim — bundled via xlsx package) ───────────
async function downloadExcel(rows, filename = "Student_Allocation_Report.xlsx") {
  if (!rows || rows.length === 0) {
    toast.error("No records to export.");
    return;
  }
  const XLSX = await import("xlsx");
  const wsData = [
    ["Student ID", "Name", "Email", "Phone", "Department", "Year", "Room No", "Registered On",
     "Allocation Status", "Decision Date", "Rejection Reason"],
    ...rows.map((r) => [
      r.student_id || r.id,
      r.name,
      r.email,
      r.phone || "—",
      r.department,
      r.year,
      r.room_number || "—",
      fmt(r.registered_at),
      statusLabel(r.allocation_status),
      fmt(r.decided_at),
      r.rejection_reason || "—",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Allocations");
  XLSX.writeFile(wb, filename);
  toast.success(`Exported ${rows.length} record(s) to ${filename}`);
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", color)}>
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
  const [search,     setSearch]     = useState("");
  const [dept,       setDept]       = useState("all");
  const [year,       setYear]       = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected,       setSelected]      = useState(new Set());

  // Modal state
  const [acceptTarget,   setAcceptTarget]  = useState(null); // { id, name }
  const [rejectTarget,   setRejectTarget]  = useState(null); // { id, name }
  const [rejectReason,   setRejectReason]  = useState("");
  const [bulkAction,     setBulkAction]    = useState(null); // "accept" | "reject"
  const [bulkReason,     setBulkReason]    = useState("");

  // Data
  const { data: allocationData, isLoading, isError } = useStudentAllocations(
    { status: statusFilter, dept, year, search }
  );
  const rows = allocationData?.data  || [];
  const meta = allocationData?.meta  || {};

  // Mutations
  const acceptMut     = useAcceptStudent();
  const rejectMut     = useRejectStudent();
  const bulkAcceptMut = useBulkAccept();
  const bulkRejectMut = useBulkReject();

  // Pending rows = eligible for selection
  const pendingRows = useMemo(() => rows.filter((r) => r.allocation_status === "waiting_for_warden"), [rows]);

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
      toast.success(`${acceptTarget.name} accepted successfully!`);
    } catch (e) {
      toast.error(e.message || "Failed to accept student.");
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
        toast.success(res.message || `${ids.length} student(s) accepted.`);
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
    downloadExcel(exportRows, `Student_Allocation_Report_${dateStr}.xlsx`);
  };

  const isBulkLoading = bulkAcceptMut.isPending || bulkRejectMut.isPending;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Allocation"
        subtitle="Review and manage newly registered student allocation requests."
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
                  Accept Selected ({selected.size})
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
                Select All
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
        <StatCard label="Total Students"   value={meta.total}   color="bg-indigo-500"  icon={Users} />
        <StatCard label="Pending"          value={meta.pending}  color="bg-amber-500"   icon={ClipboardList} />
        <StatCard label="Accepted"         value={meta.accepted} color="bg-emerald-500" icon={Check} />
        <StatCard label="Rejected"         value={meta.rejected} color="bg-red-500"     icon={X} />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, ID, or email..."
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

        {selectionMode && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold ml-auto">
            {selected.size} selected
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading allocation records...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Failed to load data. Check database connection.</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No students found matching the current filters.
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
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4 hidden md:table-cell">Email</th>
                  <th className="p-4 hidden sm:table-cell">Phone</th>
                  <th className="p-4">Dept / Yr</th>
                  <th className="p-4 hidden lg:table-cell">Room</th>
                  <th className="p-4 hidden lg:table-cell">Registered</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => {
                  const id = row.id || row.student_id;
                  const isPending = row.allocation_status === "waiting_for_warden";
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

                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {row.student_id || id}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-[180px] truncate">
                        {row.email}
                      </td>
                      <td className="p-4 text-slate-500 font-mono hidden sm:table-cell">
                        {row.phone || "—"}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.department} · Y{row.year}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                        {row.room_number || "—"}
                      </td>
                      <td className="p-4 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                        {fmt(row.registered_at)}
                      </td>
                      <td className="p-4">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", statusChip(row.allocation_status))}>
                          {statusLabel(row.allocation_status)}
                        </span>
                        {row.allocation_status === "rejected" && row.rejection_reason && (
                          <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px] truncate" title={row.rejection_reason}>
                            {row.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setAcceptTarget({ id, name: row.name })}
                              disabled={acceptMut.isPending}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => { setRejectTarget({ id, name: row.name }); setRejectReason(""); }}
                              disabled={rejectMut.isPending}
                              className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {fmt(row.decided_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Accept Confirm Modal ── */}
      <Modal
        isOpen={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        title="Confirm Acceptance"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Accept <strong className="text-slate-900 dark:text-white">{acceptTarget?.name}</strong> as a hostel resident?
          This will update their allocation status to <strong>Accepted</strong>.
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
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60"
          >
            {acceptMut.isPending ? "Processing..." : "Yes, Accept"}
          </button>
        </div>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Student"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Rejecting <strong className="text-slate-900 dark:text-white">{rejectTarget?.name}</strong>.
          Please provide a mandatory reason.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason..."
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
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60"
          >
            {rejectMut.isPending ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </Modal>

      {/* ── Bulk Modal ── */}
      <Modal
        isOpen={!!bulkAction}
        onClose={() => { setBulkAction(null); setBulkReason(""); }}
        title={bulkAction === "accept" ? `Accept ${selected.size} Student(s)` : `Reject ${selected.size} Student(s)`}
        maxWidth="max-w-sm"
      >
        {bulkAction === "reject" && (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Confirm accepting <strong className="text-slate-900 dark:text-white">{selected.size}</strong> selected student(s) as hostel residents?
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
              "px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60",
              bulkAction === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isBulkLoading ? "Processing..." : `Confirm ${bulkAction === "accept" ? "Accept" : "Reject"}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
