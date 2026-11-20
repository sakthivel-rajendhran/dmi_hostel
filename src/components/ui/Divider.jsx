"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

export function Divider({ label, className = "" }) {
  if (!label) {
    return <div className={cn("h-px w-full bg-slate-200/80 dark:bg-white/10 my-4", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-3 my-4", className)}>
      <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">{label}</span>
      <div className="flex-1 h-px bg-slate-200/80 dark:bg-white/10" />
    </div>
  );
}

export function KeyValue({ items = [], columns = 2, className = "" }) {
  const colClass = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <dl className={cn("grid gap-4", colClass, className)}>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <dt className="text-xs font-semibold text-text-muted dark:text-slate-400">{item.label}</dt>
          <dd className="text-sm font-bold text-[#111936] dark:text-white">
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Stepper({ steps = [], currentStep = 1, className = "" }) {
  return (
    <div className={cn("flex items-center justify-between w-full my-4", className)}>
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-primary-blue text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-white/10"
                )}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold text-center whitespace-nowrap",
                  isCurrent ? "text-primary-blue dark:text-indigo-400" : "text-slate-400"
                )}
              >
                {step.label || step}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 mb-4 transition-colors",
                  stepNum < currentStep ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Divider;
