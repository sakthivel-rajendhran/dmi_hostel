"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact Stepper for Multi-Step Form Wizards
 * @param {Array<{ key: string, label: string, shortLabel?: string }>} steps
 * @param {number} currentStepIndex (0-based)
 * @param {Function} [onStepClick]
 */
export function Stepper({ steps, currentStepIndex, onStepClick, className = "" }) {
  return (
    <nav aria-label="Registration Progress" className={cn("w-full select-none", className)}>
      <ol className="flex items-center justify-between w-full relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isClickable = isCompleted && onStepClick;

          return (
            <li
              key={step.key || idx}
              className="flex-1 flex items-center relative"
              aria-current={isCurrent ? "step" : undefined}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                className={cn(
                  "flex items-center gap-1.5 focus:outline-none transition-all duration-200 z-10 group",
                  isClickable ? "cursor-pointer" : "cursor-default",
                  "text-left"
                )}
              >
                {/* Step Circle / Check */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 flex-shrink-0 shadow-sm",
                    isCompleted
                      ? "bg-emerald-600 text-white group-hover:bg-emerald-700"
                      : isCurrent
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white ring-2 ring-indigo-200 dark:ring-indigo-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    "text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors duration-150",
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : isCompleted
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel || step.label}</span>
                </span>
              </button>

              {/* Connecting bar to next step */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-[2px] mx-1.5 transition-colors duration-200",
                    idx < currentStepIndex
                      ? "bg-emerald-500/80 dark:bg-emerald-600"
                      : "bg-slate-200 dark:bg-slate-700/60"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
