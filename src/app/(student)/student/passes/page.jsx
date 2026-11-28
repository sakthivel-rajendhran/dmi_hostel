"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ticket,
  Search,
  Filter,
  PlusCircle,
  MapPin,
  Home,
  Clock,
  ChevronRight,
  MoreVertical,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Edit3,
  Trash2,
  QrCode,
  LayoutGrid,
  List,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useStudentPasses, useCancelPass, useDeletePass } from "@/hooks/queries/usePasses.js";
import { PASS_STATUSES } from "@/config/status.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { SearchInput } from "@/components/ui/SearchInput.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { DropdownMenu } from "@/components/ui/DropdownMenu.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { DataTable } from "@/components/ui/DataTable.jsx";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "gate_pass_issued", label: "Gate Pass Issued" },
  { id: "rejected", label: "Rejected" },
];

export default function StudentPassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id;

  const { data: passes = [], isLoading, isError, refetch } = useStudentPasses(studentId);
  const cancelMutation = useCancelPass();
  const deleteMutation = useDeletePass();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all"); // 'all' | 'local' | 'home'
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog state
  const [passToCancel, setPassToCancel] = useState(null);
  const [passToDelete, setPassToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to resolve rejection label and remarks cleanly
  const getRejectionInfo = (p) => {
    const overall = (p.overallStatus || p.overall_status || "").toUpperCase();
    const staffStatus = (p.staffApprovalStatus || p.staff_approval_status || "").toUpperCase();
    const hodStatus = (p.hodApprovalStatus || p.hod_approval_status || "").toUpperCase();
    const wardenStatus = (p.wardenApprovalStatus || p.warden_approval_status || "").toUpperCase();

    let label = "Rejection Reason";
    if (overall === "STAFF_REJECTED" || staffStatus === "REJECTED") {
      label = "Staff Rejection Note";
    } else if (overall === "HOD_REJECTED" || hodStatus === "REJECTED") {
      label = "HOD Rejection Note";
    } else if (overall === "WARDEN_REJECTED" || wardenStatus === "REJECTED") {
      label = "Warden Rejection Note";
    }

    const remarks =
      p.wardenReason ||
      p.wardenRemarks ||
      p.warden_remarks ||
      p.staffRemarks ||
      p.staff_remarks ||
      p.hodRemarks ||
      p.hod_remarks ||
      p.rejectionReason ||
      p.rejection_reason ||
      p.reason ||
      "Application declined by administration.";

    return { label, remarks };
  };

  // Compute status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = {
      all: passes.length,
      pending: 0,
      approved: 0,
      gate_pass_issued: 0,
      rejected: 0,
    };
    passes.forEach((p) => {
      const s = (p.status || "").toLowerCase();
      if (s === "pending" || s === "recommended") counts.pending++;
      else if (s === "approved") counts.approved++;
      else if (s === "gate_pass_issued") counts.gate_pass_issued++;
      else if (s === "rejected") counts.rejected++;
    });
    return counts;
  }, [passes]);

  // Handle Delete Pass (Only for Rejected passes)
  const handleConfirmDelete = async () => {
    if (!passToDelete || isDeleting || deleteMutation.isPending) return;
    setIsDeleting(true);
    try {
      const res = await deleteMutation.mutateAsync(passToDelete.id);
      if (res?.ok !== false) {
        toast.success(res?.message || "Outpass application deleted successfully.");
        setPassToDelete(null);
        refetch();
      } else {
        toast.error(res?.message || "Failed to delete outpass.");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to connect to delete service.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Cancel Pass (Only for Pending passes)
  const handleConfirmCancel = async () => {
    if (!passToCancel || cancelMutation.isPending) return;
    try {
      const res = await cancelMutation.mutateAsync({
        passId: passToCancel.id,
        reason: "Cancelled by student from pass list",
      });
      if (res?.ok !== false) {
        toast.success("Outpass application cancelled successfully.");
        setPassToCancel(null);
        refetch();
      } else {
        toast.error(res?.message || "Failed to cancel pass.");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to cancel pass.");
    }
  };

  // Strictly status-based action menu items according to hostel workflow policy
  const getPassMenuItems = (pass) => {
    if (!pass) return [];
    const status = (pass.status || "").toLowerCase();
    const items = [
      {
        label: "View Details",
        icon: ChevronRight,
        onClick: () => router.push(`/student/passes/${pass.id}`),
      },
    ];

    if (status === "pending" || status === "recommended") {
      items.push(
        {
          label: "Edit Application",
          icon: Edit3,
          onClick: () => router.push(`/student/apply?editPassId=${pass.id}`),
        },
        {
          label: "Cancel Application",
          icon: XCircle,
          danger: true,
          onClick: () => setPassToCancel(pass),
        }
      );
    } else if (status === "rejected") {
      items.push(
        {
          label: "Edit Application",
          icon: Edit3,
          onClick: () => router.push(`/student/apply?editPassId=${pass.id}`),
        },
        {
          label: "Delete Pass",
          icon: Trash2,
          danger: true,
          onClick: () => setPassToDelete(pass),
        }
      );
    }
    // For approved, gate_pass_issued, out, overdue, returned, completed, cancelled:
    // Display "View Details" only. No invalidating actions permitted.

    return items;
  };

  // Filter & sort logic (Always descending chronological: newest to oldest)
  const filteredPasses = useMemo(() => {
    let result = [...passes];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.passNumber && p.passNumber.toLowerCase().includes(q)) ||
          (p.destination && p.destination.toLowerCase().includes(q)) ||
          (p.reason && p.reason.toLowerCase().includes(q))
      );
    }

    if (selectedStatus !== "all") {
      const sel = selectedStatus.toLowerCase();
      result = result.filter((p) => {
        const s = (p.status || "").toLowerCase();
        if (sel === "pending") return s === "pending" || s === "recommended";
        return s === sel;
      });
    }

    if (selectedType !== "all") {
      result = result.filter((p) => (p.type || "").toLowerCase().includes(selectedType));
    }

    // Automatically sort descending: newest to oldest by creation/submission timestamp
    result.sort((a, b) => {
      const getTimestamp = (p) => {
        const val = p.appliedAt || p.createdAt || p.departureTime || p.fromTime;
        const t = val ? new Date(val).getTime() : 0;
        return isNaN(t) ? 0 : t;
      };
      return getTimestamp(b) - getTimestamp(a);
    });

    return result;
  }, [passes, search, selectedStatus, selectedType]);

  // Desktop Table Columns
  const tableColumns = useMemo(
    () => [
      {
        header: "Pass ID",
        key: "id",
        sortable: true,
        render: (_, row) => (
          <div className="space-y-0.5">
            <span className="font-mono font-bold text-xs text-primary dark:text-indigo-400">
              {row.passNumber || row.id}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {formatDateTime(row.appliedAt, "dd MMM yyyy")}
            </span>
          </div>
        ),
      },
      {
        header: "Type",
        key: "type",
        sortable: true,
        render: (_, row) => {
          const isHome = (row.type || "").toLowerCase().includes("home");
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isHome ? <Home className="w-3.5 h-3.5 text-purple-500" /> : <MapPin className="w-3.5 h-3.5 text-blue-500" />}
              {row.type}
            </span>
          );
        },
      },
      {
        header: "Destination",
        key: "destination",
        sortable: true,
        render: (_, row) => (
          <div className="max-w-[200px]">
            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
              {row.destination}
            </span>
            {row.reason && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {row.reason}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Schedule Window",
        key: "departureTime",
        render: (_, row) => (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <span className="font-medium">{formatDateTime(row.departureTime || row.fromTime, "dd MMM, hh:mm a")}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <span>Return: {formatDateTime(row.expectedReturnTime || row.toTime, "dd MMM, hh:mm a")}</span>
            </div>
          </div>
        ),
      },
      {
        header: "Gate Scans",
        key: "scans",
        render: (_, row) => (
          <div className="text-xs space-y-0.5 font-mono">
            {row?.actualExitTime ? (
              <span className="text-emerald-600 dark:text-emerald-400 block text-[11px]">
                Exit: {formatDateTime(row.actualExitTime, "hh:mm a")}
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] block">No exit scan</span>
            )}
            {row?.actualEntryTime ? (
              <span className="text-indigo-600 dark:text-indigo-400 block text-[11px]">
                In: {formatDateTime(row.actualEntryTime, "hh:mm a")}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        header: "Status",
        key: "status",
        sortable: true,
        render: (status, row) => {
          const isHome = (row.type || "").toLowerCase().includes("home") || row.workflowType === "HOME";
          const rawStatus = (row.status || "").toLowerCase();
          const displayStatus = isHome && rawStatus === "pending" ? "pending_staff" : status;
          return <StatusChip status={displayStatus} />;
        },
      },
      {
        header: "Actions",
        key: "actions",
        render: (_, row) => {
          const menuItems = getPassMenuItems(row);
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Link href={`/student/passes/${row.id}`}>
                <Button variant="outline" size="sm" className="text-xs font-semibold h-8 px-2.5">
                  Details
                </Button>
              </Link>
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    aria-label="Pass options"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                }
                align="right"
                className="w-56 z-50 shadow-xl"
                items={menuItems}
              />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [passes]
  );

  // Group passes by Month/Year for clean sticky month headers
  const groupedByMonth = useMemo(() => {
    const groups = {};
    filteredPasses.forEach((pass) => {
      const date = new Date(pass.departureTime || pass.fromTime || pass.appliedAt || Date.now());
      const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(pass);
    });
    return groups;
  }, [filteredPasses]);

  return (
    <div className="space-y-4 pb-[calc(var(--tabbar-h)+1.5rem)] lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            My Passes
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
              {filteredPasses.length}
            </span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Track and manage your hostel permissions
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle for desktop/tablet */}
          <div className="hidden sm:inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Link href="/student/apply">
            <Button size="sm" leftIcon={PlusCircle} className="text-xs font-bold shadow-xs">
              Apply Pass
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search by destination or Pass ID..."
      />

      {/* Filter Chips - Horizontally scrollable status chips with dynamic count badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedStatus === f.id;
          const count = statusCounts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedStatus(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Type Controls */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit text-xs">
        {["all", "local", "home"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedType(t)}
            className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
              selectedType === t
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      {/* Passes List States */}
      {isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <Card className="p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Failed to load pass applications from database.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={RotateCcw}>
            Try Again
          </Button>
        </Card>
      ) : filteredPasses.length === 0 ? (
        /* Empty State */
        <Card className="p-8 text-center space-y-3 border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-primary mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              No pass applications found.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {search || selectedStatus !== "all" || selectedType !== "all"
                ? "No passes match your selected search criteria and filters."
                : "You haven't submitted any outpass requests yet."}
            </p>
          </div>
          {search || selectedStatus !== "all" || selectedType !== "all" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedStatus("all");
                setSelectedType("all");
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
          ) : (
            <Link href="/student/apply">
              <Button size="sm" leftIcon={PlusCircle} className="text-xs mt-1">
                Apply Pass
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop DataTable View (only when viewMode is 'table' on >=1024px) */}
          {viewMode === "table" && (
            <div className="hidden lg:block overflow-visible">
              <DataTable
                columns={tableColumns}
                data={filteredPasses}
                page={page}
                pageSize={pageSize}
                total={filteredPasses.length}
                onPageChange={setPage}
                onRowClick={(row) => router.push(`/student/passes/${row.id}`)}
                emptyTitle="No passes found"
                emptyDescription="Try adjusting your search or filters."
              />
            </div>
          )}

          {/* Responsive Card Grid View (Always on <1024px, and on desktop when viewMode === 'cards') */}
          <div className={`${viewMode === "table" ? "lg:hidden " : ""}space-y-6`}>
            {Object.entries(groupedByMonth).map(([month, monthPasses]) => (
              <div key={month} className="space-y-2.5">
                {/* Sticky Month Header */}
                <div className="sticky top-14 z-10 py-1 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    {month} ({monthPasses.length})
                  </span>
                </div>

                {/* Responsive Card Grid: 1 col on mobile, 2 cols on tablet, 3 cols on large desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {monthPasses.map((pass) => {
                    const isOverdue = (pass.status || "").toLowerCase() === PASS_STATUSES.OVERDUE;
                    const isRejected = (pass.status || "").toLowerCase() === PASS_STATUSES.REJECTED;
                    const isHome = (pass.type || "").toLowerCase().includes("home");
                    const menuItems = getPassMenuItems(pass);
                    const rejectionInfo = isRejected ? getRejectionInfo(pass) : null;

                    return (
                      <Card
                        key={pass.id}
                        className={`p-3.5 sm:p-4 transition-all duration-200 hover:shadow-md relative overflow-visible flex flex-col justify-between gap-3 ${
                          isOverdue
                            ? "border-red-400/80 bg-red-50/40 dark:border-red-500/50 dark:bg-red-950/20"
                            : isRejected
                            ? "border-rose-200/90 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-xs"
                            : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {/* Overdue left accent strip */}
                        {isOverdue && (
                          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-red-500 rounded-l-2xl" />
                        )}

                        {/* Top & Middle Content Container */}
                        <div className="space-y-3">
                          {/* 1. Header: Pass Icon + ID/Type/Destination (Left) & Status Badge + 3-Dot Menu (Right) */}
                          <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                            {/* Left: Icon & Pass Info */}
                            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isRejected
                                    ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                    : isHome
                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                }`}
                              >
                                {isHome ? <Home className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                {/* Pass ID & Type */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                                    {pass.passNumber || pass.id}
                                  </span>
                                  {isOverdue && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                    • {pass.type}
                                  </span>
                                </div>

                                {/* Destination */}
                                <h4
                                  className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5"
                                  title={pass.destination || pass.studentName}
                                >
                                  {pass.destination || pass.studentName || "Outpass Request"}
                                </h4>
                              </div>
                            </div>

                            {/* Right: Status badge & 3-dot action menu */}
                            <div className="flex items-center gap-1.5 shrink-0 self-start">
                              <StatusChip
                                status={
                                  isHome && (pass.status || "").toLowerCase() === "pending"
                                    ? "pending_staff"
                                    : pass.status
                                }
                              />
                              <DropdownMenu
                                trigger={
                                  <button
                                    type="button"
                                    aria-label="Pass options"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                }
                                align="right"
                                className="w-52 z-50 shadow-xl"
                                items={menuItems}
                              />
                            </div>
                          </div>

                          {/* 2. Schedule / Date & Time Row */}
                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 min-w-0">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              <span className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                                {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
                              </span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-600 font-bold text-xs shrink-0 select-none">
                              →
                            </span>
                            <div className="inline-flex items-center gap-1.5 min-w-0">
                              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              <span className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                                {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
                              </span>
                            </div>
                          </div>

                          {/* 3. Rejection Remarks Container */}
                          {isRejected && rejectionInfo && (
                            <div className="w-full p-3 sm:p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs shadow-xs">
                              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 mb-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>{rejectionInfo.label}:</span>
                              </div>
                              <p className="text-rose-700 dark:text-rose-200/90 text-xs leading-relaxed break-words whitespace-normal font-normal">
                                {rejectionInfo.remarks}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 4. Card Footer: Applied Date (Left) and View Timeline (Right) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                            Applied {formatDateTime(pass.appliedAt || pass.createdAt, "dd MMM yyyy")}
                          </span>
                          <Link
                            href={`/student/passes/${pass.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary dark:text-indigo-400 hover:text-primary/80 transition-colors shrink-0 group"
                          >
                            <span>View timeline</span>
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cancel Pass ConfirmDialog */}
      <ConfirmDialog
        isOpen={!!passToCancel}
        onClose={() => !cancelMutation.isPending && setPassToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Outpass Application?"
        description={`Are you sure you want to cancel pass ${passToCancel?.passNumber || passToCancel?.id}? Your outpass request will be marked as cancelled.`}
        confirmText="Yes, Cancel Pass"
        cancelText="Keep Pass"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />

      {/* Delete Pass ConfirmDialog */}
      <ConfirmDialog
        isOpen={!!passToDelete}
        onClose={() => !isDeleting && !deleteMutation.isPending && setPassToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Outpass Application?"
        description={`Are you sure you want to permanently delete outpass ${passToDelete?.passNumber || passToDelete?.id}? This rejected record will be permanently deleted from database.`}
        confirmText="Yes, Delete Pass"
        cancelText="Keep Pass"
        variant="danger"
        isLoading={isDeleting || deleteMutation.isPending}
      />
    </div>
  );
}
