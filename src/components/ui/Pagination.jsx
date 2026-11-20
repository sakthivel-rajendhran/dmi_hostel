"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function Pagination({ page = 1, pageSize = 10, total = 0, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 text-xs sm:text-sm text-text-muted dark:text-slate-400">
      <p>
        Showing <span className="font-bold text-slate-800 dark:text-white">{(page - 1) * pageSize + 1}</span> to{" "}
        <span className="font-bold text-slate-800 dark:text-white">{Math.min(page * pageSize, total)}</span> of{" "}
        <span className="font-bold text-slate-800 dark:text-white">{total}</span> results
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange && onPageChange(page - 1)}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 font-bold text-slate-900 dark:text-white">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange && onPageChange(page + 1)}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function FilterChips({ options = [], selected, onChange, className = "" }) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar py-1", className)}>
      {options.map((opt) => {
        const val = typeof opt === "object" ? opt.value : opt;
        const label = typeof opt === "object" ? opt.label : opt;
        const isSelected = selected === val;

        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange && onChange(val)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
              isSelected
                ? "bg-primary-blue text-white border-primary-blue shadow-sm shadow-indigo-600/30"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default Pagination;
