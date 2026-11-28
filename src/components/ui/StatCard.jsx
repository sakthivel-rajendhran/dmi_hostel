"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

const VARIANT_GRADIENTS = {
  default: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
  teal: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
  blue: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
  indigo: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  violet: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  purple: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
  rose: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
  amber: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
};

export function StatCard({
  icon: Icon,
  value,
  label,
  title,
  subtitle,
  variant = "default",
  delta,
  deltaType = "increase", // 'increase' | 'decrease' | 'neutral'
  sparklineSlot,
  className = "",
  accentColor,
  onClick,
}) {
  const isPositive = deltaType === "increase";
  const displayLabel = label || title;
  const bgGradient = accentColor || VARIANT_GRADIENTS[variant] || VARIANT_GRADIENTS.default;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl p-4 sm:p-4.5 bg-white dark:bg-[#0B133A]/90 border border-slate-200/90 dark:border-white/10 shadow-2xs transition-all duration-200 hover:shadow-xs",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{displayLabel}</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#111936] dark:text-white mt-1 tracking-tight font-mono tabular-nums">
            {value}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-medium">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
            style={{
              background: bgGradient,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(delta !== undefined || sparklineSlot) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
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
              <span className="text-slate-400 text-[10px]">vs last week</span>
            </div>
          )}
          {sparklineSlot && <div className="ml-auto">{sparklineSlot}</div>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
