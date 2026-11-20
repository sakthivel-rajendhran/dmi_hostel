"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, UserCheck, Ban } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";
import { formatDateTime } from "@/lib/utils/format.js";

const ICON_MAP = {
  applied: Clock,
  recommended: UserCheck,
  approved: CheckCircle2,
  rejected: Ban,
  gate_pass_issued: ArrowRight,
  out: ArrowRight,
  returned: CheckCircle2,
  overdue: AlertTriangle,
  cancelled: Ban,
};

export function Timeline({ events = [], className = "" }) {
  if (!events || events.length === 0) return null;

  return (
    <div className={cn("relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10", className)}>
      {events.map((evt, idx) => {
        const Icon = ICON_MAP[evt.status] || CheckCircle2;
        const isLast = idx === events.length - 1;

        return (
          <div key={idx} className="relative group">
            {/* Timeline bullet icon */}
            <div
              className={cn(
                "absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-[#0B133A]",
                isLast ? "bg-primary-blue shadow-md shadow-indigo-600/40" : "bg-slate-400 dark:bg-slate-600"
              )}
            >
              <Icon className="w-3 h-3" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">{evt.label}</h5>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 font-mono">
                  {formatDateTime(evt.timestamp, "dd MMM, hh:mm a")}
                </span>
              </div>

              {evt.actor && (
                <p className="text-xs font-semibold text-primary-blue dark:text-indigo-400">
                  By: {evt.actor}
                </p>
              )}

              {evt.note && (
                <p className="text-xs text-text-muted dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 mt-1.5">
                  &ldquo;{evt.note}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Timeline;
