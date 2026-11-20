"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Download,
  Calendar,
  Building,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { FileDropzone } from "@/components/ui/FileDropzone.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { useLetters, useSubmitLetter, useWithdrawLetter } from "@/hooks/queries/useLetters.js";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { LETTER_STATUSES, getLetterStatusConfig } from "@/config/status.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

export default function StudentLettersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { policy } = usePolicy();

  // If module is disabled, show clean message
  if (!policy?.studentLetters?.enabled) {
    return (
      <div className="p-12 text-center space-y-3">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
        <h2 className="text-lg font-bold text-text-dark dark:text-white">Special Letters Module Inactive</h2>
        <p className="text-xs text-text-muted dark:text-slate-400 max-w-md mx-auto">
          The institutional letters approval feature is currently deactivated in the hostel policy.
        </p>
      </div>
    );
  }

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Form state
  const [letterType, setLetterType] = useState("long_leave");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [linkedPassId, setLinkedPassId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const { data: lettersRes, isLoading } = useLetters();
  const studentLetters = (lettersRes?.data || []).filter(
    (l) => l.studentId === user?.studentId || l.studentId === user?.id
  );

  const { data: passes = [] } = usePasses();
  const studentPasses = passes.filter(
    (p) => p.studentId === user?.studentId || p.studentId === user?.id
  );

  const submitMutation = useSubmitLetter();
  const withdrawMutation = useWithdrawLetter();

  const handleFileSelect = (selectedFile) => {
    setFileError("");
    const maxBytes = policy.studentLetters.maxLetterBytes || 2097152; // 2 MB
    if (selectedFile.size > maxBytes) {
      setFileError(
        `File is too large (${(selectedFile.size / 1048576).toFixed(1)} MB). Maximum permitted size is 2 MB.`
      );
      setFile(null);
      return;
    }

    const cleanMime = selectedFile.type.toLowerCase();
    const ext = selectedFile.name.split(".").pop().toLowerCase();
    const isAllowed =
      cleanMime === "application/pdf" ||
      cleanMime === "image/jpeg" ||
      cleanMime === "image/png" ||
      ["pdf", "jpg", "jpeg", "png"].includes(ext);

    if (!isAllowed) {
      setFileError("Invalid file type. Only PDF documents and JPG/PNG images are accepted.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || subject.length < 5 || subject.length > 80) {
      toast.error("Subject must be between 5 and 80 characters.");
      return;
    }
    if (!details.trim() || details.length < 10 || details.length > 500) {
      toast.error("Details must be between 10 and 500 characters.");
      return;
    }
    if (!file) {
      toast.error("Please upload a required verification document (PDF, JPG, or PNG).");
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        await submitMutation.mutateAsync({
          type: letterType,
          subject: subject.trim(),
          details: details.trim(),
          linkedPassId: linkedPassId || null,
          from: fromDate || new Date().toISOString(),
          to: toDate || new Date().toISOString(),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/pdf",
          fileDataUrl: dataUrl,
          studentId: user?.studentId || user?.id,
          studentName: user?.name,
          department: user?.department,
          year: user?.year,
          floor: user?.floor,
          roomNo: user?.roomNo || user?.room,
        });

        setIsSubmitModalOpen(false);
        setSubject("");
        setDetails("");
        setFile(null);
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  const handleWithdraw = async () => {
    if (!selectedLetter) return;
    await withdrawMutation.mutateAsync(selectedLetter.id);
    setIsWithdrawOpen(false);
    setSelectedLetter(null);
  };

  const typeOptions = (policy.studentLetters.letterTypes || []).map((t) => ({
    value: t.id,
    label: t.label,
  }));

  const passOptions = [
    { value: "", label: "None (Standalone Permission Letter)" },
    ...studentPasses.map((p) => ({
      value: p.id,
      label: `${p.passNumber || p.id} - ${p.type} (${formatDate(p.departureTime)})`,
    })),
  ];

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
            Special Permission Letters
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            Submit formal letters for extended leave (&gt; 7 days), medical treatment, and external competitions
          </p>
        </div>

        <Button
          leftIcon={PlusCircle}
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-primary text-white"
        >
          Submit New Letter
        </Button>
      </div>

      {/* Letters List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : studentLetters.length === 0 ? (
        <Card className="p-12 text-center space-y-3 text-xs">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-sm text-text-dark dark:text-white">No Special Letters Submitted</h3>
          <p className="text-text-muted dark:text-slate-400 max-w-sm mx-auto">
            You have not submitted any special permission letters. If you are taking extended home leave exceeding 7 days, submit a letter for Principal / Correspondent clearance.
          </p>
          <Button
            size="sm"
            variant="outline"
            leftIcon={PlusCircle}
            onClick={() => setIsSubmitModalOpen(true)}
          >
            Create Letter
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {studentLetters.map((l) => {
            const statusCfg = getLetterStatusConfig(l.status);
            const isApproved = l.status === LETTER_STATUSES.APPROVED;
            const isSubmitted = l.status === LETTER_STATUSES.SUBMITTED;

            return (
              <Card key={l.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">{l.id}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", statusCfg.bgClass, statusCfg.textClass)}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-text-dark dark:text-white mt-1">
                      {l.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    {isApproved && (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => router.push(`/student/apply?letterId=${l.id}`)}
                      >
                        Apply Pass with this Letter
                      </Button>
                    )}
                    {isSubmitted && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setSelectedLetter(l);
                          setIsWithdrawOpen(true);
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {l.details}
                </p>

                {/* Timeline and Dates */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>Type: <strong className="text-slate-700 dark:text-slate-300">{l.typeLabel}</strong></span>
                  <span>Document: <strong className="text-slate-700 dark:text-slate-300">{l.fileName}</strong></span>
                  <span>Submitted on: {formatDateTime(l.createdAt)}</span>
                </div>

                {/* Decisions Log */}
                {(l.decisions || []).length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block">
                      Executive Feedback
                    </span>
                    {l.decisions.map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-text-dark dark:text-white">
                          {d.byName} ({d.byRole}): {d.note || "Cleared"}
                        </span>
                        <span className="text-slate-400 font-mono">{formatDateTime(d.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Special Permission Letter"
        description="Formal request dispatched to College Principal and Correspondent."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Select
            label="Letter Category"
            value={letterType}
            onChange={(e) => setLetterType(e.target.value)}
            options={typeOptions}
          />

          <Input
            label="Subject (5–80 characters)"
            placeholder="e.g. Leave for Orthopedic Rehabilitation Post Surgery"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={80}
          />

          <Textarea
            label="Detailed Reason & Explanation (10–500 characters)"
            placeholder="State the purpose, dates, and medical or academic reasons..."
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Leave From"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              label="Leave Until"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <Select
            label="Link to an Outpass Request (Optional)"
            value={linkedPassId}
            onChange={(e) => setLinkedPassId(e.target.value)}
            options={passOptions}
          />

          {/* File Upload */}
          <div className="space-y-1">
            <FileDropzone
              onFileSelect={handleFileSelect}
              label="Attach Verification Document (PDF, JPG, PNG ≤ 2 MB)"
              accept=".pdf,image/jpeg,image/png"
            />
            {fileError && (
              <p className="text-[11px] text-red-500 font-medium">{fileError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={submitMutation.isPending || Boolean(fileError)}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Withdraw */}
      <ConfirmDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={handleWithdraw}
        title="Withdraw Letter Application"
        description="Are you sure you want to withdraw this letter? This action cannot be undone."
        confirmText="Withdraw Letter"
        variant="danger"
      />
    </div>
  );
}
