"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Share2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  RotateCcw,
  QrCode,
  Sparkles,
  Info,
  CheckCheck,
} from "lucide-react";
import { usePass, useCancelPass } from "@/hooks/queries/usePasses.js";
import { PASS_STATUSES } from "@/config/status.js";
import { getMovementStatus, MOVEMENT_STATES } from "@/lib/utils/movementStatus.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";

export default function StudentPassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const passId = params.id;

  const { data: pass, isLoading, isError, refetch } = usePass(passId);
  const cancelMutation = useCancelPass();

  const [showCancelModal, setShowCancelModal] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="w-48 h-6 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !pass) {
    return (
      <div className="py-12 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Outpass Record Not Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested pass ID ({passId}) does not exist or has been archived.
        </p>
        <Link href="/student/passes">
          <Button variant="outline" size="sm" className="text-xs">
            &larr; Back to My Passes
          </Button>
        </Link>
      </div>
    );
  }

  const movementStatus = pass.movementStatus || getMovementStatus(pass);
  const isGateEligible =
    movementStatus === MOVEMENT_STATES.NOT_EXITED ||
    movementStatus === MOVEMENT_STATES.OUTSIDE_CAMPUS;
  const isReturned = movementStatus === MOVEMENT_STATES.RETURNED;

  const isApprovedWaiting =
    movementStatus === MOVEMENT_STATES.NOT_EXITED &&
    (pass.status === PASS_STATUSES.APPROVED || pass.overallStatus === "WARDEN_APPROVED");
  const isRejected =
    movementStatus === MOVEMENT_STATES.REJECTED ||
    pass.status === PASS_STATUSES.REJECTED ||
    pass.overallStatus === "STAFF_REJECTED" ||
    pass.overallStatus === "WARDEN_REJECTED";
  const canCancel = [PASS_STATUSES.PENDING, PASS_STATUSES.RECOMMENDED, PASS_STATUSES.APPLIED].includes(pass.status);

  // Share Pass Summary
  const handleShare = async () => {
    const summary = `DMI Hostel Outpass: ${pass.passNumber || pass.id} (${pass.type})\nDestination: ${pass.destination}\nValid: ${formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")} to ${formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}\nStatus: ${pass.status.toUpperCase()}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DMI Outpass ${pass.passNumber || pass.id}`,
          text: summary,
        });
      } catch (err) {
        // user dismissed
      }
    } else {
      navigator.clipboard.writeText(summary);
      toast.success("Pass details copied to clipboard!");
    }
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        passId: pass.id,
        reason: "Cancelled by student on details page",
      });
      setShowCancelModal(false);
      toast.success("Pass has been cancelled.");
      refetch?.();
    } catch (e) {
      toast.error("Failed to cancel pass.");
    }
  };

  // Apply Again Prefill
  const handleApplyAgain = () => {
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
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/student/passes"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
              {pass.passNumber || pass.id}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-slate-500">{pass.type}</span>
              <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500">
                {formatDateTime(pass.appliedAt, "dd MMM yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share pass summary"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <StatusChip
            status={
              (pass.type || "").toLowerCase().includes("home") && (pass.status || "").toLowerCase() === "pending"
                ? "pending_staff"
                : pass.status
            }
          />
        </div>
      </div>

      {/* 2-Column Responsive Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols on lg): Specifications, Timeline, Actions */}
        <div className="space-y-4 lg:col-span-7">
          {/* REJECTED CALLOUT */}
          {isRejected && (
            <Card className="p-4 border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 space-y-2">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Outpass Rejected by {pass.overallStatus === "STAFF_REJECTED" ? "Staff / Class In-charge" : "Chief Warden"}
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-200 pl-6 leading-relaxed">
                {pass.wardenReason || pass.staffReason || pass.remarks || pass.reason || "Disciplinary curfew restriction during examination schedule."}
              </p>
              <div className="pt-2 pl-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyAgain}
                  leftIcon={RotateCcw}
                  className="text-xs font-bold border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40"
                >
                  Apply Again with Updated Reason
                </Button>
              </div>
            </Card>
          )}

          {/* KEY DETAILS CARD */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outpass Specifications
            </h3>

            <div className="space-y-2.5 text-xs">
              {pass.department && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {pass.department}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Destination:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {pass.destination}
                </span>
              </div>

              <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-0.5">Reason:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {pass.reason}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[11px]">Departure:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Expected Return:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
                  </span>
                </div>
              </div>

              {pass.actualExitTime && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Actual Gate Exit:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatDateTime(pass.actualExitTime, "dd MMM, hh:mm a")}
                  </span>
                </div>
              )}

              {pass.actualEntryTime && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Actual Gate Return:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatDateTime(pass.actualEntryTime, "dd MMM, hh:mm a")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Guardian Contact:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  +91 {pass.guardianPhone}
                </span>
              </div>

              {pass.emergency && (
                <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-bold pt-1">
                  <span>Priority:</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[10px]">
                    EMERGENCY PASS
                  </span>
                </div>
              )}

              {pass.attachmentName && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Attachment:</span>
                  <span className="flex items-center gap-1 text-primary font-semibold text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    {pass.attachmentName}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* STATUS AUDIT TIMELINE */}
          <Card className="p-4 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Authorization & Movement Timeline
            </h3>

            <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {(pass.timeline || []).map((event, idx) => (
                <div key={idx} className="relative space-y-0.5">
                  {/* Dot */}
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white capitalize">
                      {event.title || event.label || event.status?.replace("_", " ")}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(event.timestamp, "dd MMM, hh:mm a")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {event.description || event.actor || "Hostel Administration"}
                  </p>
                  {event.actor && event.description && (
                    <span className="text-[10px] text-slate-400 block">
                      Logged by: {event.actor}
                    </span>
                  )}
                  {event.note && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                      "{event.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* CANCEL PASS ACTION (FOR PENDING / RECOMMENDED) */}
          {canCancel && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowCancelModal(true)}
                leftIcon={XCircle}
                className="w-full text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Cancel Application
              </Button>
            </div>
          )}
        </div>

        {/* Right Column (5 cols on lg): Gate Pass Card & Actions (order-first on mobile for quick gate access) */}
        <div className="space-y-4 lg:col-span-5 order-first lg:order-last">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* GATE PASS CARD (GLASS) */}
            {isGateEligible ? (
              <Card className="p-5 space-y-4 border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-b from-white via-indigo-50/30 to-blue-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary dark:text-indigo-400">
                      Official Digital Gate Pass
                    </span>
                    <h3 className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                      {pass.passNumber || pass.id}
                    </h3>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Gate Verified</span>
                  </div>
                </div>

                {/* Student & Validity Details */}
                <div className="p-3.5 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500">Student Resident</span>
                    <span className="font-bold text-slate-900 dark:text-white">{pass.studentName || "Student"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500">Student ID / Room</span>
                    <span className="font-mono font-semibold text-primary dark:text-indigo-400">
                      {pass.studentId} · Room {pass.room || "304"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500">Permitted Exit</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatDateTime(pass.departureTime || pass.fromTime, "dd MMM, hh:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Expected Curfew Return</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatDateTime(pass.expectedReturnTime || pass.toTime, "dd MMM, hh:mm a")}
                    </span>
                  </div>
                </div>

                {/* Prominent State-Aware Scan Button */}
                <div className="space-y-2 pt-1">
                  <Link href={`/student/scan?passId=${pass.id}`} className="block w-full">
                    <Button
                      variant="primary"
                      className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 cursor-pointer"
                      leftIcon={QrCode}
                    >
                      {movementStatus === MOVEMENT_STATES.OUTSIDE_CAMPUS
                        ? "Scan at Gate to RE-ENTER"
                        : "Scan to OUT"}
                    </Button>
                  </Link>
                  <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Scan the fixed Gate QR poster at the security checkpoint using your camera.
                  </p>
                </div>
              </Card>
            ) : isReturned ? (
              /* PASS COMPLETED STATE */
              <Card className="p-5 text-center space-y-3 bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    PASS COMPLETED
                  </span>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Outpass Completed &bull; Closed
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                    Campus re-entry has been officially recorded. No further scanning is required.
                  </p>
                </div>
              </Card>
            ) : isApprovedWaiting ? (
              /* Approved but gate pass not issued yet */
              <Card className="p-5 text-center space-y-3 bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-primary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Pass Approved &bull; Ready for Gate Departure
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                    Chief Warden has approved your request. Scan the gate poster when leaving campus.
                  </p>
                </div>
              </Card>
            ) : (
              /* Other status note */
              <Card className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {pass.status === PASS_STATUSES.CANCELLED
                    ? "This outpass was cancelled."
                    : "Pass will be ready for gate scanning once approved by authorities."}
                </span>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM CANCEL DIALOG */}
      <ConfirmDialog
        isOpen={showCancelModal}
        title="Cancel Outpass Application"
        description="Are you sure you want to cancel this outpass request? This action cannot be undone."
        confirmLabel="Yes, Cancel Application"
        cancelLabel="Keep Outpass"
        variant="danger"
        isLoading={cancelMutation.isPending}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelModal(false)}
      />
    </div>
  );
}
