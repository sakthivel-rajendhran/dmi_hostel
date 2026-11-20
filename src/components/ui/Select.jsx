"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export const Select = forwardRef(({ label, error, helperText, options = [], className, id, children, ...props }, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-text-dark dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full h-11 px-4 pr-10 rounded-2xl bg-white dark:bg-slate-900 border text-sm font-medium text-[#111936] dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all duration-200 cursor-pointer",
            error ? "border-red-400 focus:ring-red-400" : "border-slate-200 dark:border-white/10",
            className
          )}
          {...props}
        >
          {children ||
            options.map((opt) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const lbl = typeof opt === "object" ? opt.label : opt;
              return (
                <option key={val} value={val} className="dark:bg-slate-900">
                  {lbl}
                </option>
              );
            })}
        </select>
        <div className="absolute right-3.5 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-text-muted dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = "Select";
export default Select;
