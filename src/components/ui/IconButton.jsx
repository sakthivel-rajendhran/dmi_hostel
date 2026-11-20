"use client";

import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/cn.js";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.95]",
  {
    variants: {
      variant: {
        primary: "bg-primary-blue text-white shadow-sm hover:brightness-105 focus-visible:ring-primary-blue",
        secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700",
        ghost: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white",
        outline: "border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
      },
      size: {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export const IconButton = forwardRef(({ className, variant, size, icon: Icon, children, ...props }, ref) => {
  return (
    <button ref={ref} className={cn(iconButtonVariants({ variant, size }), className)} {...props}>
      {Icon ? <Icon className="w-5 h-5 flex-shrink-0" /> : children}
    </button>
  );
});

IconButton.displayName = "IconButton";
export default IconButton;
