"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function QrPlaceholder({
  value = "DMI-GATE-PASS-SAMPLE",
  size = 180,
  label = "Scan at Security Kiosk",
  className = "",
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-lg text-center space-y-3", className)}>
      <div className="p-3 rounded-2xl bg-white shadow-inner border border-slate-100">
        <QRCodeSVG value={value} size={size} level="H" includeMargin={false} />
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Encrypted Pass Token</span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono select-all">{value}</p>
      </div>

      {label && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
}

export default QrPlaceholder;
