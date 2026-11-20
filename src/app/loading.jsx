"use client";

import React from "react";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-md mb-4 animate-pulse">
        <Image
          src="/images/dmi-foundations-logo.png"
          alt="DMI Loading"
          fill
          className="object-cover"
        />
      </div>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-text-muted dark:text-slate-400 tracking-wide uppercase">
        Loading DMI Hostel Portal...
      </p>
    </div>
  );
}
