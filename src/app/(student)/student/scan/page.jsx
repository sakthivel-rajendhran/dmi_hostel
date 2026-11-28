"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSafeSearchParams } from "@/hooks/useSafeSearchParams.js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Sparkles,
  Ticket,
  ShieldCheck,
  User,
  LogOut,
  LogIn,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useMyActivePass, useStudentPasses } from "@/hooks/queries/usePasses.js";
import { passService } from "@/lib/services/passService.js";
import { gateService } from "@/lib/services/gateService.js";
import { queryKeys } from "@/hooks/queries/queryKeys.js";
import { PASS_STATUSES } from "@/config/status.js";
import { getMovementStatus, MOVEMENT_STATES } from "@/lib/utils/movementStatus.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { cn } from "@/lib/utils/cn.js";

const CAMERA_CONTAINER_ID = "gate-qr-html5-scanner";

export default function StudentGateScanPage() {
  const router = useRouter();
  const searchParams = useSafeSearchParams();
  const urlPassId = searchParams.get("passId");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "";

  const { data: activePass, isLoading: isPassLoading, refetch: refetchActive } = useMyActivePass(studentId);
  const {
    data: studentPasses = [],
    isLoading: isPassesLoading,
    isError: isPassesError,
    refetch: refetchPasses,
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

  // Scanner Eligibility Check from Backend
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

  // Compute exact visual workflow states
  const scannerState = (() => {
    const rawState = (eligibility?.stateCode || eligibility?.state || "").toUpperCase();
    if (rawState) {
      if (rawState.includes("WARDEN_APPROVED") || rawState === "STATE_4_WARDEN_APPROVED") return "WARDEN_APPROVED";
      if (rawState.includes("ALREADY_EXITED") || rawState.includes("EXIT_COMPLETED") || rawState === "STATE_7_ALREADY_EXITED") return "EXIT_COMPLETED";
      if (rawState.includes("WAITING_WARDEN") || rawState === "STATE_3_WAITING_WARDEN") return "WAITING_WARDEN";
      if (rawState.includes("WAITING_STAFF") || rawState === "STATE_2_WAITING_STAFF") return "WAITING_STAFF";
      if (rawState.includes("REJECTED") || rawState === "STATE_5_REJECTED") return "REJECTED";
      if (rawState.includes("EXPIRED") || rawState.includes("CANCELLED") || rawState === "STATE_6_EXPIRED_OR_CANCELLED") return "EXPIRED_OR_CANCELLED";
    }

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

  // Scanner states: PROMPT | ACTIVE | DENIED | NO_CAMERA | UNSUPPORTED | ERROR
  const [permissionState, setPermissionState] = useState("PROMPT");
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingStatus, setLocatingStatus] = useState("idle");
  const [manualCodeInput, setManualCodeInput] = useState("");

  // Option B: Pending Movement Confirmation state (after valid scan, before DB update)
  const [pendingMovement, setPendingMovement] = useState(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Result screen state: null | { status: 'EXIT'|'ENTRY'|'DENIED', data: object }
  const [scanResult, setScanResult] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);

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
        setTorchOn(false);
        setHasTorch(false);
      }
    }
  }, []);

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
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

  // Option B Step 1: Process decoded QR from camera -> Validate scan intent WITHOUT modifying DB
  const handleScanSuccess = async (qrText) => {
    if (isProcessing) return;

    if (typeof window !== "undefined" && !navigator.onLine) {
      toast.error(
        "You need an internet connection to record your exit/entry. Ask security for assistance if you have no signal.",
        { duration: 7000 }
      );
      return;
    }

    setIsProcessing(true);

    try {
      await stopScanner();

      // Step 1: Pre-flight Intent check against MySQL
      const res = await gateService.checkScanIntent({
        studentId,
        qrText,
        location: userLocation,
      });

      if (res.ok) {
        // Show Option B Confirmation UI
        setPendingMovement({
          ...res.data,
          scannedToken: qrText,
        });
        setScanResult(null);
      } else {
        setScanResult({
          status: "DENIED",
          code: res.code,
          message: res.message,
          details: res.details,
        });
        setPendingMovement(null);
        toast.error(res.message || "Gate scan rejected.");
      }
    } catch (err) {
      setScanResult({
        status: "DENIED",
        code: "UNEXPECTED_ERROR",
        message: err.message || "An unexpected error occurred while verifying the scan.",
      });
      setPendingMovement(null);
      toast.error("Verification failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Option B Step 2: Student confirms OUT or IN movement
  const handleConfirmMovement = async (actionToExecute) => {
    if (!pendingMovement || isSubmittingMovement) return;
    setIsSubmittingMovement(true);

    try {
      const res = await gateService.recordMovement({
        passId: pendingMovement.pass.id,
        action: actionToExecute,
        qrText: pendingMovement.scannedToken || pendingMovement.token,
        studentId,
      });

      if (res.ok) {
        setScanResult({
          status: res.data.action, // 'OUT' or 'IN'
          data: {
            ...res.data,
            action: res.data.action === "OUT" ? "EXIT" : "ENTRY",
            pass: {
              ...pendingMovement.pass,
              status: res.data.status,
              passNumber: res.data.passNumber || pendingMovement.pass.passNumber,
            },
            gate: res.data.gate,
            returnDeadline: pendingMovement.pass.expectedReturnTime
              ? new Date(pendingMovement.pass.expectedReturnTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Curfew Time",
          },
        });
        setPendingMovement(null);

        // Refresh all data
        refetchActive();
        refetchPasses();
        fetchEligibility();

        if (res.data.action === "OUT") {
          toast.success("Campus exit recorded successfully! Have a safe journey.");
        } else if (res.data.isLate) {
          toast.warning(`Late return recorded (${res.data.lateMinutes} min overdue). Welcome back!`);
        } else {
          toast.success("Campus return recorded successfully! Welcome back.");
        }
      } else {
        toast.error(res.message || "Failed to record movement.");
        setScanResult({
          status: "DENIED",
          code: res.code || "MOVEMENT_ERROR",
          message: res.message || "Failed to record gate movement.",
        });
        setPendingMovement(null);
      }
    } catch (err) {
      toast.error(err.message || "Network error while submitting movement.");
      setScanResult({
        status: "DENIED",
        code: "NETWORK_ERROR",
        message: "Failed to record movement due to connection error.",
      });
      setPendingMovement(null);
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // Initialize and start camera with device enumeration & fallback
  const startScanner = useCallback(async () => {
    if (!canAccessScanner) {
      toast.error("Gate scanner locked. Final Warden approval is required.");
      return;
    }
    if (typeof window === "undefined") return;

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    // Check secure context requirement (WebRTC getUserMedia requires HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setPermissionState("UNSUPPORTED");
      isStartingRef.current = false;
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState("UNSUPPORTED");
      isStartingRef.current = false;
      return;
    }

    setPermissionState("ACTIVE");

    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const container = document.getElementById(CAMERA_CONTAINER_ID);
      if (!container) {
        console.error("Scanner element not found in DOM.");
        isStartingRef.current = false;
        return;
      }

      await stopScanner();

      const html5QrCode = new Html5Qrcode(CAMERA_CONTAINER_ID);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      try {
        await html5QrCode.start(
          { facingMode: { exact: "environment" } },
          config,
          async (decodedText) => {
            await handleScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (err) {
        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
              await handleScanSuccess(decodedText);
            },
            () => {}
          );
        } catch (envErr) {
          console.warn("Environment facingMode failed, trying user camera:", envErr);
          await html5QrCode.start(
            { facingMode: "user" },
            config,
            async (decodedText) => {
              await handleScanSuccess(decodedText);
            },
            () => {}
          );
        }
      }

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
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError" || err?.message?.includes("Requested device not found")) {
        setPermissionState("NO_CAMERA");
      } else if (err?.name === "NotSupportedError") {
        setPermissionState("UNSUPPORTED");
      } else {
        setPermissionState("ERROR");
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [canAccessScanner, stopScanner]);

  // Auto-start camera when student opens the scanner with an eligible approved pass
  useEffect(() => {
    if (canAccessScanner && permissionState === "PROMPT" && !scanResult && !pendingMovement && !isCheckingEligibility) {
      startScanner();
    }
  }, [canAccessScanner, permissionState, scanResult, pendingMovement, isCheckingEligibility, startScanner]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopScanner();
      } else if (document.visibilityState === "visible" && permissionState === "ACTIVE" && !scanResult && !pendingMovement) {
        startScanner();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopScanner();
    };
  }, [stopScanner, startScanner, permissionState, scanResult, pendingMovement]);

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

  // Reset and scan again
  const handleResetScanner = () => {
    setScanResult(null);
    setPendingMovement(null);
    setManualCodeInput("");
    startScanner();
  };

  // Option B: Manual fallback code submit (troubleshooting camera)
  const handleManualSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = manualCodeInput.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter the 6-character fallback code from the gate.");
      return;
    }
    await handleScanSuccess(code);
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Main Campus Security Checkpoint</p>
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
              {getMovementStatus(activePass) === MOVEMENT_STATES.OUTSIDE_CAMPUS
                ? (activePass?.status === PASS_STATUSES.OVERDUE ? "Pass OVERDUE — Scan to RE-ENTER" : "Currently OUT — Scan to RE-ENTER")
                : getMovementStatus(activePass) === MOVEMENT_STATES.NOT_EXITED
                ? "Ready for Gate EXIT — Scan to OUT"
                : "Scan Gate QR"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {getMovementStatus(activePass) === MOVEMENT_STATES.OUTSIDE_CAMPUS ||
              getMovementStatus(activePass) === MOVEMENT_STATES.NOT_EXITED
                ? `Pass #${activePass.passNumber || activePass.id}`
                : "Point camera at the physical Main Gate screen"}
            </p>
          </div>
        </div>
      </div>

      {/* OPTION B: PENDING MOVEMENT CONFIRMATION CARD (After scan, before DB update) */}
      {pendingMovement && !scanResult ? (
        <Card className="p-6 space-y-5 animate-scale-in border-2 border-indigo-200 dark:border-indigo-800 shadow-xl">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gate QR Verified &bull; {pendingMovement.gate?.name || "Main Gate"}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              Select Gate Movement Action
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pendingMovement.message}
            </p>
          </div>

          {/* Overdue Banner if applicable (critical: does NOT block return) */}
          {pendingMovement.isOverdue && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Overdue Return Notice:</span>
                <span>
                  Expected return was exceeded by {pendingMovement.overdueMinutes} minutes. You are permitted to check in immediately.
                </span>
              </div>
            </div>
          )}

          {/* Outpass Summary Table */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Student Name</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{pendingMovement.pass.studentName || user?.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Pass Number</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{pendingMovement.pass.passNumber}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Destination</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{pendingMovement.pass.destination}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Reason</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{pendingMovement.pass.reason}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Current Pass State</span>
              <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {pendingMovement.pass.status}
              </span>
            </div>
          </div>

          {/* Movement Actions (Option B) */}
          <div className="space-y-3 pt-1">
            {/* FIRST SCAN: OUT ACTION */}
            {pendingMovement.permittedAction === "OUT" ? (
              <>
                <button
                  type="button"
                  disabled={isSubmittingMovement}
                  onClick={() => handleConfirmMovement("OUT")}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSubmittingMovement ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                  <span>OUT — Confirm Campus Exit</span>
                </button>

                {/* Disabled IN button */}
                <button
                  type="button"
                  disabled
                  className="w-full h-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-60 select-none"
                >
                  <LogIn className="w-4 h-4" />
                  <span>IN — Returning to Campus (Disabled: You have not exited yet)</span>
                </button>
              </>
            ) : pendingMovement.permittedAction === "IN" ? (
              /* SECOND SCAN: IN ACTION */
              <>
                <button
                  type="button"
                  disabled={isSubmittingMovement}
                  onClick={() => handleConfirmMovement("IN")}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSubmittingMovement ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  <span>IN — Confirm Campus Return</span>
                </button>

                {/* Disabled OUT button */}
                <button
                  type="button"
                  disabled
                  className="w-full h-11 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-60 select-none"
                >
                  <LogOut className="w-4 h-4" />
                  <span>OUT — Leaving Campus (Disabled: Already exited)</span>
                </button>
              </>
            ) : (
              /* Pass Completed */
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pass Completed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This pass has already been used for both exit and return.
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={isSubmittingMovement}
              onClick={handleResetScanner}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium transition cursor-pointer"
            >
              Cancel & Rescan
            </button>
          </div>
        </Card>
      ) : null}

      {/* FINAL RESULT SCREENS (After confirmed movement) */}
      {scanResult ? (
        <Card className="p-6 text-center space-y-5 animate-scale-in border-2">
          {scanResult.status === "EXIT" || scanResult.status === "OUT" ? (
            /* EXIT SUCCESS */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-900/20 animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Campus Exit Recorded
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">You May Exit Campus</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Exit confirmed at {scanResult.data.gate?.name || "Main Campus Gate"}
                </p>
              </div>

              {/* Security Live Ticking Clock */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-inner font-mono text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">
                  Official Exit Timestamp
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
          ) : scanResult.status === "ENTRY" || scanResult.status === "IN" ? (
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
                    ? `You returned ${scanResult.data.lateMinutes || scanResult.data.lateByMinutes} minutes past permitted curfew. Return recorded in hostel registry.`
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
                  Scan Rejected
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {scanResult.code === "NO_ACTIVE_PASS"
                    ? "No Active Outpass"
                    : scanResult.code === "TOKEN_EXPIRED"
                    ? "Gate QR Expired"
                    : scanResult.code === "DUPLICATE_SUBMISSION"
                    ? "Submission Too Recent"
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
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {/* CAMERA SCANNER VIEWPORT (Hidden if result or pending confirmation is active) */}
      {!scanResult && !pendingMovement && (
        <div className="space-y-4">
          {permissionState === "PROMPT" ? (
            (() => {
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
                  subtext: "Your faculty advisor must recommend this Home Pass before it reaches the Warden.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-amber-200 dark:border-amber-800",
                };
              } else if (scannerState === "WAITING_WARDEN") {
                cfg = {
                  icon: <Clock className="w-8 h-8 text-blue-500" />,
                  iconBg: "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/20",
                  badgeClass: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                  badgeText: "AWAITING WARDEN CLEARANCE",
                  heading: "Waiting for Warden approval.",
                  subtext: "Your pass has been submitted and is currently in the Chief Warden's clearance queue.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-blue-200 dark:border-blue-800",
                };
              } else if (scannerState === "WARDEN_APPROVED") {
                cfg = {
                  icon: <Camera className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
                  iconBg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-900/20",
                  badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                  badgeText: "WARDEN APPROVED – READY FOR EXIT",
                  heading: "Warden Approved – Scanner Available.",
                  subtext: "Point your camera at the physical Gate QR screen at the checkpoint to confirm exit.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: true,
                  glow: true,
                  cardBorder: "border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10",
                };
              } else if (scannerState === "REJECTED") {
                cfg = {
                  icon: <XCircle className="w-8 h-8 text-rose-500" />,
                  iconBg: "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/20",
                  badgeClass: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                  badgeText: "APPLICATION REJECTED",
                  heading: "Application Rejected by Hostel Authority.",
                  subtext: targetPass?.wardenReason ? `Reason: "${targetPass.wardenReason}"` : "Your outpass application was not approved. Scanner access is disabled.",
                  buttonLabel: "Start Camera Scanner",
                  buttonEnabled: false,
                  glow: false,
                  cardBorder: "border-rose-200 dark:border-rose-800",
                };
              } else if (scannerState === "EXPIRED_OR_CANCELLED") {
                cfg = {
                  icon: <AlertTriangle className="w-8 h-8 text-slate-400" />,
                  iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-400 ring-4 ring-slate-100 dark:ring-slate-800",
                  badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
                  badgeText: "PASS COMPLETED OR CANCELLED",
                  heading: "Pass Completed or Cancelled.",
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
                  subtext: "Camera scanner is active exclusively for your ENTRY / RETURN scan upon returning to campus.",
                  buttonLabel: "Start Camera for Return Scan",
                  buttonEnabled: true,
                  glow: false,
                  cardBorder: "border-cyan-200 dark:border-cyan-800",
                };
              }

              return (
                <Card className={cn("p-8 text-center space-y-4 border-2 transition-all duration-300", cfg.cardBorder)}>
                  <div className="flex justify-center">
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border", cfg.badgeClass)}>
                      {cfg.glow && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                      {cfg.badgeText}
                    </span>
                  </div>

                  <div className={cn("w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all", cfg.iconBg, cfg.glow && "scanner-glow-active")}>
                    {cfg.icon}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {cfg.heading}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      {cfg.subtext}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2.5 pt-2">
                    {cfg.buttonEnabled ? (
                      <button
                        type="button"
                        onClick={startScanner}
                        data-testid="enable-camera-button"
                        className={cn(
                          "inline-flex items-center justify-center flex-row gap-2 px-6 h-11 rounded-2xl text-white text-sm font-bold shadow-md transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2",
                          cfg.glow
                            ? "bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 shadow-emerald-600/30"
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
                  Please enable camera permission in your browser address bar settings to scan the Gate QR code.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button
                  type="button"
                  variant="primary"
                  onClick={startScanner}
                  className="h-10"
                  leftIcon={RefreshCw}
                >
                  Retry Camera
                </Button>
              </div>
            </Card>
          ) : permissionState === "NO_CAMERA" ? (
            <Card className="p-6 text-center space-y-4 border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">No Camera Detected</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No active video input device was found on this system. Please connect or enable a camera to scan.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button
                  type="button"
                  variant="primary"
                  onClick={startScanner}
                  className="h-10"
                  leftIcon={RefreshCw}
                >
                  Check Camera Again
                </Button>
              </div>
            </Card>
          ) : permissionState === "UNSUPPORTED" ? (
            <Card className="p-6 text-center space-y-4 border-amber-200 dark:border-amber-900/40">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Secure Context Required</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Web camera scanning requires HTTPS or localhost. Please access the application through a secure connection.
                </p>
              </div>
            </Card>
          ) : permissionState === "ERROR" ? (
            <Card className="p-6 text-center space-y-4 border-rose-200 dark:border-rose-900/40">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Camera Initialization Failed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Could not start video stream. Ensure no other application is using the camera and retry.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button
                  type="button"
                  variant="primary"
                  onClick={startScanner}
                  className="h-10"
                  leftIcon={RefreshCw}
                >
                  Retry Camera
                </Button>
              </div>
            </Card>
          ) : (
            /* LIVE SCANNER FRAME */
            <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800 aspect-square max-w-md mx-auto">
              {/* HTML5 QR Container */}
              <div id={CAMERA_CONTAINER_ID} className="w-full h-full object-cover" />

              {/* Viewfinder overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-xl" />

                  {/* Laser scanning line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-[bounce_2s_infinite]" />
                </div>

                <p className="absolute bottom-6 text-center text-xs font-medium text-white/90 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
                  Align Gate QR code within frame
                </p>
              </div>

              {/* Torch Toggle Button */}
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

          {/* Manual Fallback Code Entry Box */}
          {!pendingMovement && !scanResult && canAccessScanner && (
            <div className="pt-2">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md mx-auto shadow-sm">
                <div className="text-center space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                    Camera having trouble? Enter 6-character code:
                  </span>
                  <form onSubmit={handleManualSubmit} className="flex items-center gap-2 max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={12}
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 9F2A14"
                      className="flex-1 h-10 px-3 font-mono font-bold tracking-widest text-center uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="h-10 px-4 shrink-0 font-bold"
                      disabled={!manualCodeInput.trim() || isProcessing}
                    >
                      Verify
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
