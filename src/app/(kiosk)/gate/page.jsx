"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { KioskShell } from "@/components/layout/KioskShell.jsx";
import { gateService } from "@/lib/services/gateService.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

export default function GateDisplayPage() {
  const searchParams = useSearchParams();
  const gateParam = searchParams.get("gate") || "MAIN";

  const [gateQrData, setGateQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 }];
  const activeGate = gates.find((g) => g.id === gateParam) || gates[0];

  const fetchToken = async () => {
    try {
      const res = await gateService.getGateQr(activeGate.id);
      if (res.ok) {
        setGateQrData(res.data);
      }
    } catch (e) {
      console.warn("Error fetching gate QR:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    // Refresh every 30 seconds to catch daily rotation or warden override
    const timer = setInterval(fetchToken, 30000);
    return () => clearInterval(timer);
  }, [activeGate.id]);

  return (
    <KioskShell gateName={activeGate.name}>
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center space-y-6 animate-scale-in">
        {/* Banner */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital Gate Checkpoint &bull; {activeGate.name}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mt-1">
            SCAN HERE TO EXIT / ENTER
          </h1>
          <p className="text-sm text-slate-400">
            Hold your mobile camera up to the QR code below
          </p>
        </div>

        {/* Big High-Contrast QR Code Display */}
        <div className="p-7 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/40 relative">
          {gateQrData?.payload ? (
            <QRCodeSVG
              value={gateQrData.payload}
              size={320}
              level="H"
              marginSize={2}
            />
          ) : (
            <div className="w-80 h-80 flex items-center justify-center text-slate-800 font-mono text-sm">
              Loading Gate QR...
            </div>
          )}
        </div>

        {/* 6-Character Fallback Code */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl w-full max-w-md shadow-inner">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
            Manual 6-Character Gate Code
          </span>
          <div className="font-mono text-4xl font-black text-amber-400 tracking-widest mt-1 uppercase">
            {gateQrData?.nonce || "------"}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Enter this code in your app if camera scan fails
          </span>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xl text-left text-xs">
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-primary font-bold block mb-1">Step 1</span>
            <p className="text-slate-300">Open DMI Hostel app and tap center <strong>Scan</strong>.</p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-primary font-bold block mb-1">Step 2</span>
            <p className="text-slate-300">Point camera at this screen or enter the 6-char code.</p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl">
            <span className="text-primary font-bold block mb-1">Step 3</span>
            <p className="text-slate-300">Show the green ticking verification screen to Guard.</p>
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
