"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSafeSearchParams } from "@/hooks/useSafeSearchParams.js";
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
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  FileText,
  Copy,
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
import { resolveParentContact } from "@/lib/utils/contactResolution.js";

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

  const searchParams = useSafeSearchParams();
  const queryPassId = searchParams.get("pass");

  // State
  const [activeTab, setActiveTab] = useState("awaiting_recommendation");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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

  const { data: stats, refetch: refetchStats } = useRecommendStats();
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
      } else if (
        e.key === "r" ||
        e.key === "R" ||
        (isHod && (e.key === "f" || e.key === "F"))
      ) {
        e.preventDefault();
        if (selectedPass) {
          const isHome = (selectedPass.type || "").toLowerCase().includes("home");
          const isStaffOk =
            selectedPass.staffApprovalStatus === "APPROVED" ||
            selectedPass.staff_approval_status === "APPROVED";
          if (isHod && isHome && !isStaffOk) {
            toast.warning("Home Outpass requires Faculty Advisor recommendation before HOD forwarding.");
            return;
          }
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
      refetch?.();
      refetchStats?.();
      toast.success(
        <div className="flex items-center justify-between gap-3 w-full">
          <span>
            {isHod
              ? `Endorsed and forwarded pass for ${selectedPass.studentName}`
              : `Recommended pass for ${selectedPass.studentName}`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 bg-white text-slate-900 border-slate-300"
            onClick={async () => {
              await undoMutation.mutateAsync({ passId });
              toast.info(`Action undone for Pass #${passId}`);
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
      refetch?.();
      refetchStats?.();
      toast.warning(
        <div className="flex items-center justify-between gap-3 w-full">
          <span>
            {isHod
              ? `Endorsement declined for ${selectedPass.studentName}`
              : `Advisory verdict recorded: Do Not Recommend`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 bg-white text-slate-900 border-slate-300"
            onClick={async () => {
              await undoMutation.mutateAsync({ passId });
              toast.info(`Action undone for Pass #${passId}`);
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
      refetch?.();
      refetchStats?.();
      return;
    }

    try {
      const res = await bulkRecommendMutation.mutateAsync({
        passIds: eligibleIds,
        note: "Bulk academic recommendation verified for department cohort.",
      });

      setIsBulkModalOpen(false);
      refetch?.();
      refetchStats?.();
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

      {/* Tabs - Horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(t) => {
            setActiveTab(t);
            setMobileShowDetail(false);
          }}
        />
      </div>

      {/* Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: Queue List (5 Cols on desktop, toggleable on mobile) */}
        <div
          className={cn(
            "lg:col-span-5 space-y-3",
            mobileShowDetail ? "hidden lg:block" : "block"
          )}
        >
          {/* Filter Card */}
          <Card className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
            {/* Search Input */}
            <Input
              ref={searchInputRef}
              placeholder="Search resident, room, reason... (/)"
              leftIcon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-9"
            />

            {/* Year & Floor Filters */}
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="text-xs h-9"
              >
                <option value="all">All Academic Years</option>
                {(!isHod && assignedYears.length > 0 ? assignedYears : [1, 2, 3, 4]).map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </Select>

              <Select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="text-xs h-9"
              >
                <option value="all">All Floors</option>
                <option value="GF">Ground Floor</option>
                <option value="F2">2nd Floor</option>
                <option value="F3">3rd Floor</option>
                <option value="F4">4th Floor</option>
              </Select>
            </div>

            {/* Emergency Toggle & Count Badge */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={emergencyOnly}
                  onChange={(e) => setEmergencyOnly(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                  Emergency only
                </span>
              </label>
              <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {passes.length} requests
              </span>
            </div>
          </Card>

          {/* Compact Pass Cards List with Independent Scroll */}
          <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1 scrollbar-thin">
            {isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : passes.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 shadow-2xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-slate-800 dark:text-slate-200">Queue is clear</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pass requests awaiting review under this filter.
                </p>
              </div>
            ) : (
              passes.map((pass) => {
                const isSelected = selectedPass?.id === pass.id;
                const hasMyRec = (pass.recommendations || []).find((r) => r.byId === user?.id);
                const passPhotoUrl =
                  pass.photoUrl ||
                  pass.studentPhoto ||
                  (pass.studentId
                    ? `/api/student/profile/photo?studentId=${encodeURIComponent(pass.studentId)}`
                    : undefined);

                return (
                  <div
                    key={pass.id}
                    onClick={() => {
                      setSelectedPassId(pass.id);
                      setMobileShowDetail(true);
                    }}
                    className={cn(
                      "p-3 sm:p-3.5 rounded-xl border transition cursor-pointer select-none relative flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-xs",
                      isSelected
                        ? isHod
                          ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-500 shadow-xs ring-1 ring-violet-500/30"
                          : "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 shadow-xs ring-1 ring-teal-500/30"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    {/* Selected Left Accent Strip */}
                    {isSelected && (
                      <div
                        className={cn(
                          "absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl",
                          isHod ? "bg-violet-600" : "bg-teal-600"
                        )}
                      />
                    )}

                    {/* TOP ROW: Student Photo, Name, Year, Room & Status Badge */}
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 pl-0.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <Avatar
                          src={passPhotoUrl}
                          name={pass.studentName}
                          size="md"
                          className="w-11 h-11 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {pass.studentName}
                          </h4>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Year {pass.year}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span>Room {pass.room || pass.roomNo || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        <StatusChip status={pass.status} size="sm" />
                      </div>
                    </div>

                    {/* MIDDLE ROW: Pass Type, Destination, Timings & Emergency badge */}
                    <div className="space-y-1 text-xs pl-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              (pass.type || "").toLowerCase().includes("home")
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                                : isHod
                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800"
                                : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
                            )}
                          >
                            {pass.type || "Local Pass"}
                          </span>
                          {pass.emergency && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800">
                              EMERGENCY
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formatDate(pass.departureTime || pass.fromTime || pass.appliedAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">To: {pass.destination}</span>
                      </div>
                    </div>

                    {/* PARENT / GUARDIAN CONTACT ROW */}
                    {(() => {
                      const cardParent = resolveParentContact(pass);
                      if (!cardParent.hasParentPhone) return null;
                      return (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800/60 ml-0.5">
                          <Phone className={cn("w-3 h-3 shrink-0", isHod ? "text-violet-600 dark:text-violet-400" : "text-teal-600 dark:text-teal-400")} />
                          <span className="font-medium text-[10px] text-slate-400">Parent:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                            {cardParent.parentPhone}
                          </span>
                        </div>
                      );
                    })()}

                    {/* BOTTOM ROW: Pass ID & Status indicators */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 pl-0.5">
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                        #{pass.passNumber || pass.id}
                      </span>
                      {hasMyRec ? (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded font-semibold text-[10px]",
                            hasMyRec.verdict === "recommend"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {hasMyRec.verdict === "recommend" ? "Recommended" : "Declined"}
                        </span>
                      ) : isSelected ? (
                        <span
                          className={cn(
                            "font-bold text-[10px]",
                            isHod ? "text-violet-600" : "text-teal-600"
                          )}
                        >
                          Selected
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Pass Detail Panel (7 Cols on desktop, toggleable on mobile) */}
        <div
          className={cn(
            "lg:col-span-7",
            mobileShowDetail ? "block" : "hidden lg:block"
          )}
        >
          {selectedPass ? (
            <Card className="p-4 sm:p-5 space-y-4 sm:space-y-5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {/* Mobile Back Button Bar */}
              <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-bold hover:underline py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                    isHod ? "text-violet-600 dark:text-violet-400" : "text-teal-600 dark:text-teal-400"
                  )}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Requests</span>
                </button>
                <span className="text-xs font-mono font-bold text-slate-500">
                  #{selectedPass.passNumber || selectedPass.id}
                </span>
              </div>

              {/* Top Header Card: Photo, Name, Reg No, Dept, Year, Room & Status */}
              <div className="flex items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <Avatar
                    src={
                      selectedPass.photoUrl ||
                      selectedPass.studentPhoto ||
                      (selectedPass.studentId
                        ? `/api/student/profile/photo?studentId=${encodeURIComponent(selectedPass.studentId)}`
                        : undefined)
                    }
                    name={selectedPass.studentName}
                    size="xl"
                    className="w-16 h-16 shrink-0 rounded-full ring-1 ring-slate-200/80 dark:ring-slate-700 shadow-2xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                        {selectedPass.studentName}
                      </h3>
                      <StatusChip status={selectedPass.status} />
                      {selectedPass.emergency && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800">
                          EMERGENCY REQUEST
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {selectedPass.regNo ? selectedPass.regNo : selectedPass.studentId}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {selectedPass.department || selectedPass.dept}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>Year {selectedPass.year}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>
                        Room {selectedPass.room || selectedPass.roomNo || "—"} ({selectedPass.floor || "Floor"})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Parent / Guardian Contact Section */}
              {(() => {
                const parentContact = resolveParentContact(selectedPass);
                return (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            isHod
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400"
                              : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400"
                          )}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Parent / Guardian Contact
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Official emergency and outpass contact on file
                          </p>
                        </div>
                      </div>

                      {parentContact.hasParentPhone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(parentContact.parentPhone);
                              toast.success(`Copied parent phone (${parentContact.parentPhone}) to clipboard`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition"
                            title="Copy phone number"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </button>
                          <a
                            href={`tel:${parentContact.parentPhone}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-white text-[11px] font-bold shadow-xs transition",
                              isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"
                            )}
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call Parent</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Parent/Guardian Name</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {parentContact.parentName || "Registered Parent"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Relationship</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {parentContact.parentRelation || "Parent / Guardian"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Parent Mobile Number</span>
                        {parentContact.hasParentPhone ? (
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            +91 {parentContact.parentPhone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Parent mobile number not available.
                          </span>
                        )}
                      </div>
                    </div>

                    {parentContact.studentPhone && (
                      <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>
                            Student Mobile:{" "}
                            <strong className="font-mono text-slate-700 dark:text-slate-300">
                              +91 {parentContact.studentPhone}
                            </strong>
                          </span>
                        </span>
                        <a
                          href={`tel:${parentContact.studentPhone}`}
                          className={cn(
                            "text-[10px] font-semibold hover:underline",
                            isHod ? "text-violet-600 dark:text-violet-400" : "text-teal-600 dark:text-teal-400"
                          )}
                        >
                          Call Student
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Outpass Schedule & Justification */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Outpass Schedule & Justification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outpass Type</span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {selectedPass.type}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Applied Date & Time</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {formatDateTime(selectedPass.appliedAt || selectedPass.createdAt, "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Expected Departure</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {formatDateTime(selectedPass.departureTime || selectedPass.fromTime, "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Expected Return</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {formatDateTime(selectedPass.expectedReturnTime || selectedPass.toTime, "dd MMM yyyy, hh:mm a")}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination</span>
                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedPass.destination}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Reason for Outpass</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 break-words whitespace-normal">
                      {selectedPass.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff Clearance / Status Banner for HOD Review */}
              {isHod && (selectedPass.type || "").toLowerCase().includes("home") && (
                selectedPass.staffApprovalStatus === "APPROVED" ||
                selectedPass.staff_approval_status === "APPROVED" ? (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Staff Recommendation Clearance</span>
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-200">
                      Recommended by: <strong>{selectedPass.staffApprovedBy || "Faculty Advisor"}</strong>
                      {selectedPass.staffApprovedAt && ` on ${formatDateTime(selectedPass.staffApprovedAt)}`}
                    </p>
                    {selectedPass.staffRemarks && (
                      <p className="text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                        &ldquo;{selectedPass.staffRemarks}&rdquo;
                      </p>
                    )}
                  </div>
                ) : selectedPass.staffApprovalStatus === "REJECTED" ||
                  selectedPass.staff_approval_status === "REJECTED" ? (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Faculty Advisor Did Not Recommend</span>
                    </div>
                    <p className="text-amber-700 dark:text-amber-200">
                      Reviewed by: <strong>{selectedPass.staffApprovedBy || "Faculty Advisor"}</strong>
                      {selectedPass.staffApprovedAt && ` on ${formatDateTime(selectedPass.staffApprovedAt)}`}
                    </p>
                    {selectedPass.staffRemarks && (
                      <p className="text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        &ldquo;{selectedPass.staffRemarks}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Faculty Advisor Review Pending</span>
                    </div>
                    <p className="text-blue-700 dark:text-blue-200">
                      This Home Outpass has not yet been reviewed by the assigned Year Faculty Advisor. Sequential workflow requires Staff recommendation prior to HOD forwarding.
                    </p>
                  </div>
                )
              )}

              {/* Academic Recommendations History */}
              <div className="space-y-2.5 text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Academic Recommendations History
                </h4>

                {(() => {
                  const recs = [...(selectedPass.recommendations || [])];
                  if (
                    (selectedPass.staffApprovedBy || selectedPass.staffRemarks) &&
                    !recs.some((r) => r.role === "staff")
                  ) {
                    recs.push({
                      role: "staff",
                      name: selectedPass.staffApprovedBy || "Faculty Advisor",
                      verdict:
                        selectedPass.staffApprovalStatus === "REJECTED" ? "do_not_recommend" : "recommend",
                      note: selectedPass.staffRemarks,
                      at: selectedPass.staffApprovedAt || selectedPass.updatedAt,
                    });
                  }
                  if (
                    (selectedPass.hodApprovedBy || selectedPass.hodRemarks) &&
                    !recs.some((r) => r.role === "hod")
                  ) {
                    recs.push({
                      role: "hod",
                      name: selectedPass.hodApprovedBy || "Head of Department (HOD)",
                      verdict:
                        selectedPass.hodApprovalStatus === "REJECTED" ? "do_not_recommend" : "recommend",
                      note: selectedPass.hodRemarks,
                      at: selectedPass.hodApprovedAt || selectedPass.updatedAt,
                    });
                  }

                  return recs.length > 0 ? (
                    <div className="space-y-2">
                      {recs.map((rec, idx) => {
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
                                &ldquo;{rec.note}&rdquo;
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
                  );
                })()}
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
              {(() => {
                const isHomePass = (selectedPass.type || "").toLowerCase().includes("home");
                const isStaffApproved =
                  selectedPass.staffApprovalStatus === "APPROVED" ||
                  selectedPass.staff_approval_status === "APPROVED";
                const isAlreadyDecided = ["approved", "rejected", "gate_pass_issued", "completed", "cancelled"].includes(
                  (selectedPass.status || "").toLowerCase()
                );
                const isHodApproved =
                  selectedPass.hodApprovalStatus === "APPROVED" ||
                  selectedPass.hod_approval_status === "APPROVED";
                const isHodRejected =
                  selectedPass.hodApprovalStatus === "REJECTED" ||
                  selectedPass.hod_approval_status === "REJECTED";
                const isStaffPending = isHod && isHomePass && !isStaffApproved;

                return (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-400 hidden sm:block">
                      Keyboard:{" "}
                      {isHod ? (
                        <>
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">F</kbd> Forward •{" "}
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">N</kbd> Decline
                        </>
                      ) : (
                        <>
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">R</kbd> Recommend •{" "}
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono border">N</kbd> Decline
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none text-xs border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        leftIcon={XCircle}
                        disabled={recommendMutation.isPending || isAlreadyDecided || isHodRejected}
                        onClick={() => {
                          setDeclineNote("");
                          setIsDeclineModalOpen(true);
                        }}
                      >
                        {isHodRejected
                          ? "Endorsement Declined"
                          : isHod
                          ? "Decline Endorsement (N)"
                          : "Do Not Recommend (N)"}
                      </Button>

                      <Button
                        className={cn(
                          "flex-1 sm:flex-none text-xs font-semibold text-white",
                          isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"
                        )}
                        leftIcon={CheckCircle2}
                        disabled={recommendMutation.isPending || isAlreadyDecided || isHodApproved || isStaffPending}
                        title={
                          isStaffPending
                            ? "Sequential workflow: Faculty Advisor recommendation required before HOD forwarding"
                            : undefined
                        }
                        onClick={() => {
                          if (isStaffPending) {
                            toast.warning("Faculty Advisor recommendation required before HOD forwarding.");
                            return;
                          }
                          setRecommendNote("Academic standing verified and cleared.");
                          setIsRecommendModalOpen(true);
                        }}
                      >
                        {isHodApproved
                          ? "Endorsed & Forwarded"
                          : isStaffPending
                          ? "Awaiting Staff (F)"
                          : isHod
                          ? "Forward to Chief Warden (F)"
                          : "Recommend Pass (R)"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card className="p-12 text-center text-slate-400 text-xs border border-slate-200/80 dark:border-slate-800">
              Select a pass request from the left queue to view details.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Recommend Pass */}
      <Modal
        isOpen={isRecommendModalOpen}
        onClose={() => setIsRecommendModalOpen(false)}
        title={isHod ? `Endorse & Forward to Warden for ${selectedPass?.studentName}` : `Recommend Outpass for ${selectedPass?.studentName}`}
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
              {isHod ? "Endorse & Forward" : "Confirm Recommendation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Do Not Recommend Pass (Requires Note) */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title={isHod ? `Decline Endorsement for ${selectedPass?.studentName}` : `Decline Recommendation for ${selectedPass?.studentName}`}
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
              <span className="text-slate-600 dark:text-slate-400">
                {isHod ? "Forward to Warden / Recommend" : "Open Recommend Dialog"}
              </span>
              <kbd className="px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 border">
                {isHod ? "F or R" : "R"}
              </kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">
                {isHod ? "Decline Endorsement Dialog" : "Open Do Not Recommend Dialog"}
              </span>
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
