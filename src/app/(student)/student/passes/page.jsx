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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useStudentPasses, useCancelPass } from "@/hooks/queries/usePasses.js";
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
  { id: PASS_STATUSES.PENDING, label: "Pending" },
  { id: PASS_STATUSES.APPROVED, label: "Approved" },
  { id: PASS_STATUSES.GATE_PASS_ISSUED, label: "Gate Pass Issued" },
  { id: PASS_STATUSES.REJECTED, label: "Rejected" },
];

export default function StudentPassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: passes = [], isLoading, isError, refetch } = useStudentPasses(studentId);
  const cancelMutation = useCancelPass();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all"); // 'all' | 'local' | 'home'
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Cancel dialog state
  const [passToCancel, setPassToCancel] = useState(null);

  // Filter & sort logic (Always descending chronological: newest to oldest)
  const filteredPasses = useMemo(() => {
    let result = [...passes];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          (p.passNumber && p.passNumber.toLowerCase().includes(q)) ||
          p.destination.toLowerCase().includes(q) ||
          (p.reason && p.reason.toLowerCase().includes(q))
      );
    }

    if (selectedStatus !== "all") {
      result = result.filter((p) => p.status === selectedStatus);
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
        render: (status) => <StatusChip status={status} />,
      },
      {
        header: "Actions",
        key: "actions",
        render: (_, row) => {
          const canCancel = [PASS_STATUSES.PENDING, PASS_STATUSES.RECOMMENDED].includes(row.status);
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
                className="w-40"
                items={[
                  {
                    label: "Apply Again",
                    icon: RotateCcw,
                    onClick: () => handleApplyAgain(row),
                  },
                  ...(canCancel
                    ? [
                        {
                          label: "Cancel Pass",
                          icon: XCircle,
                          danger: true,
                          onClick: () => setPassToCancel(row),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          );
        },
      },
    ],
    []
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

  // Handle Cancel Pass
  const handleConfirmCancel = async () => {
    if (!passToCancel) return;
    try {
      await cancelMutation.mutateAsync({
        passId: passToCancel.id,
        reason: "Cancelled by student from pass list",
      });
      toast.success("Outpass has been cancelled.");
      setPassToCancel(null);
    } catch (e) {
      toast.error("Failed to cancel pass.");
    }
  };

  // Handle Apply Again (prefill draft in sessionStorage)
  const handleApplyAgain = (pass) => {
    if (typeof window !== "undefined") {
      const draft = {
        passType: pass.type || "Local Pass",
        isEmergency: pass.emergency || false,
        formValues: {
          destination: pass.destination || "",
          reason: pass.reason || "",
          guardianPhone: pass.guardianPhone || "",
          exitTime: "16:00",
          returnTime: "20:00",
        },
      };
      sessionStorage.setItem("dmi_student_apply_draft_v2", JSON.stringify(draft));
      toast.success("Details copied to application form.");
      router.push("/student/apply");
    }
  };

  return (
    <div className="space-y-4 pb-[calc(var(--tabbar-h)+1.5rem)] lg:pb-8">
      {/* Header */}
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

      {/* Search Input */}
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search by destination or Pass ID..."
      />

      {/* Filter Chips - Horizontally scrollable status chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedStatus === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedStatus(f.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
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
            Failed to load pass records.
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
              No passes found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {search || selectedStatus !== "all" || selectedType !== "all"
                ? "No passes match your selected search criteria and filters."
                : "You haven't submitted any outpass requests yet."}
            </p>
          </div>
          {(search || selectedStatus !== "all" || selectedType !== "all") && (
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
          )}
        </Card>
      ) : (
        <>
          {/* Desktop DataTable View (>= 1024px) */}
          <div className="hidden lg:block">
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

          {/* Mobile & Tablet Card Grid View (< 1024px) */}
          <div className="lg:hidden space-y-6">
            {Object.entries(groupedByMonth).map(([month, monthPasses]) => (
              <div key={month} className="space-y-2.5">
                {/* Sticky Month Header */}
                <div className="sticky top-14 z-10 py-1 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                    {month} ({monthPasses.length})
                  </span>
                </div>

                {/* Responsive 1-col on mobile, 2-cols on tablet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {monthPasses.map((pass) => {
                    const isOverdue = pass.status === PASS_STATUSES.OVERDUE;
                    const isRejected = pass.status === PASS_STATUSES.REJECTED;
                    const canCancel = [PASS_STATUSES.PENDING, PASS_STATUSES.RECOMMENDED].includes(pass.status);
                    const isHome = (pass.type || "").toLowerCase().includes("home");

                    return (
                      <Card
                        key={pass.id}
                        className={`p-3.5 transition-all duration-200 hover:shadow-md hover:border-primary/40 relative overflow-hidden flex flex-col justify-between ${
                          isOverdue
                            ? "border-red-400/80 bg-red-50/40 dark:border-red-500/50 dark:bg-red-950/20"
                            : ""
                        }`}
                      >
                        {/* Overdue left accent strip */}
                        {isOverdue && (
                          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-red-500" />
                        )}

                        <div className="flex items-start justify-between gap-2.5 pl-1">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {/* Type Icon */}
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isHome
                                  ? "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                                  : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                              }`}
                            >
                              {isHome ? <Home className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Pass ID & Pulsing Red Dot for Overdue */}
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                  {pass.passNumber || pass.id}
                                </span>
                                {isOverdue && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {pass.type}
                                </span>
                              </div>

                              {/* Destination */}
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                                {pass.destination}
                              </h4>

                              {/* Date range */}
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
                                  {" → "}
                                  {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
                                </span>
                              </div>

                              {/* Rejected Warden Reason Snippet */}
                              {isRejected && (pass.wardenReason || pass.reason) && (
                                <div className="mt-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-[11px] text-red-700 dark:text-red-300 line-clamp-1">
                                  <span className="font-bold">Warden Note: </span>
                                  {pass.wardenReason || pass.reason}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Chip & Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <StatusChip status={pass.status} />

                            {/* Quick Overflow Dropdown */}
                            <DropdownMenu
                              trigger={
                                <button
                                  type="button"
                                  aria-label="Pass options"
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              }
                              align="right"
                              className="w-40"
                              items={[
                                {
                                  label: "View Details",
                                  icon: ChevronRight,
                                  onClick: () => router.push(`/student/passes/${pass.id}`),
                                },
                                {
                                  label: "Apply Again",
                                  icon: RotateCcw,
                                  onClick: () => handleApplyAgain(pass),
                                },
                                ...(canCancel
                                  ? [
                                      {
                                        label: "Cancel Pass",
                                        icon: XCircle,
                                        danger: true,
                                        onClick: () => setPassToCancel(pass),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </div>

                        {/* Card Bottom Quick Link */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400">
                            Applied {formatDateTime(pass.appliedAt, "dd MMM yyyy")}
                          </span>
                          <Link
                            href={`/student/passes/${pass.id}`}
                            className="font-bold text-primary hover:underline flex items-center gap-0.5 text-xs"
                          >
                            View timeline <ChevronRight className="w-3.5 h-3.5" />
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
        onClose={() => setPassToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Outpass Application?"
        description={`Are you sure you want to cancel pass ${passToCancel?.passNumber || passToCancel?.id}? Your faculty advisor will be updated.`}
        confirmText="Yes, Cancel Pass"
        cancelText="Keep Pass"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
