"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, RefreshCw, Ticket, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
        {/* Emblem & Offline Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 animate-ping opacity-60" />
          <div className="relative w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
            <WifiOff className="w-8 h-8" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            You Are Offline
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The DMI College Portal cannot reach the campus network. Please verify your mobile data or campus Wi-Fi connection.
          </p>
        </div>

        {/* Gate Movement Anti-Fraud Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 text-left flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Gate Scan Notice:</p>
            <p>
              Gate QR scans cannot be queued offline to prevent curfew timestamp drift. If you have no signal at the gate, request a manual entry from the Warden on duty.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Button
            variant="primary"
            size="lg"
            leftIcon={RefreshCw}
            isLoading={isRetrying}
            onClick={handleRetry}
            className="w-full font-bold shadow-md shadow-indigo-600/20"
          >
            Try Reconnecting
          </Button>

          <Link href="/student/passes" className="block w-full">
            <Button
              variant="outline"
              size="md"
              leftIcon={Ticket}
              className="w-full"
            >
              View Cached Passes
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <Image
          src="/images/dmi-foundations-logo.png"
          alt="DMI"
          width={20}
          height={20}
          className="opacity-60"
        />
        <span>DMI College of Engineering • Offline Cache Mode</span>
      </div>
    </div>
  );
}
