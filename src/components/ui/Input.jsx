"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils/cn.js";

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconLeft,
      leftIcon,
      iconRight,
      rightIcon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const ResolvedLeft = icon || iconLeft || leftIcon;
    const ResolvedRight = iconRight || rightIcon;

    const renderIcon = (iconItem) => {
      if (!iconItem) return null;
      if (React.isValidElement(iconItem)) return iconItem;
      const IconComponent = iconItem;
      return <IconComponent className="w-4 h-4" />;
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-dark dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {ResolvedLeft && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              {renderIcon(ResolvedLeft)}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-11 rounded-2xl bg-white dark:bg-slate-900 border text-sm font-medium text-[#111936] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent",
              ResolvedLeft ? "pl-10" : "pl-4",
              ResolvedRight ? "pr-10" : "pr-4",
              error
                ? "border-red-400 focus:ring-red-400"
                : "border-slate-200 dark:border-white/10 focus:ring-primary-blue",
              className
            )}
            {...props}
          />
          {ResolvedRight && (
            <div className="absolute right-3.5 text-slate-400">
              {renderIcon(ResolvedRight)}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-muted dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
