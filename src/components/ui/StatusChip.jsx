"use client";

import React from "react";
import { getStatusConfig } from "@/config/status.js";
import { cn } from "@/lib/utils/cn.js";

/**
 * StatusChip
 * Standardized outpass status badge based on /config/status.js
 *
 * @param {object} props
 * @param {string} props.status - Status key
 * @param {string} [props.className]
 * @param {boolean} [props.showDot=true]
 */
export function StatusChip({ status, className = "", showDot = true }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 select-none",
        config.bgClass,
        config.borderClass,
        config.textClass,
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {config.hasPulsingDot && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dotClass)} />
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}

export { StatusChip as StatusBadge };
export default StatusChip;
