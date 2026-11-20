"use client";

import React from "react";
import { cn } from "@/lib/utils/cn.js";

/**
 * SoftBackground
 * Clean, lightweight background for app shells.
 * When used as a standalone overlay (no children), renders only the fixed ambient backdrop.
 * When passed children, wraps them in a styled container.
 */
export function SoftBackground({ children, className = "" }) {
  const ambience = (
    <div className={cn("fixed inset-0 pointer-events-none overflow-hidden -z-10", !children && className)} aria-hidden="true">
      {/* Top-Right Soft Indigo Blob */}
      <div className="absolute -top-[15%] -right-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-400/15 via-blue-400/10 to-transparent dark:from-indigo-600/15 dark:via-blue-600/10 blur-3xl opacity-80" />

      {/* Bottom-Left Soft Violet Blob */}
      <div className="absolute -bottom-[15%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-400/15 via-purple-400/10 to-transparent dark:from-violet-700/15 dark:via-purple-900/10 blur-3xl opacity-80" />

      {/* Subtle Dot Grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="dot-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-slate-900 dark:text-white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
      </svg>
    </div>
  );

  if (!children) {
    return ambience;
  }

  return (
    <div className={`relative min-h-screen w-full bg-[#F3F5FF] dark:bg-[#070B24] transition-colors duration-300 ${className}`}>
      {ambience}
      {children}
    </div>
  );
}

export default SoftBackground;
