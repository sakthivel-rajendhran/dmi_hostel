"use client";

import React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export function LoadingScreen({ message = "Loading secure hostel system..." }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F3F5FF] dark:bg-[#070B24] p-6 text-center select-none transition-colors duration-300">
      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/80 dark:border-white/20 shadow-xl p-1 bg-white dark:bg-slate-900 mb-6 animate-pulse">
        <Image
          src="/images/dmi-foundations-logo.png"
          alt="DMI Foundations Logo"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="flex items-center gap-2.5 text-primary-blue dark:text-indigo-400 font-bold text-sm sm:text-base">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{message}</span>
      </div>

      <p className="text-xs text-text-muted dark:text-slate-500 mt-2">
        DMI College Hostel Management Authority
      </p>
    </div>
  );
}

export function Logo({ size = "md", showName = true, className = "" }) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-13 h-13",
  };

  return (
    <div className={`flex items-center gap-3 select-none flex-shrink-0 ${className}`}>
      <div className={`relative ${sizeMap[size]} rounded-full overflow-hidden border-2 border-white/90 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 flex-shrink-0 p-0.5`}>
        <Image
          src="/images/dmi-foundations-logo.png"
          alt="DMI Foundations Logo"
          fill
          className="object-contain"
          priority
        />
      </div>

      {showName && (
        <div className="flex flex-col leading-tight">
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#111936] dark:text-white">
            DMI College
          </span>
          <span className="text-[11px] font-semibold text-primary-blue dark:text-indigo-400 tracking-wide uppercase">
            Hostel Management
          </span>
        </div>
      )}
    </div>
  );
}

export default LoadingScreen;
