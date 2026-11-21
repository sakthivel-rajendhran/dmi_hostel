"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  MapPin,
  Home,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  UploadCloud,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useMyProfile, useProfileCompleteness } from "@/hooks/queries/useStudents.js";
import { useStudentPasses, useApplyPass } from "@/hooks/queries/usePasses.js";
import { useLetters } from "@/hooks/queries/useLetters.js";
import { passService } from "@/lib/services/passService.js";
import { localPassSchema, homePassSchema } from "@/lib/validators.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { PASS_STATUSES } from "@/config/status.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { usePolicy } from "@/hooks/usePolicy.js";
import { cn } from "@/lib/utils";

function extractTenDigitPhone(phoneStr) {
  if (!phoneStr) return "";
  const digits = String(phoneStr).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

const DRAFT_STORAGE_KEY = "dmi_student_apply_draft_v2";

export default function StudentApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLetterId = searchParams.get("letterId") || "";

  const { user } = useAuth();
  const { policy } = usePolicy();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: profile } = useMyProfile(studentId);
  const { data: completeness } = useProfileCompleteness(studentId);
  const { data: existingPasses = [] } = useStudentPasses(studentId);
  const { data: lettersRes } = useLetters();
  const applyMutation = useApplyPass();

  const [passType, setPassType] = useState("Local Pass"); // "Local Pass" | "Home Pass"
  const [selectedLetterId, setSelectedLetterId] = useState(urlLetterId);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdPass, setCreatedPass] = useState(null);
  const [eligibilityWarning, setEligibilityWarning] = useState("");

  const approvedLetters = (lettersRes?.data || []).filter(
    (l) => (l.studentId === studentId || l.studentId === user?.studentId) && l.status === "approved"
  );

  const todayStr = new Date().toISOString().split("T")[0];

  // Forms setup
  const isLocal = passType === "Local Pass";
  const activeSchema = isLocal ? localPassSchema : homePassSchema;

  const defaultStudentPhone = extractTenDigitPhone(profile?.phone || user?.phone);

  const defaultValues = {
    date: todayStr,
    fromDate: todayStr,
    toDate: todayStr,
    exitTime: "16:00",
    returnTime: "20:00",
    destination: "",
    reason: "",
    studentPhone: defaultStudentPhone,
    guardianPhone: defaultStudentPhone || extractTenDigitPhone(profile?.guardianPhone || user?.guardianPhone) || "9876543210",
    guardianConsent: false,
    isEmergency: false,
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    resolver: zodResolver(activeSchema),
    mode: "onChange",
    defaultValues,
  });

  const watchReason = watch("reason") || "";
  const watchDestination = watch("destination") || "";
  const watchExitTime = watch("exitTime");
  const watchReturnTime = watch("returnTime");
  const watchFromDate = watch("fromDate");
  const watchToDate = watch("toDate");
  const watchDate = watch("date");
  const watchGuardianConsent = watch("guardianConsent");

  // Load draft from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.passType) setPassType(parsed.passType);
          if (parsed.isEmergency !== undefined) setIsEmergency(parsed.isEmergency);
          if (parsed.formValues && typeof parsed.formValues === "object") {
            reset({
              ...defaultValues,
              ...parsed.formValues,
              studentPhone: parsed.formValues.studentPhone || defaultStudentPhone,
              guardianPhone: parsed.formValues.guardianPhone || defaultStudentPhone || "9876543210",
            });
            toast.info("Draft restored from previous session.");
          }
        }
      } catch (e) {
        console.warn("Could not load draft:", e);
      }
    }
  }, [reset, defaultStudentPhone]);

  // Sync draft to sessionStorage on form changes
  useEffect(() => {
    if (typeof window !== "undefined" && !createdPass) {
      const subscription = watch((value) => {
        try {
          sessionStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({
              passType,
              isEmergency,
              formValues: value,
            })
          );
        } catch (e) {}
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, passType, isEmergency, createdPass]);

  // Set student phone from authenticated profile when loaded
  useEffect(() => {
    const studentNum = extractTenDigitPhone(profile?.phone || user?.phone);
    if (studentNum) {
      setValue("studentPhone", studentNum, { shouldValidate: true });
      setValue("guardianPhone", studentNum, { shouldValidate: true });
    }
  }, [profile, user, setValue]);

  // Check Overdue status
  const hasOverduePass = existingPasses.some((p) => p.status === PASS_STATUSES.OVERDUE);

  // Check Monthly Home Pass limit
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const homePassesThisMonth = existingPasses.filter((p) => {
    const pType = (p.type || "").toLowerCase();
    if (!pType.includes("home")) return false;
    if (p.status === PASS_STATUSES.REJECTED || p.status === PASS_STATUSES.CANCELLED) return false;
    const pDate = new Date(p.fromTime || p.departureTime || p.appliedAt);
    return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
  }).length;

  const isHomePassExhausted = !isLocal && homePassesThisMonth >= (WORKFLOW_CONFIG.maxHomePassesPerMonth || 2);

  // Form submit trigger: open confirmation modal first
  const onFormSubmit = async (data) => {
    setEligibilityWarning("");

    // Calculate dates
    let fromIso = "";
    let toIso = "";

    if (isLocal) {
      fromIso = `${data.date}T${data.exitTime}:00`;
      toIso = `${data.date}T${data.returnTime}:00`;
    } else {
      fromIso = `${data.fromDate}T${data.exitTime}:00`;
      toIso = `${data.toDate}T${data.returnTime}:00`;
    }

    // Call passService.checkEligibility
    const eligibilityRes = await passService.checkEligibility({
      studentId,
      type: passType,
      from: fromIso,
      to: toIso,
    });

    if (!eligibilityRes.ok || !eligibilityRes.data.eligible) {
      const msg = eligibilityRes.data?.reasons?.[0] || eligibilityRes.message || "Pass request not eligible";
      setEligibilityWarning(msg);
      toast.error(msg);
      return;
    }

    setShowConfirmModal(true);
  };

  // Execute actual submission after modal confirm
  const handleFinalSubmit = async () => {
    const data = watch();
    setShowConfirmModal(false);

    let fromIso = "";
    let toIso = "";

    if (isLocal) {
      fromIso = `${data.date}T${data.exitTime}:00`;
      toIso = `${data.date}T${data.returnTime}:00`;
    } else {
      fromIso = `${data.fromDate}T${data.exitTime}:00`;
      toIso = `${data.toDate}T${data.returnTime}:00`;
    }

    try {
      const res = await applyMutation.mutateAsync({
        studentId,
        studentName: profile?.name || user?.name || "Rahul Kumar",
        studentAvatar: profile?.avatar || "RK",
        department: profile?.department || user?.department || "CSE",
        year: profile?.year || user?.year || 3,
        room: profile?.roomNumber || profile?.room || profile?.roomNo || "304",
        roomNo: profile?.roomNumber || profile?.room || profile?.roomNo || "304",
        floor: profile?.floor || user?.floor || "F3",
        floorLabel: profile?.floorLabel || user?.floorLabel || "3rd Floor",
        type: passType,
        destination: data.destination,
        reason: data.reason,
        fromTime: fromIso,
        toTime: toIso,
        departureTime: fromIso,
        expectedReturnTime: toIso,
        studentPhone: data.studentPhone || data.guardianPhone || extractTenDigitPhone(profile?.phone || user?.phone),
        guardianPhone: data.studentPhone || data.guardianPhone || extractTenDigitPhone(profile?.phone || user?.phone),
        phone: data.studentPhone || data.guardianPhone || extractTenDigitPhone(profile?.phone || user?.phone),
        guardianConsent: isLocal ? true : data.guardianConsent,
        emergency: isEmergency,
        attachmentName: null,
        letterId: selectedLetterId || null,
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        setCreatedPass(res.data);
        toast.success("Outpass application submitted successfully!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit outpass. Please try again.");
    }
  };

  // SUCCESS SCREEN STATE
  if (createdPass) {
    return (
      <div className="py-6 px-2 space-y-6 text-center max-w-md mx-auto">
        <div className="relative mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
          <CheckCircle2 className="w-12 h-12 animate-in zoom-in-75 duration-300" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center shadow">
            ✓
          </span>
        </div>

        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
            Submission Received
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Outpass Application Sent
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Your request is currently routed to your faculty advisor and hostel warden for review.
          </p>
        </div>

        <Card className="p-4 text-left space-y-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">Pass Reference:</span>
            <span className="font-mono font-bold text-primary text-sm">
              {createdPass.passNumber || createdPass.id}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
              Pending Approval
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Pass Type:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {createdPass.type}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Destination:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
              {createdPass.destination}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Scheduled Departure:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatDateTime(createdPass.departureTime || createdPass.fromTime, "dd MMM, hh:mm a")}
            </span>
          </div>
        </Card>

        <div className="space-y-2 pt-2">
          <Link href={`/student/passes/${createdPass.id}`} className="block w-full">
            <Button variant="primary" size="lg" className="w-full font-bold">
              View Pass Timeline
            </Button>
          </Link>
          <Link href="/student/dashboard" className="block w-full">
            <Button variant="outline" size="lg" className="w-full font-bold">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // WARDEN ALLOCATION GATE (BLOCKING STATE WHEN UNALLOCATED)
  const isUnallocated = profile?.hostelVerification === "unallocated" || !profile?.floor;
  if (policy.roomAllocationMode === "warden_allocates" && isUnallocated) {
    return (
      <div className="py-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/student/dashboard"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Apply for Outpass
            </h2>
            <span className="text-xs text-slate-500">Resident Gate Permission</span>
          </div>
        </div>

        <Card className="p-6 text-center space-y-4 border-2 border-amber-300 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Hostel Allocation Required
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              Your room has not been allocated yet
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
              Your room has not been allocated yet. Please contact the warden. Outpasses can only be generated once your hostel room has been officially assigned.
            </p>
          </div>

          <Link href="/student/dashboard" className="block w-full">
            <Button
              variant="outline"
              size="lg"
              className="w-full font-bold text-xs"
              leftIcon={ArrowLeft}
            >
              Return to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // PROFILE COMPLETENESS GATE (BLOCKING STATE)
  if (completeness && !completeness.complete && completeness.percentage < 100) {
    return (
      <div className="py-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/student/dashboard"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Apply for Outpass
            </h2>
            <span className="text-xs text-slate-500">Resident Gate Permission</span>
          </div>
        </div>

        <Card className="p-6 text-center space-y-4 border-2 border-amber-300 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Action Required
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              Complete Your Profile to Apply
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
              Hostel security regulations require all residents to furnish valid hostel room and guardian details before an outpass can be authorized.
            </p>
          </div>

          {/* Completeness Bar */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-200 dark:border-amber-900/60 text-left space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Profile Completion:</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono">
                {completeness.percentage}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Missing: </span>
              {completeness.missingFields.join(", ")}
            </div>
          </div>

          <Link href="/student/profile" className="block w-full">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold text-xs"
              rightIcon={ArrowRight}
            >
              Complete Profile Now
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-[calc(var(--tabbar-h)+var(--actionbar-h)+1.5rem)] lg:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/student/dashboard"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Apply for Outpass
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Submit request for advisor & warden clearance
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT OVERDUE BLOCKING BANNER */}
      {hasOverduePass && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <div className="text-xs min-w-0">
              <h4 className="font-bold truncate">Applications blocked: overdue pass on record</h4>
              <p className="text-[11px] text-red-600/90 dark:text-red-300/80 truncate">
                Report to the hostel warden immediately to clear your check-in.
              </p>
            </div>
          </div>
          <Link href="/student/dashboard" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs font-bold border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300">
              Contact Warden
            </Button>
          </Link>
        </div>
      )}

      {/* ELIGIBILITY WARNING */}
      {eligibilityWarning && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-xs font-semibold">{eligibilityWarning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols on lg) */}
          <div className={`space-y-4 lg:col-span-8 ${hasOverduePass ? "opacity-60 pointer-events-none select-none" : ""}`}>
            {/* Pass Type Switcher (SegmentedControl) */}
            <Card className="p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pass Type
              </label>
              <SegmentedControl
                options={[
                  { label: "Local Pass", value: "Local Pass", icon: MapPin },
                  { label: "Home Pass", value: "Home Pass", icon: Home },
                ]}
                value={passType}
                onChange={(val) => {
                  setPassType(val);
                  setEligibilityWarning("");
                }}
              />

              {isHomePassExhausted && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Monthly Home Pass limit reached ({WORKFLOW_CONFIG.maxHomePassesPerMonth || 2} used this month).
                  </span>
                </div>
              )}
            </Card>

            {/* Dynamic Timings Card */}
            <Card className="p-4 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {isLocal ? "Local Outing Schedule" : "Home Departure & Return Schedule"}
              </h3>

              {isLocal ? (
                /* LOCAL PASS TIMINGS */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Outing Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      {...register("date")}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {errors.date && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.date.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Exit Time
                      </label>
                      <input
                        type="time"
                        {...register("exitTime")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.exitTime && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.exitTime.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Expected Return
                      </label>
                      <input
                        type="time"
                        max={WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"}
                        {...register("returnTime")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.returnTime && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.returnTime.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    Notice: All local passes must check back in through the security gate by{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"} (9:00 PM)
                    </span>
                    .
                  </div>
                </div>
              ) : (
                /* HOME PASS TIMINGS */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Departure Date
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        {...register("fromDate")}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.fromDate && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.fromDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Exit Time
                      </label>
                      <input
                        type="time"
                        {...register("exitTime")}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Return Date
                      </label>
                      <input
                        type="date"
                        min={watchFromDate || todayStr}
                        {...register("toDate")}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.toDate && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.toDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Expected Return Time
                      </label>
                      <input
                        type="time"
                        {...register("returnTime")}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Guardian confirmation checkbox for Home Pass */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                      <input
                        type="checkbox"
                        {...register("guardianConsent")}
                        className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          Guardian Confirmation
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          My guardian has been informed and has approved this home trip.
                        </span>
                      </div>
                    </label>
                    {errors.guardianConsent && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">
                        {errors.guardianConsent.message}
                      </p>
                    )}
                  </div>

                  {/* Special Permission Letter Selector (only when module is enabled) */}
                  {policy?.studentLetters?.enabled && (
                    <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Approved Executive Letter (Optional / Required &gt; 7 Days)
                        </label>
                        <Link
                          href="/student/letters"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>New Letter</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <select
                        value={selectedLetterId}
                        onChange={(e) => setSelectedLetterId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">No Letter Linked (Standard Outpass)</option>
                        {approvedLetters.map((l) => (
                          <option key={l.id} value={l.id}>
                            Letter #{l.id} - {l.subject} (Approved)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Destination & Reason Card */}
            <Card className="p-4 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Trip Details
              </h3>

              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Town Market, Central Library, Hometown"
                  {...register("destination")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.destination && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">
                    {errors.destination.message}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reason for Leaving
                  </label>
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      watchReason.length > 300
                        ? "text-red-500"
                        : watchReason.length < 10
                        ? "text-amber-500"
                        : "text-slate-400"
                    }`}
                  >
                    {watchReason.length} / 300
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Detailed explanation of the outpass requirement (min 10 characters)..."
                  {...register("reason")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.reason && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.reason.message}</p>
                )}

                {/* Emergency Medical / Hospital Shortcut */}
                <div className="mt-3 p-3.5 rounded-xl border border-red-200 bg-red-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>In case of Emergency click this &gt;</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmergency(true);
                      setValue("isEmergency", true, { shouldValidate: true, shouldDirty: true });
                      setValue("reason", "Medical Appointment / Hospital", { shouldValidate: true, shouldDirty: true });
                      toast.success("Emergency Medical / Urgent Pass enabled!");
                    }}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 cursor-pointer",
                      isEmergency
                        ? "bg-red-600 text-white ring-2 ring-red-600 shadow-md"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    )}
                    aria-label="Select Emergency Medical Appointment / Hospital Pass"
                  >
                    <span>MEDICAL APPOINTMENT / HOSPITAL</span>
                    {isEmergency && (
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Indication of Emergency Selection */}
                {isEmergency && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Emergency Medical / Urgent Pass is selected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmergency(false);
                        setValue("isEmergency", false, { shouldValidate: true, shouldDirty: true });
                        if (watchReason === "Medical Appointment / Hospital") {
                          setValue("reason", "", { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                      className="text-[11px] underline font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Student Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    {...register("studentPhone")}
                    onChange={(e) => {
                      register("studentPhone").onChange(e);
                      setValue("guardianPhone", e.target.value, { shouldValidate: true });
                    }}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {errors.studentPhone && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold">
                    {errors.studentPhone.message}
                  </p>
                )}
              </div>
            </Card>

            {/* Additional Information Card */}
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Additional Information
              </h3>

              {/* Emergency Switch */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Emergency Medical / Urgent Pass
                    </span>
                    {isEmergency && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-[10px] font-extrabold uppercase animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Flags pass with high priority for urgent warden notification.
                  </p>
                </div>
                <Switch
                  checked={isEmergency}
                  onChange={(checked) => {
                    setIsEmergency(checked);
                    setValue("isEmergency", checked, { shouldValidate: true, shouldDirty: true });
                  }}
                  aria-label="Toggle emergency status"
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Desktop Live Summary & In-flow Action Card (4 cols on lg, sticky top-24) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Pass Summary
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                    {passType}
                  </span>
                </div>

                {/* Live Overview */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Destination:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                      {watchDestination || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Departure:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                      {isLocal
                        ? `${watchDate || todayStr} at ${watchExitTime}`
                        : `${watchFromDate || todayStr} at ${watchExitTime}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Expected Return:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                      {isLocal
                        ? `${watchDate || todayStr} at ${watchReturnTime}`
                        : `${watchToDate || todayStr} at ${watchReturnTime}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 shrink-0">Student Number:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 text-right">
                      +91 {watch("studentPhone") || watch("guardianPhone") || "—"}
                    </span>
                  </div>
                  {isEmergency && (
                    <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-bold pt-1">
                      <span>Priority:</span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60">
                        Emergency
                      </span>
                    </div>
                  )}
                </div>

                {/* Rule Checklist */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Hostel Guidelines
                  </span>
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Curfew: Return by {WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"} (9:00 PM)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Home passes this month: {homePassesThisMonth} of {WORKFLOW_CONFIG.maxHomePassesPerMonth || 2}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Gate QR scan required on exit and return</span>
                    </div>
                  </div>
                </div>

                {/* In-Flow Submit Button for Desktop */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={hasOverduePass || isHomePassExhausted || isSubmitting}
                  leftIcon={Send}
                  className="w-full font-bold text-xs shadow-md"
                >
                  {isSubmitting ? "Submitting..." : "Review & Submit"}
                </Button>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Safe-Area Aware Bottom Action Bar (<1024px) */}
        <div className="lg:hidden fixed bottom-[var(--tabbar-h)] left-0 right-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
              {passType}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {isLocal ? "Curfew: 9:00 PM" : `${watchFromDate || "Today"} → ${watchToDate || "Return"}`}
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={hasOverduePass || isHomePassExhausted || isSubmitting}
            leftIcon={Send}
            className="font-bold text-xs px-5 whitespace-nowrap shrink-0 shadow-md"
          >
            Submit Pass
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Outpass Application"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-600 dark:text-slate-300">Type:</span>
              <span className="text-primary font-bold">{passType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Destination:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {watchDestination}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Departure:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isLocal ? `${watchDate} at ${watchExitTime}` : `${watchFromDate} at ${watchExitTime}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Expected Return:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isLocal ? `${watchDate} at ${watchReturnTime}` : `${watchToDate} at ${watchReturnTime}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Student Number:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                +91 {watch("studentPhone") || watch("guardianPhone")}
              </span>
            </div>
            {isEmergency && (
              <div className="pt-1 flex items-center justify-between text-red-600 dark:text-red-400 font-bold">
                <span>Priority:</span>
                <span>EMERGENCY PASS</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            By submitting, you affirm adherence to DMI College hostel curfew regulations.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="w-full text-xs font-semibold"
            >
              Edit Details
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleFinalSubmit}
              disabled={applyMutation.isPending}
              className="w-full text-xs font-bold"
            >
              {applyMutation.isPending ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
