"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-white dark:bg-[#0B133A]/90 border border-slate-200/90 dark:border-white/10 shadow-sm p-6 text-[#111936] dark:text-white transition-all duration-200",
        hover && "hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCard({ children, className = "", ...props }) {
  return (
    <div
      className={cn(
        "rounded-[32px] bg-white/80 dark:bg-[#090F2C]/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(5,10,50,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
