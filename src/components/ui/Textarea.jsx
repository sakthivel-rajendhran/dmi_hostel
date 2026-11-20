"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils/cn.js";

export const Textarea = forwardRef(({ label, error, helperText, className, id, ...props }, ref) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-text-dark dark:text-slate-200">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full min-h-[90px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border text-sm font-medium text-[#111936] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all duration-200 resize-y",
          error ? "border-red-400 focus:ring-red-400" : "border-slate-200 dark:border-white/10",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-text-muted dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = "Textarea";
export default Textarea;
