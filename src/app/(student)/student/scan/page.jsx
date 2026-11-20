"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useMyActivePass } from "@/hooks/queries/usePasses.js";
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: activePass, isLoading: isPassLoading } = useMyActivePass(studentId);

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

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Initialize and start camera
  const startScanner = useCallback(async () => {
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

  // Dev simulation tool
  const runSimulation = async (scenario) => {
    setIsProcessing(true);
    await stopScanner();

    const mainGate = WORKFLOW_CONFIG.gates?.[0] || { id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 };
    const dateKey = getDateKey();
    const validQr = buildGateQrPayload(mainGate, dateKey);

    let location = { lat: mainGate.lat, lng: mainGate.lng, accuracy: 10 };
    let qr = validQr;

    if (scenario === "geofence_fail") {
      // 500m away
      location = { lat: 12.855, lng: 79.965, accuracy: 25 };
    } else if (scenario === "expired_qr") {
      qr = `DMIGATE1|MAIN|20240101|abc123|999999`;
    }

    const res = await gateService.processScan({
      studentId,
      qrText: qr,
      location,
      source: "student_scan",
    });

    if (res.ok) {
      setScanResult({ status: res.data.action, data: res.data });
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    } else {
      setScanResult({ status: "DENIED", code: res.code, message: res.message, details: res.details });
    }
    setIsProcessing(false);
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
        {activePass ? (
          <StatusChip status={activePass.status} size="sm" />
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
            No Active Pass
          </span>
        )}
      </div>

      {/* Desktop Informational Notice */}
      <div className="hidden md:flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-800 dark:text-indigo-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>Gate QR scanning works best on your mobile phone at the security post.</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setManualCodeModalOpen(true)}
          className="text-xs shrink-0 font-semibold h-7"
        >
          Enter Code Manually
        </Button>
      </div>

      {/* Pre-scan context card */}
      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-primary dark:text-indigo-400 flex-shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {activePass?.status === PASS_STATUSES.GATE_PASS_ISSUED
                ? "Ready for Gate EXIT"
                : activePass?.status === PASS_STATUSES.OUT
                ? "Currently OUT — Scan to RE-ENTER"
                : activePass?.status === PASS_STATUSES.OVERDUE
                ? "Pass OVERDUE — Scan to RE-ENTER"
                : "No approved pass ready for scanning"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {activePass ? `Pass #${activePass.passNumber || activePass.id}` : "Apply for a pass from the home tab"}
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
                <Button className="w-full h-11" variant="primary" onClick={handleResetScanner}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Scanning Again
                </Button>
                <Button
                  className="w-full h-11"
                  variant="outline"
                  onClick={() => setManualCodeModalOpen(true)}
                >
                  <Keyboard className="w-4 h-4 mr-2" /> Enter 6-Char Gate Code
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* CAMERA SCANNER VIEW */
        <div className="space-y-4">
          {permissionState === "PROMPT" ? (
            <Card className="p-8 text-center space-y-4 border-dashed border-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-primary dark:text-indigo-400 flex items-center justify-center">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Enable Camera to Scan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  We need camera access to scan the fixed Gate QR code at the security checkpoint.
                </p>
              </div>
              <Button className="w-full max-w-xs mx-auto h-11" variant="primary" onClick={startScanner}>
                <Camera className="w-4 h-4 mr-2" /> Enable Camera
              </Button>
            </Card>
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
                <Button variant="outline" className="h-10" onClick={startScanner}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry Camera
                </Button>
                <Button variant="primary" className="h-10" onClick={() => setManualCodeModalOpen(true)}>
                  <Keyboard className="w-4 h-4 mr-2" /> Enter 6-Char Code
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

      {/* Dev / Test Simulator Accordion */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
        <details className="text-xs text-slate-500 group">
          <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-400 hover:text-primary transition flex items-center gap-1.5 select-none">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Dev & QA Quick Scanner Simulation</span>
          </summary>
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">
              Test outcomes without a physical camera or gate poster:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={() => runSimulation("success_exit")}
              >
                Simulate EXIT
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={() => runSimulation("success_entry")}
              >
                Simulate ENTRY
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={() => runSimulation("geofence_fail")}
              >
                Simulate Far Away (Geofence)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={() => runSimulation("expired_qr")}
              >
                Simulate Expired QR
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
