"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

export function Switch({ checked = false, onChange, label, description, disabled = false, className = "" }) {
  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", disabled && "opacity-50 pointer-events-none", className)}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors duration-200 ease-in-out",
            checked ? "bg-primary-blue" : "bg-slate-300 dark:bg-slate-700"
          )}
        />
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-[#111936] dark:text-white">{label}</span>}
          {description && <span className="text-xs text-text-muted dark:text-slate-400">{description}</span>}
        </div>
      )}
    </label>
  );
}

export default Switch;
