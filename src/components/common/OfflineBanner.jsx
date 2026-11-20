"use client";

import React from "react";
import { WifiOff, AlertCircle } from "lucide-react";
import { usePwa } from "@/hooks/usePwa.js";

export function OfflineBanner() {
  const { isOnline } = usePwa();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between select-none"
    >
      <div className="flex items-center gap-2.5 mx-auto">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <span>
          <strong>Offline Mode:</strong> Viewing cached records. Outpass submissions and physical gate scans are disabled until reconnected.
        </span>
      </div>
    </div>
  );
}

export default OfflineBanner;
