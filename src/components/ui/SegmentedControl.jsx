"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn.js";

export function SegmentedControl({
  options = [],
  value,
  onChange,
  layoutId = "segmented-pill",
  className = "",
  size = "md",
}) {
  const sizeClasses = {
    sm: "p-0.5 text-xs",
    md: "p-1 text-sm",
    lg: "p-1.5 text-base",
  };

  const itemPadding = {
    sm: "py-1 px-3",
    md: "py-2 px-4",
    lg: "py-2.5 px-5",
  };

  return (
    <div
      role="tablist"
      className={cn(
        "relative flex rounded-2xl bg-slate-100/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-inner transition-colors duration-300",
        sizeClasses[size],
        className
      )}
    >
      {options.map((opt) => {
        const optVal = typeof opt === "object" ? opt.value : opt;
        const optLabel = typeof opt === "object" ? opt.label : opt;
        const Icon = typeof opt === "object" && opt.icon ? opt.icon : null;
        const isSelected = value === optVal;

        return (
          <button
            key={optVal}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange && onChange(optVal)}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue",
              itemPadding[size],
              isSelected
                ? "text-white"
                : "text-text-muted hover:text-text-dark dark:text-slate-300 dark:hover:text-white"
            )}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span>{optLabel}</span>
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] shadow-md shadow-indigo-500/25 -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
