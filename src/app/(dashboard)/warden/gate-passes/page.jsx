"use client";

import React, { useState, useCallback } from "react";
import {
  Search,
  Check,
  Clock,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  RefreshCw,
  QrCode,
  ChevronDown,
  ChevronUp,
  History,
  ShieldCheck,
  User,
  MapPin,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Helper to extract 1-2 letter initials from a student's full name
 */
function getInitials(name = "") {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Circular 44px student avatar with automatic fallback to initials
 */
function StudentAvatar({ name, photoUrl }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);

  return (
    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center select-none shadow-2xs">
      {!imgError && photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name || "Student"}
          className="w-full h-full object-cover object-center"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 uppercase">
          {initials}
        </div>
      )}
    </div>
  );
}

export default function WardenGatePassesPage() {
  const { data: passes = [], isLoading, isFetching, refetch } = usePasses();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'approved' | 'outside' | 'overdue' | 'returned'
  const [selectedDept, setSelectedDept] = useState("all");

  // State to track which cards are expanded (View / Hide)
  const [expandedCards, setExpandedCards] = useState({});

  // State for expandable movement security audit history per pass
  const [expandedHistory, setExpandedHistory] = useState({});
  const [historyLogs, setHistoryLogs] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});

  // Toggle View / Hide for an individual card
  const toggleCard = useCallback((passId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [passId]: !prev[passId],
    }));
  }, []);

  // Toggle and load real security logs for a specific pass from MySQL
  const toggleHistory = useCallback(
    async (passId) => {
      const isCurrentlyExpanded = Boolean(expandedHistory[passId]);

      if (isCurrentlyExpanded) {
        setExpandedHistory((prev) => ({ ...prev, [passId]: false }));
        return;
      }

      setExpandedHistory((prev) => ({ ...prev, [passId]: true }));

      if (!historyLogs[passId]) {
        setLoadingHistory((prev) => ({ ...prev, [passId]: true }));
        try {
          const res = await fetch(`/api/gate/history?passId=${encodeURIComponent(passId)}`);
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            setHistoryLogs((prev) => ({ ...prev, [passId]: json.data }));
          } else {
            setHistoryLogs((prev) => ({ ...prev, [passId]: [] }));
          }
        } catch (err) {
          console.error("Failed to load gate history for pass:", passId, err);
          setHistoryLogs((prev) => ({ ...prev, [passId]: [] }));
        } finally {
          setLoadingHistory((prev) => ({ ...prev, [passId]: false }));
        }
      }
    },
    [expandedHistory, historyLogs]
  );

  // Map each pass to its authentic movement classification backed by MySQL fields
  const movementPasses = passes.map((p) => {
    const rawSt = (p.status || "").toLowerCase();
    const hasExit = Boolean(p.actualExitTime || p.actual_exit_time);
    const hasReturn = Boolean(p.actualReturnTime || p.actual_return_time || p.actualEntryTime || p.actual_entry_time);
    const expTime = p.expectedReturnTime ? new Date(p.expectedReturnTime).getTime() : 0;
    const isOut = rawSt === "out" || (hasExit && !hasReturn && rawSt !== "returned");
    const isOverdue = (isOut || rawSt === "overdue") && expTime > 0 && expTime < Date.now();

    let movementStatus = "OTHER";
    let statusLabel = p.status;
    let badgeClass = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800";
    let borderAccent = "border-l-4 border-l-slate-300 dark:border-l-slate-700";

    if (rawSt === "returned" || hasReturn) {
      movementStatus = "RETURNED";
      statusLabel = p.isLate ? `Returned (${p.lateMinutes || 0}m Late)` : "Returned";
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      borderAccent = "border-l-4 border-l-blue-500";
    } else if (isOverdue || rawSt === "overdue") {
      movementStatus = "OVERDUE";
      statusLabel = "Overdue";
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse font-extrabold";
      borderAccent = "border-l-4 border-l-rose-500";
    } else if (isOut) {
      movementStatus = "OUTSIDE";
      statusLabel = "Outside Campus";
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-bold";
      borderAccent = "border-l-4 border-l-amber-500";
    } else if (rawSt === "approved" || rawSt === "gate_pass_issued") {
      movementStatus = "APPROVED";
      statusLabel = "Approved – Not Yet Exited";
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold";
      borderAccent = "border-l-4 border-l-emerald-500";
    }

    return {
      ...p,
      movementStatus,
      statusLabel,
      badgeClass,
      borderAccent,
      hasExit,
      hasReturn,
      isOverdue,
      gateCheckpointName: p.gateCheckpoint || (p.gateId === "MAIN" ? "Main Campus Gate" : p.gateId) || "Main Campus Gate",
    };
  });

  // Filter out pending/rejected passes to focus exclusively on active gate movements
  const activeDirectory = movementPasses.filter((p) =>
    ["APPROVED", "OUTSIDE", "OVERDUE", "RETURNED"].includes(p.movementStatus)
  );

  const filtered = activeDirectory.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      (p.studentName || "").toLowerCase().includes(term) ||
      (p.studentId || "").toLowerCase().includes(term) ||
      (p.regNo || "").toLowerCase().includes(term) ||
      (p.passNumber || "").toLowerCase().includes(term) ||
      (p.destination || "").toLowerCase().includes(term) ||
      (p.reason || "").toLowerCase().includes(term);

    const matchFilter =
      statusFilter === "all" ||
      (statusFilter === "approved" && p.movementStatus === "APPROVED") ||
      (statusFilter === "outside" && p.movementStatus === "OUTSIDE") ||
      (statusFilter === "overdue" && p.movementStatus === "OVERDUE") ||
      (statusFilter === "returned" && p.movementStatus === "RETURNED");

    const passDept = (p.department || p.dept || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const filterDept = selectedDept.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const matchDept = selectedDept === "all" || passDept === filterDept;

    return matchSearch && matchFilter && matchDept;
  });

  // Dynamic counts derived directly from actual database-loaded directory
  const counts = {
    all: activeDirectory.length,
    approved: activeDirectory.filter((p) => p.movementStatus === "APPROVED").length,
    outside: activeDirectory.filter((p) => p.movementStatus === "OUTSIDE").length,
    overdue: activeDirectory.filter((p) => p.movementStatus === "OVERDUE").length,
    returned: activeDirectory.filter((p) => p.movementStatus === "RETURNED").length,
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header: Responsive left-aligned title & subtitle, right-aligned action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-0.5">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#111936] dark:text-white tracking-tight break-words">
            Gate Movement &amp; Surveillance Directory
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 max-w-2xl leading-relaxed">
            Real-time gate checkout, active campus departures, and return monitoring backed by MySQL
          </p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetch();
              setHistoryLogs({});
            }}
            className={`w-full sm:w-auto justify-center cursor-pointer text-xs h-9 ${
              isLoading || isFetching ? "opacity-75" : ""
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isFetching ? "animate-spin" : ""}`} />
            <span>Refresh Live Data</span>
          </Button>
        </div>
      </div>

      {/* Controls & Filter Section */}
      <div className="space-y-3">
        {/* Row 1: Search & Department Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="w-full sm:w-72 flex-shrink-0">
            <Input
              placeholder="Search student, reg no, or pass ID..."
              leftIcon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs h-9"
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by Department"
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer h-9"
            >
              <option value="all">All Departments</option>
              {WORKFLOW_CONFIG.departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Movement Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { id: "all", label: "All Movements", count: counts.all },
            { id: "approved", label: "Approved (Not Exited)", count: counts.approved },
            { id: "outside", label: "Outside Campus", count: counts.outside },
            { id: "overdue", label: "Overdue", count: counts.overdue, alert: counts.overdue > 0 },
            { id: "returned", label: "Returned", count: counts.returned },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  tab.alert
                    ? "bg-rose-500 text-white"
                    : statusFilter === tab.id
                    ? "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Compact Responsive Student Movement Cards */}
      {isLoading ? (
        <Card className="text-center py-12 text-xs text-slate-400 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary-blue" />
            <span>Loading gate records from MySQL...</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12 p-4 border border-slate-200/80 dark:border-slate-800">
          <QrCode className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">No Matching Gate Records</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Approved passes and active student gate movements will appear here automatically when recorded in MySQL.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
          {filtered.map((pass) => {
            const isCardExpanded = Boolean(expandedCards[pass.id]);
            const isHistoryOpen = Boolean(expandedHistory[pass.id]);
            const logs = historyLogs[pass.id] || [];
            const isLogsLoading = Boolean(loadingHistory[pass.id]);

            return (
              <div
                key={pass.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 ${pass.borderAccent} shadow-2xs hover:shadow-xs transition-all p-3.5 sm:p-4 text-xs`}
              >
                {/* 1. COLLAPSED CARD HEADER (Student Identity + Status + View Control) */}
                <div className="flex items-start gap-3 sm:gap-3.5">
                  {/* LEFT: Actual Student Profile Image (44px × 44px circular avatar) */}
                  <StudentAvatar
                    name={pass.studentName}
                    photoUrl={pass.photoUrl || pass.studentPhoto}
                  />

                  {/* CENTER: Student Name & Student Identity */}
                  <div className="min-w-0 flex-1">
                    {/* Top Row: Student Name on left, Movement Status Badge on right */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">
                        {pass.studentName || "Student"}
                      </h3>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${pass.badgeClass}`}
                      >
                        {pass.movementStatus === "OVERDUE" && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                        {pass.movementStatus === "OUTSIDE" && <LogOut className="w-3 h-3 text-amber-500 shrink-0" />}
                        {pass.movementStatus === "RETURNED" && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
                        {pass.movementStatus === "APPROVED" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                        <span className="whitespace-nowrap uppercase tracking-wider">{pass.statusLabel}</span>
                      </span>
                    </div>

                    {/* Student Identity Line: CSE-4-001 · 210523104089 · CSE · Room 305 (3rd Floor) */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-normal">
                      <span className="font-mono font-semibold text-primary-blue dark:text-blue-400">
                        {pass.studentId || "—"}
                      </span>
                      {pass.regNo && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">{pass.regNo}</span>
                        </>
                      )}
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        {pass.department || pass.dept || "—"}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>
                        Room {pass.roomNumber || pass.roomNo || pass.room || "—"}
                        {pass.floor ? ` (${pass.floor.includes("Floor") ? pass.floor : `${pass.floor} Floor`})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: View / Hide Button Control */}
                  <div className="shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleCard(pass.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95"
                      aria-expanded={isCardExpanded}
                      title={isCardExpanded ? "Hide Pass Details" : "View Pass Details"}
                    >
                      <span>{isCardExpanded ? "Hide" : "View"}</span>
                      {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 2. EXPANDED DETAILS (Revealed ONLY when clicking View) */}
                {isCardExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                    {/* SECTION A: PASS INFORMATION */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pass Information
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            (pass.type || "").toLowerCase().includes("home")
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                              : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
                          }`}
                        >
                          {pass.type || pass.outpass_type || "Local Pass"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Pass ID</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {pass.passNumber || pass.id}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Pass Type</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pass.type || pass.outpass_type || "Local Pass"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block text-[10px]">Destination</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pass.destination || "—"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block text-[10px]">Reason for Outing</span>
                          <span className="text-slate-600 dark:text-slate-300 italic">
                            {pass.reason || "General outpass"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION B: MOVEMENT INFORMATION */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Movement Information
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        {/* Expected Departure */}
                        <div>
                          <span className="text-slate-400 block text-[10px]">Expected Departure</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatDateTime(pass.departureTime || pass.fromTime)}
                          </span>
                        </div>

                        {/* Expected Return */}
                        <div>
                          <span className="text-slate-400 block text-[10px]">Expected Return</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatDateTime(pass.expectedReturnTime || pass.toTime)}
                          </span>
                        </div>

                        {/* Actual Exit */}
                        <div>
                          <span className="text-slate-400 block text-[10px]">Actual Exit</span>
                          <span className="font-mono font-bold">
                            {pass.actualExitTime ? (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {formatDateTime(pass.actualExitTime)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Not Exited</span>
                            )}
                          </span>
                        </div>

                        {/* Actual Return */}
                        <div>
                          <span className="text-slate-400 block text-[10px]">Actual Return</span>
                          <span className="font-mono font-bold">
                            {pass.actualReturnTime ? (
                              <span className={pass.isLate ? "text-amber-600 dark:text-amber-400" : "text-blue-700 dark:text-blue-400"}>
                                {formatDateTime(pass.actualReturnTime)}
                                {pass.isLate ? ` (+${pass.lateMinutes || 0}m Late)` : ""}
                              </span>
                            ) : pass.movementStatus === "OUTSIDE" || pass.movementStatus === "OVERDUE" ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">Not Returned</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Not Returned</span>
                            )}
                          </span>
                        </div>

                        {/* Checkpoint */}
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block text-[10px]">Checkpoint</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pass.gateCheckpointName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION C: INSPECT GATE LOGS AUDIT */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleHistory(pass.id)}
                        className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer py-1 px-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-primary-blue dark:text-blue-400" />
                          <span>Inspect Gate Logs</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-bold">
                          {isHistoryOpen ? (
                            <>
                              <span>Close Logs</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>View Logs</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </span>
                      </button>

                      {/* Expanded History Body */}
                      {isHistoryOpen && (
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
                          {isLogsLoading ? (
                            <div className="py-2.5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin text-primary-blue" />
                              <span>Loading scan logs...</span>
                            </div>
                          ) : logs.length === 0 ? (
                            <div className="py-2.5 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center text-[10px] text-slate-500 dark:text-slate-400">
                              No scan logs recorded yet. Awaiting student checkpoint scan.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {logs.map((log) => {
                                const isExit = log.action === "EXIT";
                                return (
                                  <div
                                    key={log.id}
                                    className="p-2 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 ${
                                          isExit
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                                        }`}
                                      >
                                        {log.action}
                                      </span>
                                      <span className="truncate text-slate-700 dark:text-slate-300">
                                        {log.gate_id === "MAIN" ? "Main Campus Gate" : log.gate_id}
                                      </span>
                                    </div>
                                    <div className="font-mono text-slate-500 shrink-0">
                                      {formatDateTime(log.timestamp, "dd MMM, hh:mm a")}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
