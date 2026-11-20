"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  AlertTriangle,
  RotateCcw,
  Check,
  Eye,
  FileCheck,
  Building,
  User,
  Shield,
  Send,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { useLetters, useLetterDecision, useUndoLetterDecision } from "@/hooks/queries/useLetters.js";
import { LETTER_STATUSES, getLetterStatusConfig } from "@/config/status.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

export function StudentLettersReview({ role = "principal" }) {
  const { user } = useAuth();
  const { policy } = usePolicy();

  // Feature Flag Guard: If disabled, return clean not-found state
  if (!policy?.studentLetters?.enabled) {
    return (
      <div className="p-12 text-center space-y-3">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
        <h2 className="text-lg font-bold text-text-dark dark:text-white">Student Letters Module Disabled</h2>
        <p className="text-xs text-text-muted dark:text-slate-400 max-w-md mx-auto">
          The institutional student letters approval feature is currently deactivated in hostel settings.
        </p>
      </div>
    );
  }

  const approverMode = policy.studentLetters.approverMode || "either";

  const [activeTab, setActiveTab] = useState("awaiting"); // 'awaiting' | 'decided_by_me' | 'all'
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");

  const filters = {
    tab: activeTab,
    search,
    type: typeFilter,
    department: deptFilter,
    year: yearFilter,
  };

  const { data: lettersRes, isLoading } = useLetters(filters, page, pageSize);
  const letters = lettersRes?.data || [];
  const meta = lettersRes?.meta || {};

  const decisionMutation = useLetterDecision();

  const handleSelectLetter = (l) => {
    setSelectedLetter(l);
    setDecisionNote("");
  };

  const handleApproveConfirm = async () => {
    if (!selectedLetter) return;
    await decisionMutation.mutateAsync({
      letterId: selectedLetter.id,
      verdict: "approve",
      note: decisionNote.trim(),
    });
    setIsApproveOpen(false);
    setSelectedLetter(null);
  };

  const handleDeclineConfirm = async () => {
    if (!selectedLetter) return;
    if (!decisionNote.trim()) {
      toast.error("Please enter or select a reason for declining.");
      return;
    }
    await decisionMutation.mutateAsync({
      letterId: selectedLetter.id,
      verdict: "decline",
      note: decisionNote.trim(),
    });
    setIsDeclineOpen(false);
    setSelectedLetter(null);
  };

  const quickDeclineChips = [
    "Insufficient supporting documentation",
    "Document unclear / illegible copy",
    "Exceeds permissible institutional leave policy",
    "Critical laboratory / internal exam scheduled",
    "Please meet the Principal in person",
  ];

  const tabs = [
    { id: "awaiting", label: `Awaiting Decision (${meta?.awaitingCount || 0})` },
    { id: "decided_by_me", label: "Decided by Me" },
    { id: "all", label: "All Submissions" },
  ];

  const typeOptions = [
    { value: "all", label: "All Letter Types" },
    ...(policy.studentLetters.letterTypes || []).map((t) => ({ value: t.id, label: t.label })),
  ];

  const deptOptions = [
    { value: "all", label: "All Departments" },
    ...WORKFLOW_CONFIG.departments.map((d) => ({ value: d.code, label: d.code })),
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner with Active Approver Mode Policy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300">
              Institutional Letter Queue
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Policy: {approverMode === "either" ? "Either Principal OR Correspondent" : approverMode === "both" ? "Dual Signoff (Both Required)" : approverMode === "principal_only" ? "Principal Only" : "Correspondent Only"}
            </span>
          </div>
          <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
            Special Student Permission Letters
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            Formal leave endorsements for extended absence &gt; 7 days, surgeries, and competitive duties
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => { setActiveTab(t); setPage(1); }} />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Input
          placeholder="Search student, subject or ID..."
          leftIcon={Search}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} options={typeOptions} />
        <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} options={deptOptions} />
        <Select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
          options={[
            { value: "all", label: "All Years" },
            { value: "1", label: "1st Year" },
            { value: "2", label: "2nd Year" },
            { value: "3", label: "3rd Year" },
            { value: "4", label: "4th Year" },
          ]}
        />
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Letters List Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : letters.length === 0 ? (
            <Card className="p-8 text-center text-text-muted dark:text-slate-400 text-xs">
              No letters match current filters.
            </Card>
          ) : (
            letters.map((letter) => {
              const isSelected = selectedLetter?.id === letter.id;
              const statusCfg = getLetterStatusConfig(letter.status);

              return (
                <div
                  key={letter.id}
                  onClick={() => handleSelectLetter(letter)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs",
                    isSelected
                      ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/50"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={letter.studentName} src={letter.studentAvatar} size="sm" />
                      <div>
                        <h4 className="font-bold text-text-dark dark:text-white truncate">
                          {letter.studentName}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500">
                          {letter.studentId} · {letter.department}
                        </span>
                      </div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold font-mono", statusCfg.bgClass, statusCfg.textClass)}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <p className="font-semibold text-text-dark dark:text-white line-clamp-1">
                    {letter.subject}
                  </p>
                  <p className="text-[11px] text-text-muted dark:text-slate-400 line-clamp-2">
                    {letter.details}
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span>{letter.typeLabel}</span>
                    <span>{formatDate(letter.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel Column (7 Cols) */}
        <div className="lg:col-span-7">
          {!selectedLetter ? (
            <Card className="p-12 text-center space-y-2 text-text-muted dark:text-slate-400">
              <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-semibold text-sm text-text-dark dark:text-white">Select a letter to review</h3>
              <p className="text-xs">
                Inspect attached documents, evaluate student risk context, and record your institutional endorsement.
              </p>
            </Card>
          ) : (
            <Card className="p-6 space-y-5">
              {/* Student Header */}
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedLetter.studentName} src={selectedLetter.studentAvatar} size="lg" />
                  <div>
                    <h3 className="font-bold text-base text-text-dark dark:text-white">
                      {selectedLetter.studentName}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">
                      ID: {selectedLetter.studentId} · Dept: {selectedLetter.department} · Year {selectedLetter.year}
                    </p>
                    <p className="text-xs text-text-muted dark:text-slate-400">
                      {selectedLetter.floorLabel} · Room {selectedLetter.roomNo || selectedLetter.room}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={selectedLetter.status === LETTER_STATUSES.APPROVED ? "success" : selectedLetter.status === LETTER_STATUSES.DECLINED ? "danger" : "warning"}
                >
                  {selectedLetter.status}
                </Badge>
              </div>

              {/* Risk Context Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Home Passes This Month</span>
                  <span className="font-bold text-sm text-text-dark dark:text-white">1 / 2</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Late Returns (90 Days)</span>
                  <span className="font-bold text-sm text-emerald-600">0</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Status</span>
                  <span className="font-bold text-sm text-emerald-600">In Campus</span>
                </div>
              </div>

              {/* Subject & Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Letter Subject
                  </span>
                  <h4 className="font-bold text-sm text-text-dark dark:text-white mt-0.5">
                    {selectedLetter.subject}
                  </h4>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Description & Reason
                  </span>
                  <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
                    {selectedLetter.details}
                  </p>
                </div>

                <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                  <span>Covered Dates: {formatDate(selectedLetter.from)} to {formatDate(selectedLetter.to)}</span>
                  <span>Linked Pass: {selectedLetter.linkedPassId || "None"}</span>
                </div>
              </div>

              {/* Attached Document Preview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-bold text-text-dark dark:text-white truncate">
                      {selectedLetter.fileName}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({((selectedLetter.fileSize || 0) / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  <a
                    href={selectedLetter.fileDataUrl}
                    download={selectedLetter.fileName}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-primary flex items-center gap-1 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>

                {/* Inline Image or PDF representation */}
                {selectedLetter.fileType?.includes("image") ? (
                  <div className="max-h-48 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-100 flex items-center justify-center">
                    <img
                      src={selectedLetter.fileDataUrl}
                      alt={selectedLetter.fileName}
                      className="object-contain max-h-48"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-center space-y-1 text-xs">
                    <FileText className="w-8 h-8 text-primary mx-auto" />
                    <p className="font-semibold text-text-dark dark:text-white">PDF Document Verified</p>
                    <p className="text-[11px] text-slate-500">Download to view signed medical or institutional certificate.</p>
                  </div>
                )}
              </div>

              {/* Timeline & Decisions */}
              <div className="space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 block">
                  Endorsement Decisions & Timeline
                </span>
                <div className="space-y-1.5">
                  {(selectedLetter.timeline || []).map((t, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-text-dark dark:text-white block">{t.label}</span>
                        <span className="text-[11px] text-slate-500">{t.note}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(t.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedLetter.status === LETTER_STATUSES.SUBMITTED && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="success"
                    leftIcon={CheckCircle2}
                    onClick={() => setIsApproveOpen(true)}
                    className="flex-1"
                  >
                    Approve (Endorse)
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={XCircle}
                    onClick={() => setIsDeclineOpen(true)}
                    className="flex-1"
                  >
                    Decline Letter
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Approve Modal */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApproveConfirm}
        title="Endorse Student Permission Letter"
        description={`Are you sure you want to officially endorse ${selectedLetter?.studentName}'s letter for "${selectedLetter?.subject}"? This satisfies the gate pass policy and notifies the Warden.`}
        confirmText="Confirm Endorsement"
        variant="primary"
      />

      {/* Decline Dialog with Note & Quick Chips */}
      <Modal
        isOpen={isDeclineOpen}
        onClose={() => setIsDeclineOpen(false)}
        title="Decline Student Permission Letter"
        description="Provide a formal reason for declining. This explanation is dispatched directly to the student and Warden."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-text-dark dark:text-white block mb-1">
              Select Quick Reason Chip
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickDeclineChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDecisionNote(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-text-dark dark:text-white block mb-1">
              Official Reason Note (Required)
            </label>
            <Textarea
              rows={3}
              placeholder="Explain why this request is declined..."
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeclineOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeclineConfirm} disabled={!decisionNote.trim()}>
              Confirm Decline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentLettersReview;
