"use client";

import React, { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export const Checkbox = forwardRef(({ label, description, className, id, checked, onChange, ...props }, ref) => {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label htmlFor={checkboxId} className="flex items-start gap-2.5 cursor-pointer select-none group">
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 transition-all duration-200 peer-checked:bg-primary-blue peer-checked:border-primary-blue peer-focus-visible:ring-2 peer-focus-visible:ring-primary-blue flex items-center justify-center text-white",
            className
          )}
        >
          <Check className="w-3.5 h-3.5 stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-[#111936] dark:text-slate-200">{label}</span>}
          {description && <span className="text-xs text-text-muted dark:text-slate-400">{description}</span>}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = "Checkbox";
export default Checkbox;
