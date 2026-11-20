"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

/**
 * KioskResultOverlay
 * Provides fullscreen ambient feedback during gate scanning.
 * State: "idle" | "success" | "denied"
 */
export function KioskResultOverlay({ state = "idle", resultData = null, onClear }) {
  if (state === "idle") return null;

  const isSuccess = state === "success";

  return (
    <div
      onClick={onClear}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-white cursor-pointer transition-all duration-300 backdrop-blur-md",
        isSuccess
          ? "bg-emerald-600/95 dark:bg-emerald-700/95 animate-fade-in"
          : "bg-rose-600/95 dark:bg-rose-700/95 animate-shake"
      )}
    >
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
        <div
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center shadow-2xl animate-scale-in",
            isSuccess ? "bg-white text-emerald-600" : "bg-white text-rose-600"
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-20 h-20" />
          ) : (
            <XCircle className="w-20 h-20" />
          )}
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
            {isSuccess ? "PASS APPROVED" : "ACCESS DENIED"}
          </h1>
          <p className="text-lg opacity-90 font-medium">
            {isSuccess
              ? "Gate clearance verified successfully. Student movement logged."
              : resultData?.message || "Invalid QR code, expired pass, or unapproved movement."}
          </p>
        </div>

        {resultData && (
          <div className="w-full bg-black/20 rounded-2xl p-5 text-left border border-white/20 backdrop-blur-sm space-y-2">
            <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
              <span className="opacity-75">Student Name:</span>
              <span className="font-bold text-base">{resultData.studentName || "Rahul Kumar"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
              <span className="opacity-75">Student ID:</span>
              <span className="font-mono font-bold">{resultData.studentId || "CSE-3-001"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
              <span className="opacity-75">Movement Type:</span>
              <span className="font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                {resultData.movementType || "EXIT"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="opacity-75">Pass ID:</span>
              <span className="font-mono">{resultData.passId || "DMI-2026-0042"}</span>
            </div>
          </div>
        )}

        <span className="text-xs uppercase tracking-widest opacity-75 animate-pulse mt-4">
          Tap anywhere or wait to continue
        </span>
      </div>
    </div>
  );
}

export default KioskResultOverlay;
