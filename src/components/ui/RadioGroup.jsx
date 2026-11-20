"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

export function RadioGroup({ value, onChange, options = [], name, className = "" }) {
  return (
    <div className={cn("space-y-2", className)} role="radiogroup">
      {options.map((option) => {
        const optVal = typeof option === "object" ? option.value : option;
        const optLabel = typeof option === "object" ? option.label : option;
        const isChecked = value === optVal;

        return (
          <label key={optVal} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
            <input
              type="radio"
              name={name}
              value={optVal}
              checked={isChecked}
              onChange={() => onChange && onChange(optVal)}
              className="sr-only"
            />
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                isChecked ? "border-primary-blue" : "border-slate-300 dark:border-slate-600"
              )}
            >
              {isChecked && <div className="w-2.5 h-2.5 rounded-full bg-primary-blue" />}
            </div>
            <span className="text-sm font-medium text-[#111936] dark:text-white">{optLabel}</span>
          </label>
        );
      })}
    </div>
  );
}

export default RadioGroup;
