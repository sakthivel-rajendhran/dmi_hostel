"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Phone,
  Bed,
  Layers,
  Undo2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  User,
  Calendar,
  MapPin,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useRecommendQueue,
  useRecommendStats,
  useRecommendPass,
  useBulkRecommend,
  useUndoRecommendation,
} from "@/hooks/queries/useDepartment.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

const QUICK_REASON_CHIPS = [
  "Low Academic Attendance (< 75%)",
  "Scheduled CIA Model Lab / Unit Test Tomorrow",
  "Guardian Call Not Answered / Unverified",
  "Disciplinary Review Pending with Hostel Admin",
  "Exceeds Permissible Department Leave Limit",
];

export function DepartmentRequests({ role = "staff" }) {
  const { user } = useAuth();
  const isHod = role === "hod";
  const deptCode = user?.dept || user?.department || "CSE";
  const assignedYears = user?.assignedYears || [];

  const searchParams = useSearchParams();
  const queryPassId = searchParams.get("pass");

  // State
  const [activeTab, setActiveTab] = useState("awaiting_recommendation");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState(null);

  // Dialog states
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [recommendNote, setRecommendNote] = useState("Academic standing verified and cleared.");
  const [declineNote, setDeclineNote] = useState("");

  const searchInputRef = useRef(null);

  // Queries & Mutations
  const { data: passes = [], isLoading, refetch } = useRecommendQueue({
    tab: activeTab,
    search: searchTerm,
    year: yearFilter,
    floor: floorFilter,
    emergency: emergencyOnly,
  });

  const { data: stats } = useRecommendStats();
  const recommendMutation = useRecommendPass();
  const bulkRecommendMutation = useBulkRecommend();
  const undoMutation = useUndoRecommendation();

  // Pick initial selected pass
  useEffect(() => {
    if (queryPassId) {
      setSelectedPassId(queryPassId);
    } else if (passes.length > 0 && !selectedPassId) {
      setSelectedPassId(passes[0].id);
    }
  }, [queryPassId, passes]);

  // Selected pass record
  const selectedPass = passes.find((p) => p.id === selectedPassId || p.passNumber === selectedPassId) || passes[0];

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept typing in inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const curIdx = passes.findIndex((p) => p.id === selectedPassId);
        if (curIdx >= 0 && curIdx < passes.length - 1) {
          setSelectedPassId(passes[curIdx + 1].id);
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const curIdx = passes.findIndex((p) => p.id === selectedPassId);
        if (curIdx > 0) {
          setSelectedPassId(passes[curIdx - 1].id);
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (selectedPass) {
          setRecommendNote("Academic standing verified and cleared.");
          setIsRecommendModalOpen(true);
        }
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (selectedPass) {
          setDeclineNote("");
          setIsDeclineModalOpen(true);
        }
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "?") {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [passes, selectedPassId, selectedPass]);

  // Handle Recommend Action
  const handleConfirmRecommend = async () => {
    if (!selectedPass) return;
    const passId = selectedPass.id;

    try {
      await recommendMutation.mutateAsync({
        passId,
        verdict: "recommend",
        note: recommendNote,
      });

      setIsRecommendModalOpen(false);
      toast.success(
        <div className="flex items-center justify-between gap-3 w-full">
          <span>Recommended pass for {selectedPass.studentName}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 bg-white text-slate-900 border-slate-300"
            onClick={async () => {
              await undoMutation.mutateAsync({ passId });
              toast.info(`Recommendation undone for Pass #${passId}`);
            }}
          >
            Undo (10s)
          </Button>
        </div>,
        { duration: 10000 }
      );
    } catch (err) {
      toast.error(err.message || "Failed to recommend pass");
    }
  };

  // Handle Decline (Do Not Recommend) Action
  const handleConfirmDecline = async () => {
    if (!selectedPass) return;
    if (!declineNote.trim()) {
      toast.error("Please provide a reason note when declining recommendation");
      return;
    }
    const passId = selectedPass.id;

    try {
      await recommendMutation.mutateAsync({
        passId,
        verdict: "do_not_recommend",
        note: declineNote.trim(),
      });

      setIsDeclineModalOpen(false);
      toast.warning(
        <div className="flex items-center justify-between gap-3 w-full">
          <span>Advisory verdict recorded: Do Not Recommend</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 bg-white text-slate-900 border-slate-300"
            onClick={async () => {
              await undoMutation.mutateAsync({ passId });
              toast.info(`Recommendation undone for Pass #${passId}`);
            }}
          >
            Undo (10s)
          </Button>
        </div>,
        { duration: 10000 }
      );
    } catch (err) {
      toast.error(err.message || "Failed to record verdict");
    }
  };

  // Bulk Recommend
  const handleConfirmBulk = async () => {
    const eligibleIds = passes
      .filter((p) => p.status === "pending")
      .map((p) => p.id);

    if (eligibleIds.length === 0) {
      toast.info("No eligible pending passes in this view to recommend");
      setIsBulkModalOpen(false);
      return;
    }

    try {
      const res = await bulkRecommendMutation.mutateAsync({
        passIds: eligibleIds,
        note: "Bulk academic recommendation verified for department cohort.",
      });

      setIsBulkModalOpen(false);
      if (res.skippedCount > 0) {
        toast.warning(
          `Recommended ${res.recommendedCount} passes. Skipped ${res.skippedCount} student(s) with active overdue passes.`
        );
      } else {
        toast.success(`Successfully recommended ${res.recommendedCount} passes!`);
      }
    } catch (err) {
      toast.error(err.message || "Bulk recommendation failed");
    }
  };

  // Tab definitions
  const tabs = [
    {
      id: "awaiting_recommendation",
      label: `Awaiting My Review (${stats?.awaiting ?? passes.filter((p) => p.status === "pending").length})`,
    },
    {
      id: "recommended_by_me",
      label: `Reviewed by Me (${stats?.recommendedByMe ?? 0})`,
    },
    {
      id: "all",
      label: `All Department Passes (${stats?.all ?? passes.length})`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pass Recommendation Queue (${deptCode})`}
        subtitle={
          isHod
            ? "HOD Academic Advisory & Department Passes Review"
            : `Faculty Advisor Review • Assigned: Year ${assignedYears.join(", ") || "All"}`
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHelpModalOpen(true)}
            leftIcon={HelpCircle}
            className="text-xs"
          >
            Shortcuts
          </Button>
          <Button
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            leftIcon={Layers}
            className={cn(
              "text-xs font-semibold text-white",
              isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"
            )}
          >
            Bulk Recommend
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Queue List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-3 space-y-3">
            {/* Filter Bar */}
            <div className="space-y-2">
              <Input
                ref={searchInputRef}
                placeholder="Search resident, room, reason... (/)"
                leftIcon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs"
              />

              <div className="flex items-center gap-2">
                <Select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-1/2 text-xs"
                >
                  <option value="all">All Years</option>
                  {(!isHod && assignedYears.length > 0 ? assignedYears : [1, 2, 3, 4]).map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </Select>

                <Select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="w-1/2 text-xs"
                >
                  <option value="all">All Floors</option>
                  <option value="GF">Ground Floor</option>
                  <option value="F2">2nd Floor</option>
                  <option value="F3">3rd Floor</option>
                  <option value="F4">4th Floor</option>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyOnly}
                    onChange={(e) => setEmergencyOnly(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Emergency only</span>
                </label>
                <span>{passes.length} requests</span>
              </div>
            </div>
          </Card>

          {/* Pass Items List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="space-y-3 p-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : passes.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Queue is clear</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No passes waiting under this view.</p>
              </div>
            ) : (
              passes.map((pass) => {
                const isSelected = selectedPass?.id === pass.id;
                const hasMyRec = (pass.recommendations || []).find((r) => r.byId === user?.id);

                return (
                  <div
                    key={pass.id}
                    onClick={() => setSelectedPassId(pass.id)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition cursor-pointer select-none relative",
                      isSelected
                        ? isHod
                          ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-500/80 shadow-sm ring-1 ring-violet-500/40"
                          : "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500/80 shadow-sm ring-1 ring-teal-500/40"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={pass.studentName} size="sm" />
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            {pass.studentName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Year {pass.year} • Room {pass.room || pass.roomNo || "—"}
                          </p>
                        </div>
                      </div>
                      <StatusChip status={pass.status} size="sm" />
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{pass.type}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatDate(pass.departureTime || pass.fromTime)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        To: {pass.destination}
                      </p>
                    </div>

                    {/* Context Badges Strip */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {pass.emergency && (
                          <span className="px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            EMERGENCY
                          </span>
                        )}
                        {hasMyRec && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded font-semibold",
                              hasMyRec.verdict === "recommend"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {hasMyRec.verdict === "recommend" ? "Recommended" : "Not Recommended"}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono">{pass.passNumber || pass.id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Detail Panel (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedPass ? (
            <Card className="p-5 sm:p-6 space-y-6">
              {/* Top Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <Avatar name={selectedPass.studentName} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedPass.studentName}
                      </h3>
                      <StatusChip status={selectedPass.status} />
                      {selectedPass.emergency && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                          EMERGENCY REQUEST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedPass.studentId} • Room {selectedPass.room || selectedPass.roomNo} ({selectedPass.floorLabel || "Floor"})
                    </p>
                  </div>
                </div>

                {selectedPass.guardianPhone && (
                  <a
                    href={`tel:${selectedPass.guardianPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 self-start sm:self-auto"
                  >
                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                    <span>Call Guardian</span>
                  </a>
                )}
              </div>

              {/* Context Strip: Compliance & Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Home Passes (Mo.)</span>
                  <strong className="text-slate-900 dark:text-white font-bold">1 / 2 Used</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">90D Late Returns</span>
                  <strong className="text-emerald-600 font-bold">0 Incidents</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Overdue Status</span>
                  <strong className="text-emerald-600 font-bold">None (Clear)</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Guardian Consent</span>
                  <strong className="text-emerald-600 font-bold">Verified (Call)</strong>
                </div>
              </div>

              {/* Pass Specifics */}
              <div className="space-y-4 text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Outpass Schedule & Justification
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Outpass Type</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedPass.type}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Applied At</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {formatDateTime(selectedPass.appliedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expected Departure</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      {formatDateTime(selectedPass.departureTime || selectedPass.fromTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expected Return</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      {formatDateTime(selectedPass.expectedReturnTime || selectedPass.toTime)}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Destination</span>
                    <strong className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {selectedPass.destination}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block">Reason for Outpass</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      {selectedPass.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Existing Academic Recommendations */}
              <div className="space-y-3 text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Academic Recommendations History
                </h4>

                {selectedPass.recommendations && selectedPass.recommendations.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedPass.recommendations.map((rec, idx) => {
                      const isRecHod = rec.role === "hod";
                      const isPositive = rec.verdict === "recommend";

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  isRecHod
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                    : "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                                )}
                              >
                                {isRecHod ? "HOD Verdict" : "Faculty Advisor"}
                              </span>
                              <strong className="text-slate-900 dark:text-white font-semibold">
                                {rec.name}
                              </strong>
                            </div>
                            <span
                              className={cn(
                                "text-[11px] font-bold px-2 py-0.5 rounded-full",
                                isPositive
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              )}
                            >
                              {isPositive ? "Recommended" : "Do Not Recommend"}
                            </span>
                          </div>
                          {rec.note && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                              "{rec.note}"
                            </p>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatDateTime(rec.at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    No academic recommendations recorded on this request yet.
                  </p>
                )}
              </div>

              {/* Read-Only Warden Approval Status */}
              <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Hostel Administration (Chief Warden) Decision
                  </span>
                  <StatusChip status={selectedPass.status} size="sm" />
                </div>
                <p className="text-[11px] text-slate-500">
                  {selectedPass.status === "approved" || selectedPass.status === "gate_pass_issued"
                    ? "Approved by Chief Warden for campus departure."
                    : selectedPass.status === "rejected"
                    ? `Rejected: ${selectedPass.wardenReason || "Curfew restrictions"}`
                    : "Awaiting final decision from Chief Warden after academic recommendation."}
                </p>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Keyboard: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">R</kbd> Recommend • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">N</kbd> Decline
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none text-xs border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    leftIcon={XCircle}
                    onClick={() => {
                      setDeclineNote("");
                      setIsDeclineModalOpen(true);
                    }}
                  >
                    Do Not Recommend (N)
                  </Button>

                  <Button
                    className={cn(
                      "flex-1 sm:flex-none text-xs font-semibold text-white",
                      isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"
                    )}
                    leftIcon={CheckCircle2}
                    onClick={() => {
                      setRecommendNote("Academic standing verified and cleared.");
                      setIsRecommendModalOpen(true);
                    }}
                  >
                    Recommend Pass (R)
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-400 text-xs">
              Select a pass request from the left queue to view details.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Recommend Pass */}
      <Modal
        isOpen={isRecommendModalOpen}
        onClose={() => setIsRecommendModalOpen(false)}
        title={`Recommend Outpass for ${selectedPass?.studentName}`}
        description="Provide an optional academic standing verification note for the Chief Warden."
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Advisory Recommendation Note (Optional)
            </label>
            <Textarea
              rows={3}
              value={recommendNote}
              onChange={(e) => setRecommendNote(e.target.value)}
              placeholder="e.g. Academic attendance verified, cleared for leave..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRecommendModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRecommend}
              isLoading={recommendMutation.isPending}
              className={cn("text-xs text-white", isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700")}
            >
              Confirm Recommendation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Do Not Recommend Pass (Requires Note) */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title={`Decline Recommendation for ${selectedPass?.studentName}`}
        description="A clear advisory reason is required when withholding academic recommendation."
      >
        <div className="space-y-4 pt-2 text-xs">
          {/* Quick Chips */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Select Common Reason:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASON_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDeclineNote(chip)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 text-left transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Advisory Reason Note <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={3}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="Explain why this pass is not recommended..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDeclineModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleConfirmDecline}
              isLoading={recommendMutation.isPending}
              className="text-xs"
            >
              Submit Do Not Recommend
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Bulk Recommend */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Recommend Eligible Passes"
        description="Verify and recommend all pending outpass requests currently in view."
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-1">
            <p>
              • Pending passes in current filter: <strong>{passes.filter((p) => p.status === "pending").length}</strong>
            </p>
            <p className="text-rose-600 dark:text-rose-400 font-medium">
              • Students with an active overdue pass will be automatically skipped.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsBulkModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmBulk}
              isLoading={bulkRecommendMutation.isPending}
              className={cn("text-xs text-white", isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700")}
            >
              Recommend All Eligible
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Keyboard Shortcuts Cheat Sheet */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Pass Review Keyboard Shortcuts"
      >
        <div className="space-y-3 pt-2 text-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Next Pass in Queue</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">J or ↓</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Previous Pass in Queue</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">K or ↑</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Open Recommend Dialog</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">R</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Open Do Not Recommend Dialog</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">N</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Focus Search Bar</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">/</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Toggle Shortcuts Dialog</span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">?</kbd>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DepartmentRequests;
