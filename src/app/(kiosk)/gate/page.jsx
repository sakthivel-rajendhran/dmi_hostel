"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useSafeSearchParams } from "@/hooks/useSafeSearchParams.js";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { KioskShell } from "@/components/layout/KioskShell.jsx";
import { gateService } from "@/lib/services/gateService.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

export default function GateDisplayPage() {
  const searchParams = useSafeSearchParams();
  const gateParam = (searchParams.get("gate") || "MAIN").toUpperCase();

  const [gateQrData, setGateQrData] = useState(null);
  const [status, setStatus] = useState("REFRESHING"); // 'ACTIVE' | 'REFRESHING' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate" }];
  const activeGate = gates.find((g) => g.id.toUpperCase() === gateParam) || {
    id: "MAIN",
    name: "Main Campus Gate",
  };

  const isFetchingRef = useRef(false);

  const fetchToken = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setStatus("REFRESHING");

    try {
      const res = await gateService.getGateQr(activeGate.id);
      if (res.ok && res.data?.payload) {
        setGateQrData(res.data);
        setStatus("ACTIVE");
        setErrorMessage("");

        // Calculate exact remaining seconds until server expiry
        if (res.data.expiresAt) {
          const expMs = new Date(res.data.expiresAt).getTime();
          const remaining = Math.max(5, Math.round((expMs - Date.now()) / 1000));
          setSecondsRemaining(remaining);
        } else {
          setSecondsRemaining(45);
        }
      } else {
        setStatus("ERROR");
        setErrorMessage(res.message || "Failed to generate dynamic gate QR.");
      }
    } catch (err) {
      console.warn("[GateDisplay] Connection error:", err);
      setStatus("ERROR");
      setErrorMessage("Checkpoint server connection error. Retrying...");
    } finally {
      isFetchingRef.current = false;
    }
  }, [activeGate.id]);

  // Initial load
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Countdown timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchToken]);

  return (
    <KioskShell gateName={activeGate.name}>
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center space-y-5 animate-scale-in">
        {/* Header Badges */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>DMI College of Engineering &bull; Official Gate Checkpoint</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            MAIN GATE &bull; SCAN TO EXIT / ENTER
          </h1>

          {/* Status and Countdown Pill */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                status === "ACTIVE"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : status === "REFRESHING"
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "ACTIVE"
                    ? "bg-emerald-400 animate-pulse"
                    : status === "REFRESHING"
                    ? "bg-amber-400 animate-spin"
                    : "bg-rose-400"
                }`}
              />
              <span>{status}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Rotates in: {secondsRemaining}s</span>
            </div>
          </div>
        </div>

        {/* High-Contrast Dynamic QR Code Display */}
        <div className="p-7 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/40 relative min-w-[340px] min-h-[340px] flex items-center justify-center">
          {status === "ERROR" ? (
            <div className="p-6 text-center space-y-3 max-w-xs">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800">Connection Error</div>
              <p className="text-xs text-slate-600">{errorMessage}</p>
              <button
                onClick={fetchToken}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Now
              </button>
            </div>
          ) : gateQrData?.qrDataUrl ? (
            <img
              src={gateQrData.qrDataUrl}
              alt="Dynamic Gate QR"
              className="w-[320px] h-[320px] object-contain select-none"
            />
          ) : gateQrData?.payload ? (
            <QRCodeSVG
              value={gateQrData.payload}
              size={320}
              level="H"
              marginSize={2}
            />
          ) : (
            <div className="w-80 h-80 flex flex-col items-center justify-center text-slate-700 font-mono text-sm gap-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span>Generating Secure Gate QR...</span>
            </div>
          )}
        </div>

        {/* Dynamic Nonce / Code */}
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl w-full max-w-md shadow-inner">
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
            Rotating Checkpoint Code
          </span>
          <div className="font-mono text-3xl font-black text-amber-400 tracking-widest mt-0.5 uppercase">
            {gateQrData?.nonce || "------"}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Cryptographically signed &bull; Refreshes every 45s
          </span>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xl text-left text-xs">
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-indigo-400 font-bold block mb-1">Step 1</span>
            <p className="text-slate-300">Open DMI Student Portal and tap <strong>Scan Gate QR</strong>.</p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-indigo-400 font-bold block mb-1">Step 2</span>
            <p className="text-slate-300">Point rear camera at this screen or enter the 6-character code.</p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-indigo-400 font-bold block mb-1">Step 3</span>
            <p className="text-slate-300">Confirm OUT or IN movement to complete gate verification.</p>
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
