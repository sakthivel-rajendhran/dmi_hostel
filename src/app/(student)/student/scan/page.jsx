"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Flashlight,
  FlashlightOff,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  User,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useMyActivePass, useStudentPasses } from "@/hooks/queries/usePasses.js";
import { passService } from "@/lib/services/passService.js";
import { gateService } from "@/lib/services/gateService.js";
import { queryKeys } from "@/hooks/queries/queryKeys.js";
import { PASS_STATUSES } from "@/config/status.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { buildGateQrPayload, getDateKey } from "@/lib/utils/gateQr.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { cn } from "@/lib/utils/cn.js";

const CAMERA_CONTAINER_ID = "gate-qr-html5-scanner";

export default function StudentGateScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPassId = searchParams.get("passId");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: activePass, isLoading: isPassLoading } = useMyActivePass(studentId);
  const {
    data: studentPasses = [],
    isLoading: isPassesLoading,
    isError: isPassesError,
  } = useStudentPasses(studentId);

  // Target pass being evaluated for gate scanning
  let targetPass = null;
  if (urlPassId) {
    targetPass = studentPasses.find((p) => p.id === urlPassId || p.passNumber === urlPassId);
  } else if (activePass?.status === PASS_STATUSES.OUT || activePass?.status === PASS_STATUSES.OVERDUE) {
    targetPass = activePass;
  } else {
    const sorted = [...studentPasses].sort((a, b) => {
      const tA = new Date(a.appliedAt || a.departureTime || a.fromTime || 0).getTime();
      const tB = new Date(b.appliedAt || b.departureTime || b.fromTime || 0).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });
    targetPass =
      sorted.find(
        (p) => p.status !== PASS_STATUSES.RETURNED && p.status !== PASS_STATUSES.CANCELLED
      ) ||
      sorted[0] ||
      null;
  }

  // Warden Approval: Only final approval by Chief Warden unlocks camera
  const WARDEN_APPROVED_STATUSES = [
    PASS_STATUSES.APPROVED,
    PASS_STATUSES.GATE_PASS_ISSUED,
    PASS_STATUSES.OUT,
    PASS_STATUSES.OVERDUE,
  ];

  const isWardenApproved = Boolean(
    !isPassesLoading &&
      !isPassesError &&
      targetPass &&
      WARDEN_APPROVED_STATUSES.includes(targetPass.status)
  );

  // Real Backend Scanner Eligibility Check (7 distinct workflow states)
  const [eligibility, setEligibility] = useState(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);

  const fetchEligibility = useCallback(async () => {
    try {
      const res = await passService.getScannerEligibility(studentId, urlPassId || targetPass?.id);
      if (res && res.data) {
        setEligibility(res.data);
      }
    } catch (err) {
      console.warn("[Scanner] Eligibility check error:", err);
    } finally {
      setIsCheckingEligibility(false);
    }
  }, [studentId, urlPassId, targetPass?.id]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  // Compute 1 of 7 exact visual workflow states
  const scannerState = (() => {
    if (eligibility?.state) return eligibility.state;
    if (!targetPass) return "NO_PASS";
    const st = (targetPass.status || "").toUpperCase();
    if (st === "PENDING_STAFF") return "WAITING_STAFF";
    if (st === "PENDING_WARDEN" || st === "STAFF_APPROVED" || st === "PENDING" || st === "RECOMMENDED") return "WAITING_WARDEN";
    if (st === "WARDEN_APPROVED" || st === "GATE_PASS_ISSUED" || st === "APPROVED") return "WARDEN_APPROVED";
    if (st === "STAFF_REJECTED" || st === "WARDEN_REJECTED" || st === "REJECTED") return "REJECTED";
    if (st === "CANCELLED" || st === "EXPIRED") return "EXPIRED_OR_CANCELLED";
    if (st === "OUT" || st === "OVERDUE") return "EXIT_COMPLETED";
    return "NO_PASS";
  })();

  const canAccessScanner = eligibility
    ? eligibility.canAccess
    : (scannerState === "WARDEN_APPROVED" || scannerState === "EXIT_COMPLETED");

  // Scanner states
  const [permissionState, setPermissionState] = useState("PROMPT"); // PROMPT | ACTIVE | DENIED | UNSUPPORTED
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCodeModalOpen, setManualCodeModalOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locatingStatus, setLocatingStatus] = useState("idle"); // idle | locating | ok | denied

  // Result screen state: null | { status: 'EXIT'|'ENTRY'|'DENIED', data: object }
  const [scanResult, setScanResult] = useState(null);

  // Live ticking clock for verification proof
  const [currentTime, setCurrentTime] = useState(new Date());

  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);

  // Cleanup scanner cleanly
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop cleanup error:", err);
      } finally {
        scannerRef.current = null;
        isStoppingRef.current = false;
      }
    }
  }, []);

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  // Stop scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Request GPS position smoothly on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setLocatingStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocatingStatus("ok");
      },
      (err) => {
        console.warn("Geolocation skipped or denied:", err.message);
        setLocatingStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  // Initialize and start camera
  const startScanner = useCallback(async () => {
    if (!canAccessScanner) {
      toast.error("Gate scanner locked. Final Warden approval is required.");
      return;
    }
    if (typeof window === "undefined") return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Verify DOM element exists
      const container = document.getElementById(CAMERA_CONTAINER_ID);
      if (!container) return;

      await stopScanner();

      const html5QrCode = new Html5Qrcode(CAMERA_CONTAINER_ID);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // Trigger scan when QR code found
          await handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore transient frame parse errors
        }
      );

      setPermissionState("ACTIVE");

      // Check for torch / flash capabilities
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && "torch" in capabilities) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err) {
      console.error("Camera start failed:", err);
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")) {
        setPermissionState("DENIED");
      } else {
        setPermissionState("UNSUPPORTED");
      }
    }
  }, [stopScanner]);

  // Handle visibility change: turn off camera when app is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopScanner();
      } else if (document.visibilityState === "visible" && permissionState === "ACTIVE" && !scanResult) {
        startScanner();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopScanner();
    };
  }, [stopScanner, startScanner, permissionState, scanResult]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      toast.error("Could not toggle flashlight.");
    }
  };

  // Process decoded QR or manual fallback code
  const handleScanSuccess = async (qrText, codeFallback) => {
    if (isProcessing) return;

    // Strict offline check: scans cannot be queued offline to prevent timestamp fraud
    if (typeof window !== "undefined" && !navigator.onLine) {
      toast.error(
        "You need an internet connection to record your exit/entry. Ask the warden for a manual entry if you have no signal.",
        { duration: 7000 }
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Pause camera during processing
      await stopScanner();

      const res = await gateService.processScan({
        studentId,
        qrText,
        manualCode: codeFallback,
        location: userLocation,
        source: codeFallback ? "manual" : "student_scan",
      });

      if (res.ok) {
        // Success: EXIT or ENTRY
        setScanResult({
          status: res.data.action, // 'EXIT' or 'ENTRY'
          data: res.data,
        });

        // Invalidate react queries for fresh passes and active pass state
        queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        fetchEligibility();

        if (res.data.action === "EXIT") {
          toast.success("Gate exit recorded successfully!");
        } else if (res.data.isLate) {
          toast.warning(`Check-in recorded. Late by ${res.data.lateByMinutes} min.`);
        } else {
          toast.success("Welcome back! Check-in confirmed.");
        }
      } else {
        // Denied or error
        setScanResult({
          status: "DENIED",
          code: res.code,
          message: res.message,
          details: res.details,
        });
        toast.error(res.message || "Gate scan rejected.");
      }
    } catch (err) {
      setScanResult({
        status: "DENIED",
        code: "UNEXPECTED_ERROR",
        message: err.message || "An unexpected error occurred while verifying the scan.",
      });
      toast.error("Verification failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual fallback code submit
  const handleManualCodeSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode || manualCode.trim().length !== 6) {
      toast.error("Please enter a valid 6-character gate code.");
      return;
    }
    setManualCodeModalOpen(false);
    await handleScanSuccess(null, manualCode.trim());
  };

  // Reset and scan again
  const handleResetScanner = () => {
    setScanResult(null);
    setManualCode("");
    startScanner();
  };

  return (
    <div className="space-y-4 max-w-[560px] mx-auto pb-[calc(var(--tabbar-h)+1.5rem)] lg:pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/student/dashboard"
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Scan Gate QR</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fixed poster at campus gate</p>
          </div>
        </div>

        {/* Status chip for active pass */}
        {activePass?.status === PASS_STATUSES.OUT ||
        activePass?.status === PASS_STATUSES.OVERDUE ||
        activePass?.status === PASS_STATUSES.GATE_PASS_ISSUED ? (
          <StatusChip status={activePass.status} size="sm" />
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
            In Campus
          </span>
        )}
      </div>

      {/* Pre-scan context card */}
      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-primary dark:text-indigo-400 flex-shrink-0">
            {activePass?.status === PASS_STATUSES.OUT ? (
              <Clock className="w-4 h-4 text-amber-500" />
            ) : activePass?.status === PASS_STATUSES.OVERDUE ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : activePass?.status === PASS_STATUSES.GATE_PASS_ISSUED ? (
              <Ticket className="w-4 h-4 text-primary" />
            ) : (
              <Camera className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {activePass?.status === PASS_STATUSES.OUT
                ? "Currently OUT — Scan to RE-ENTER"
                : activePass?.status === PASS_STATUSES.OVERDUE
                ? "Pass OVERDUE — Scan to RE-ENTER"
                : activePass?.status === PASS_STATUSES.GATE_PASS_ISSUED
                ? "Ready for Gate EXIT"
                : "Scan Gate QR"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {activePass?.status === PASS_STATUSES.OUT ||
              activePass?.status === PASS_STATUSES.OVERDUE ||
              activePass?.status === PASS_STATUSES.GATE_PASS_ISSUED
                ? `Pass #${activePass.passNumber || activePass.id}`
                : "Scan fixed poster at campus security checkpoint"}
            </p>
          </div>
        </div>

        {locatingStatus === "ok" && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
            <MapPin className="w-3 h-3" /> Geofence Ready
          </span>
        )}
      </div>

      {/* RESULT SCREENS */}
      {scanResult ? (
        <Card className="p-6 text-center space-y-5 animate-scale-in border-2">
          {scanResult.status === "EXIT" ? (
            /* EXIT SUCCESS */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-900/20 animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Exit Approved
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">You May Exit</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gate exit recorded at {scanResult.data.gate?.name || "Main Campus Gate"}
                </p>
              </div>

              {/* Security Live Ticking Clock (Proof of live screen) */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-inner font-mono text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">
                  Live Security Verification
                </div>
                <div className="text-2xl font-black tracking-widest text-emerald-400 mt-0.5">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>

              {/* Student info box */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Student Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{user?.name || "Student Resident"}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Student ID</span>
                  <span className="font-mono font-bold text-primary dark:text-indigo-400">{studentId}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Pass Number</span>
                  <span className="font-mono font-semibold">{scanResult.data.pass?.passNumber || scanResult.data.passId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Return By</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {scanResult.data.returnDeadline || "Curfew Time"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/student/dashboard" className="block w-full">
                  <Button className="w-full h-11" variant="primary">
                    Done & Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : scanResult.status === "ENTRY" ? (
            /* ENTRY SUCCESS */
            <div className="space-y-4">
              <div
                className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center ring-8 animate-pulse",
                  scanResult.data.isLate
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-amber-50 dark:ring-amber-900/20"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-emerald-50 dark:ring-emerald-900/20"
                )}
              >
                {scanResult.data.isLate ? (
                  <AlertTriangle className="w-10 h-10" />
                ) : (
                  <CheckCircle2 className="w-10 h-10" />
                )}
              </div>

              <div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    scanResult.data.isLate
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {scanResult.data.isLate ? "Late Entry Recorded" : "Welcome Back"}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {scanResult.data.isLate ? "Entry Logged (Late)" : "Check-in Confirmed"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {scanResult.data.isLate
                    ? `You returned ${scanResult.data.lateByMinutes} minutes past permitted curfew. Chief Warden has been informed.`
                    : `Returned safely through ${scanResult.data.gate?.name || "Main Campus Gate"}`}
                </p>
              </div>

              {/* Security Live Ticking Clock */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-inner font-mono text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">
                  Hostel Entry Timestamp
                </div>
                <div className="text-2xl font-black tracking-widest text-emerald-400 mt-0.5">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>

              <div className="pt-2">
                <Link href="/student/dashboard" className="block w-full">
                  <Button className="w-full h-11" variant="primary">
                    Done & Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* DENIED / ERROR SCREEN */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-8 ring-rose-50 dark:ring-rose-900/20">
                <XCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Scan Denied
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {scanResult.code === "OUTSIDE_GEOFENCE"
                    ? "Outside Campus Gate Area"
                    : scanResult.code === "NO_ACTIVE_PASS"
                    ? "No Active Outpass"
                    : scanResult.code === "GATE_QR_EXPIRED"
                    ? "Gate QR Expired"
                    : scanResult.code === "DUPLICATE_SCAN"
                    ? "Scan Too Recent"
                    : "Verification Rejected"}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                  {scanResult.message}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full h-11"
                  variant="primary"
                  leftIcon={RefreshCw}
                  onClick={handleResetScanner}
                >
                  Try Scanning Again
                </Button>
                <Button
                  className="w-full h-11"
                  variant="outline"
                  leftIcon={Keyboard}
                  onClick={() => setManualCodeModalOpen(true)}
                >
                  Enter 6-Char Gate Code
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* CAMERA SCANNER VIEW */
        <div className="space-y-4">
          {permissionState === "PROMPT" ? (
            (() => {
              // Build visual state metadata for each of the 7 states
              let cfg = {
                icon: <Camera className="w-8 h-8 text-slate-400" />,
                iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-400",
                badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
                badgeText: "NO APPROVED PASS",
                heading: "No Warden-approved pass available.",
                subtext: "You must have a pass approved by the Chief Warden to access the gate scanner.",
                buttonLabel: "Start Camera Scanner",
                buttonEnabled: false,
                glow: false,
                cardBorder: "border-slate-200 dark:border-slate-800",
              };

              if (scannerState === "WAITING_STAFF") {
                cfg = {
                  icon: <Clock className="w-8 h-8 text-amber-500" />,
                  iconBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-900/20",
                  badgeClass: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                  badgeText: "AWAITING STAFF RECOMMENDATION",
                  heading: "Waiting for Staff / Class In-charge approval.",
                  subtext: "Home outing requires recommendation from your department class in-charge before reaching the Warden.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-amber-200 dark:border-amber-900/40",
                };
              } else if (scannerState === "WAITING_WARDEN") {
                cfg = {
                  icon: <Clock className="w-8 h-8 text-blue-500" />,
                  iconBg: "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/20",
                  badgeClass: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                  badgeText: "AWAITING WARDEN CLEARANCE",
                  heading: "Waiting for Warden approval.",
                  subtext: "Your outpass is queued with the Chief Warden. Scanner unlocks automatically once approved.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-blue-200 dark:border-blue-900/40",
                };
              } else if (scannerState === "WARDEN_APPROVED") {
                cfg = {
                  icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
                  iconBg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-900/20",
                  badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                  badgeText: "WARDEN APPROVED",
                  heading: "Warden Approved – Scanner Available",
                  subtext: "Your pass has official clearance. Click below to activate your camera and scan the Gate QR poster.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: true,
                  glow: true,
                  cardBorder: "border-emerald-300 dark:border-emerald-800 shadow-md shadow-emerald-500/10",
                };
              } else if (scannerState === "REJECTED") {
                const stage = eligibility?.rejectionStage === "staff" ? "Staff / Class In-charge" : "Chief Warden";
                const remarks = eligibility?.rejectionRemarks || targetPass?.wardenReason || targetPass?.staffReason || "Curfew restriction.";
                cfg = {
                  icon: <XCircle className="w-8 h-8 text-rose-500" />,
                  iconBg: "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/20",
                  badgeClass: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                  badgeText: `REJECTED BY ${stage.toUpperCase()}`,
                  heading: `Application Rejected by ${stage}`,
                  subtext: `Remarks: "${remarks}". Gate scanner access is permanently blocked for this pass.`,
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-rose-200 dark:border-rose-900/40",
                };
              } else if (scannerState === "EXPIRED_OR_CANCELLED") {
                cfg = {
                  icon: <AlertTriangle className="w-8 h-8 text-slate-400" />,
                  iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-400 ring-4 ring-slate-100 dark:ring-slate-800",
                  badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
                  badgeText: "PASS EXPIRED OR CANCELLED",
                  heading: "Pass Expired or Cancelled.",
                  subtext: "This outpass is no longer active. Scanner access is disabled. Please apply for a new pass.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-slate-200 dark:border-slate-800",
                };
              } else if (scannerState === "EXIT_COMPLETED") {
                cfg = {
                  icon: <CheckCircle2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />,
                  iconBg: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 ring-4 ring-cyan-50 dark:ring-cyan-900/20",
                  badgeClass: "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
                  badgeText: "EXIT SCAN COMPLETED",
                  heading: "Exit Completed – Return Scan Available",
                  subtext: "Duplicate EXIT scan disabled. Camera scanner is active exclusively for your ENTRY / RETURN scan upon returning to campus.",
                  buttonLabel: "Start Camera for Return Scan",
                  buttonEnabled: true,
                  glow: false,
                  cardBorder: "border-cyan-200 dark:border-cyan-800",
                };
              }

              return (
                <Card className={cn("p-8 text-center space-y-4 border-2 transition-all duration-300", cfg.cardBorder)}>
                  {/* Indicator Badge */}
                  <div className="flex justify-center">
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border", cfg.badgeClass)}>
                      {cfg.glow && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                      {cfg.badgeText}
                    </span>
                  </div>

                  {/* Icon with optional pulsing green glow */}
                  <div className={cn("w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all", cfg.iconBg, cfg.glow && "scanner-glow-active")}>
                    {cfg.icon}
                  </div>

                  {/* Heading & Subtext */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {cfg.heading}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      {cfg.subtext}
                    </p>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col items-center gap-2.5 pt-2">
                    {cfg.buttonEnabled ? (
                      <button
                        type="button"
                        onClick={startScanner}
                        data-testid="enable-camera-button"
                        className={cn(
                          "inline-flex items-center justify-center flex-row gap-2 px-6 h-11 rounded-2xl text-white text-sm font-bold shadow-md transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2",
                          cfg.glow
                            ? "bg-emerald-600 hover:bg-emerald-500 scanner-glow-active focus:ring-emerald-500 shadow-emerald-600/30"
                            : "bg-cyan-600 hover:bg-cyan-500 focus:ring-cyan-500 shadow-cyan-600/30"
                        )}
                        aria-label={cfg.buttonLabel}
                      >
                        <Camera className="w-5 h-5 flex-shrink-0" />
                        <span className="whitespace-nowrap">{cfg.buttonLabel}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center flex-row gap-2 px-6 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-bold cursor-not-allowed opacity-60 whitespace-nowrap shadow-none select-none"
                          aria-label={cfg.buttonLabel}
                        >
                          <Camera className="w-5 h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{cfg.buttonLabel}</span>
                        </button>
                        <div
                          data-testid="warden-approval-message"
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold text-center select-none cursor-default max-w-xs sm:max-w-sm w-full"
                          role="status"
                          aria-live="polite"
                        >
                          {cfg.heading}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })()
          ) : permissionState === "DENIED" ? (
            <Card className="p-6 text-center space-y-4 border-amber-200 dark:border-amber-900/40">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Camera Permission Denied</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please enable camera permission in your browser address bar, or use the 6-character code printed under the QR code.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={startScanner}
                  className="inline-flex items-center justify-center flex-row gap-2 h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Retry Camera</span>
                </button>
                <Button
                  variant="primary"
                  className="h-10"
                  leftIcon={Keyboard}
                  onClick={() => setManualCodeModalOpen(true)}
                >
                  Enter 6-Char Code
                </Button>
              </div>
            </Card>
          ) : (
            /* LIVE SCANNER FRAME */
            <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800 aspect-square max-w-md mx-auto">
              {/* HTML5 QR Container */}
              <div id={CAMERA_CONTAINER_ID} className="w-full h-full object-cover" />

              {/* Dark Overlay Frame with Viewfinder and Corner Brackets */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* 250px x 250px Target Box */}
                <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-xl" />

                  {/* Animated laser scanning line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-[bounce_2s_infinite]" />
                </div>

                <p className="absolute bottom-6 text-center text-xs font-medium text-white/90 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
                  Align Gate QR code within frame
                </p>
              </div>

              {/* Torch Toggle Button (Floating) */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={cn(
                    "absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition shadow-lg z-20",
                    torchOn
                      ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300"
                      : "bg-black/50 text-white hover:bg-black/70"
                  )}
                  aria-label="Toggle flashlight"
                >
                  {torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}

          {/* Fallback code button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setManualCodeModalOpen(true)}
              className="text-xs font-semibold text-primary dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 mx-auto py-2 px-3 rounded-xl hover:bg-primary/5 transition"
            >
              <Keyboard className="w-4 h-4" /> Can't scan? Enter 6-character gate code
            </button>
          </div>
        </div>
      )}

      {/* Manual Fallback Code Modal */}
      <Modal
        isOpen={manualCodeModalOpen}
        onClose={() => setManualCodeModalOpen(false)}
        title="Enter Gate Code"
      >
        <form onSubmit={handleManualCodeSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If your camera has difficulty scanning, enter the 6-character code printed directly below the Gate QR poster.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              6-Character Code
            </label>
            <Input
              type="text"
              maxLength={6}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toLowerCase())}
              placeholder="e.g. k3x9ab"
              className="font-mono text-center tracking-widest text-lg font-bold uppercase"
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualCodeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={manualCode.length !== 6}>
              Submit Code
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal ends */}
    </div>
  );
}
