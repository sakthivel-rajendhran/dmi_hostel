"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function StatCard({
  icon: Icon,
  value,
  label,
  delta,
  deltaType = "increase", // 'increase' | 'decrease' | 'neutral'
  sparklineSlot,
  className = "",
  accentColor,
}) {
  const isPositive = deltaType === "increase";

  return (
    <div
      className={cn(
        "relative rounded-[28px] p-5 sm:p-6 bg-white dark:bg-[#0B133A]/90 border border-slate-200/90 dark:border-white/10 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-text-muted dark:text-slate-400">{label}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#111936] dark:text-white mt-1.5 tracking-tight font-mono tabular-nums">
            {value}
          </h3>
        </div>

        {Icon && (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{
              background: accentColor || "linear-gradient(135deg, #2438E8 0%, #6D28D9 100%)",
            }}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {(delta !== undefined || sparklineSlot) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          {delta && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {delta}
              </span>
              <span className="text-slate-400 text-[11px]">vs last week</span>
            </div>
          )}
          {sparklineSlot && <div className="ml-auto">{sparklineSlot}</div>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
