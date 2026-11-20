"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wrench,
  X,
  ChevronUp,
  RefreshCw,
  Zap,
  Shield,
  User,
  Users,
  GraduationCap,
  Building,
  Eye,
  Sliders,
  ExternalLink,
  FastForward,
  Ticket,
  QrCode,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { authService } from "@/lib/services/authService.js";
import { passService } from "@/lib/services/passService.js";
import { gateService } from "@/lib/services/gateService.js";
import { settingsService } from "@/lib/services/settingsService.js";
import { ROLES, ROLE_CONFIG, getHomeRoute } from "@/config/roles.js";
import { PASS_STATUSES } from "@/config/status.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { buildGateQrPayload, getDateKey } from "@/lib/utils/gateQr.js";
import { queryKeys } from "@/hooks/queries/queryKeys.js";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { usePolicy } from "@/hooks/usePolicy.js";

export function DevPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const { policy, setRoomAllocationMode, setPhotoPolicy } = usePolicy();

  const [isOpen, setIsOpen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [latencyEnabled, setLatencyEnabled] = useState(true);
  const [selectedPassId, setSelectedPassId] = useState("DMI-PASS-2026-0004");
  const [targetStatus, setTargetStatus] = useState(PASS_STATUSES.OUT);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Gate Scan Simulation State
  const [fakeLocationInside, setFakeLocationInside] = useState(true);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);

  // Read window dimensions & latency pref
  useEffect(() => {
    function handleResize() {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);

      const savedLatency = localStorage.getItem("dmi_mock_latency_enabled");
      setLatencyEnabled(savedLatency !== "false");
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const handleRoleSwitch = (targetRole) => {
    const session = authService.switchRoleInstantly(targetRole);
    if (session) {
      refreshSession();
      queryClient.clear();
      const targetRoute = getHomeRoute(targetRole);
      toast.success(`Switched role to ${ROLE_CONFIG[targetRole]?.label || targetRole}`);
      router.push(targetRoute);
    }
  };

  const handleToggleLatency = () => {
    const next = !latencyEnabled;
    setLatencyEnabled(next);
    localStorage.setItem("dmi_mock_latency_enabled", String(next));
    toast.info(`Simulated latency ${next ? "Enabled (400-800ms)" : "Disabled (0ms)"}`);
  };

  const handleResetData = async () => {
    await settingsService.resetDemoData();
    queryClient.clear();
    toast.success("Mock database reset to original deterministic factory state!");
    window.location.reload();
  };

  // Advance Pass Status Handler
  const handleAdvancePass = async () => {
    setIsAdvancing(true);
    try {
      const res = await passService.advancePassStatus(selectedPassId, targetStatus);
      if (res.ok) {
        toast.success(`Pass ${selectedPassId} advanced to ${targetStatus}!`);
        queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
      } else {
        toast.error(res.message || "Failed to advance pass status.");
      }
    } catch (e) {
      toast.error("Error updating pass status.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // Quick Rotate Gate QR
  const handleRotateGateQr = async () => {
    try {
      const res = await gateService.rotateGateQr("MAIN");
      if (res.ok) {
        toast.success(`Rotated Gate QR! New Code: ${res.data.nonce.toUpperCase()}`);
        queryClient.invalidateQueries();
      }
    } catch (e) {
      toast.error("Rotate error.");
    }
  };

  // Quick Simulate Gate Scan for active student
  const handleSimulateGateScan = async (actionType = "AUTO") => {
    setIsSimulatingScan(true);
    try {
      const studentId = user?.studentId || "CSE-3-001";
      const gate = WORKFLOW_CONFIG.gates?.[0] || { id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 };
      const qrPayload = buildGateQrPayload(gate, getDateKey());

      const location = fakeLocationInside
        ? { lat: gate.lat, lng: gate.lng, accuracy: 10 }
        : { lat: 12.92, lng: 80.05, accuracy: 50 }; // far away outside 150m geofence

      const res = await gateService.processScan({
        studentId,
        qrText: qrPayload,
        location,
        source: "student_scan",
      });

      if (res.ok) {
        toast.success(`Gate scan verified: ${res.data.action} logged at ${gate.name}!`);
        queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      } else {
        toast.error(`Scan rejected: ${res.message}`);
      }
    } catch (e) {
      toast.error("Simulation error.");
    } finally {
      setIsSimulatingScan(false);
    }
  };

  // Exactly 6 Discrete Roles (Gate role removed)
  const allRoles = [
    { key: ROLES.STUDENT, label: "Student", icon: GraduationCap, color: "text-indigo-400" },
    { key: ROLES.WARDEN, label: "Warden", icon: Shield, color: "text-blue-500" },
    { key: ROLES.STAFF, label: "Staff", icon: Users, color: "text-teal-400" },
    { key: ROLES.HOD, label: "HOD", icon: Building, color: "text-purple-400" },
    { key: ROLES.PRINCIPAL, label: "Principal", icon: Eye, color: "text-amber-500" },
    { key: ROLES.CORRESPONDENT, label: "Correspondent", icon: Eye, color: "text-amber-600" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Dev Panel"
        className="fixed bottom-3 left-3 z-[999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white dark:bg-white/90 dark:text-slate-950 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md text-xs font-semibold hover:scale-105 transition-all duration-200 group"
      >
        <Wrench className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
        <span>Dev: {user?.role || "guest"}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-600">
          {viewportSize.width}x{viewportSize.height}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[999] w-[350px] max-w-[calc(100vw-24px)] max-h-[85vh] overflow-y-auto bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl p-4 flex flex-col gap-3.5 animate-scale-in text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight text-white">DMI Dev Control</h4>
            <span className="text-[10px] text-slate-400">Gate QR & Pass Simulator</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active User Status & Dimensions */}
      <div className="bg-slate-800/60 rounded-xl p-2.5 flex items-center justify-between border border-slate-700/50">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Active Session
          </div>
          <div className="font-bold text-slate-200 truncate">
            {user?.name || "Guest User"} ({user?.studentId || user?.role || "student"})
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Viewport
          </div>
          <div className="font-mono text-[11px] text-amber-400 font-semibold">
            {viewportSize.width} &times; {viewportSize.height}
          </div>
        </div>
      </div>

      {/* Gate QR Simulator Section */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-emerald-500/30 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-300">
          <span className="flex items-center gap-1">
            <QrCode className="w-3 h-3 text-emerald-400" />
            Gate QR & Geofence Simulator
          </span>
          <button
            type="button"
            onClick={handleRotateGateQr}
            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Rotate QR
          </button>
        </div>

        {/* Location Toggle */}
        <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
          <span className="text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Fake GPS Location:
          </span>
          <button
            type="button"
            onClick={() => setFakeLocationInside(!fakeLocationInside)}
            className={`px-2 py-0.5 rounded font-bold transition text-[10px] ${
              fakeLocationInside
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-red-500/20 text-red-300 border border-red-500/40"
            }`}
          >
            {fakeLocationInside ? "Inside Gate (0m)" : "Far Outside (12km)"}
          </button>
        </div>

        {/* Trigger Scan Button */}
        <button
          type="button"
          onClick={() => handleSimulateGateScan()}
          disabled={isSimulatingScan}
          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{isSimulatingScan ? "Processing..." : "Simulate Gate Scan for Active Student"}</span>
        </button>
      </div>

      {/* Pass Status Advance Tool */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-indigo-300">
          <span className="flex items-center gap-1">
            <FastForward className="w-3 h-3 text-indigo-400" />
            Advance Pass Status
          </span>
          <span className="text-slate-400">Live Sync</span>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Select Pass:</span>
              <select
                value={selectedPassId}
                onChange={(e) => setSelectedPassId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-[11px] text-white focus:outline-none"
              >
                <option value="DMI-PASS-2026-0001">0001 (Pending)</option>
                <option value="DMI-PASS-2026-0002">0002 (Recommended)</option>
                <option value="DMI-PASS-2026-0003">0003 (Approved)</option>
                <option value="DMI-PASS-2026-0004">0004 (Gate Pass)</option>
                <option value="DMI-PASS-2026-0005">0005 (Out)</option>
                <option value="DMI-PASS-2026-0006">0006 (Overdue)</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Next Status:</span>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-[11px] text-white focus:outline-none"
              >
                <option value={PASS_STATUSES.APPROVED}>Approved</option>
                <option value={PASS_STATUSES.GATE_PASS_ISSUED}>Gate Pass Issued</option>
                <option value={PASS_STATUSES.OUT}>Out (Exited Gate)</option>
                <option value={PASS_STATUSES.RETURNED}>Returned (Closed)</option>
                <option value={PASS_STATUSES.OVERDUE}>Overdue</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdvancePass}
            disabled={isAdvancing}
            className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{isAdvancing ? "Updating..." : `Advance to ${targetStatus}`}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Role Switcher (6 Discrete Roles) */}
      <div>
        <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Switch Role (1-Click)</span>
          <span className="text-emerald-400">6 Discrete Roles</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {allRoles.map((r) => {
            const Icon = r.icon;
            const isCurrent = user?.role === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRoleSwitch(r.key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition font-medium text-xs ${
                  isCurrent
                    ? "bg-primary text-white font-bold ring-1 ring-white/30"
                    : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-none ${r.color}`} />
                <span className="truncate">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Policy Switches (Floor Allocation & Photo Policy) */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-purple-500/30 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-purple-300">
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-purple-400" />
            Operational Policy Switches
          </span>
          <span className="text-slate-400 font-mono text-[9px]">Reactive</span>
        </div>

        {/* Room Allocation Mode Switch */}
        <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
          <div className="flex flex-col">
            <span className="text-slate-300 font-semibold">Room Allocation</span>
            <span className="text-[9px] text-slate-500">Sign-up wizard behavior</span>
          </div>
          <button
            type="button"
            onClick={() =>
              setRoomAllocationMode(
                policy.roomAllocationMode === "student_enters" ? "warden_allocates" : "student_enters"
              )
            }
            className={`px-2 py-0.5 rounded font-bold transition text-[10px] ${
              policy.roomAllocationMode === "student_enters"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}
          >
            {policy.roomAllocationMode === "student_enters" ? "Student Enters" : "Warden Allocates"}
          </button>
        </div>

        {/* Photo Policy Switch */}
        <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
          <div className="flex flex-col">
            <span className="text-slate-300 font-semibold">Photo Policy</span>
            <span className="text-[9px] text-slate-500">Storage limit ≤1 MB</span>
          </div>
          <button
            type="button"
            onClick={() =>
              setPhotoPolicy(policy.photoPolicy === "auto_compress" ? "reject" : "auto_compress")
            }
            className={`px-2 py-0.5 rounded font-bold transition text-[10px] ${
              policy.photoPolicy === "auto_compress"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
            }`}
          >
            {policy.photoPolicy === "auto_compress" ? "Auto-Compress (≤15MB)" : "Strict Reject (>1MB)"}
          </button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-xs flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Latency</span>
          </span>
          <button
            onClick={handleToggleLatency}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition ${
              latencyEnabled
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {latencyEnabled ? "150-400ms" : "OFF (0ms)"}
          </button>
        </div>

        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Mock Data (Deterministic)</span>
        </button>
      </div>

      {/* Quick Navigation Links */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
        <button
          onClick={() => router.push("/student/scan")}
          className="text-emerald-400 hover:text-white transition flex items-center gap-1 font-semibold"
        >
          <span>&larr; Gate Scanner</span>
        </button>
        <button
          onClick={() => router.push("/warden/gate-qr")}
          className="text-primary-light hover:text-white transition flex items-center gap-1 font-semibold text-indigo-400"
        >
          <span>Warden Poster &rarr;</span>
        </button>
      </div>
    </div>
  );
}

export default DevPanel;
