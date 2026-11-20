"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

const VARIANT_MAP = {
  default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
  primary: "bg-indigo-50 text-primary-blue dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60",
  success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  danger: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
  info: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
};

export function Badge({ children, variant = "default", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none",
        VARIANT_MAP[variant] || VARIANT_MAP.default,
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
