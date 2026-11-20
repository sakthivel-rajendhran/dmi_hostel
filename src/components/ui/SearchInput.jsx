"use client";

import React, { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export const SearchInput = forwardRef(
  ({ value = "", onChange, onClear, placeholder = "Search...", className, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-9 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-transparent dark:border-white/5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
export default SearchInput;
