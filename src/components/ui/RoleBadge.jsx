"use client";

import React from "react";
import { ROLE_CONFIG } from "@/config/roles.js";
import { cn } from "@/lib/utils/cn.js";

const ROLE_ACCENT_STYLES = {
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  "gold-navy": "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border-amber-300 dark:border-amber-700",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

export function RoleBadge({ role, className = "" }) {
  const config = ROLE_CONFIG[role] || { label: role, accent: "indigo" };
  const accentStyle = ROLE_ACCENT_STYLES[config.accent] || ROLE_ACCENT_STYLES.indigo;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border tracking-wide select-none",
        accentStyle,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{config.label}</span>
    </span>
  );
}

export default RoleBadge;
