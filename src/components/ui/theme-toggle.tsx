"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`w-[84px] h-[38px] rounded-full bg-white/10 backdrop-blur-md ${className}`} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div
      role="radiogroup"
      aria-label="Color theme selection"
      className={`relative inline-flex items-center p-1 rounded-full bg-white/20 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg select-none transition-all duration-300 ${className}`}
    >
      {/* Light Button */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        aria-label="Switch to light mode"
        title="Light Mode"
        onClick={() => setTheme("light")}
        className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white transition-colors duration-200 focus:outline-none"
      >
        <Sun className={`w-4 h-4 transition-transform duration-300 ${!isDark ? "scale-110 text-white" : "text-white/70 hover:text-white"}`} />
        {!isDark && (
          <motion.div
            layoutId="activeThemePill"
            className="absolute inset-0 bg-primary-blue rounded-full shadow-md -z-10"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          />
        )}
      </button>

      {/* Dark Button */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        aria-label="Switch to dark mode"
        title="Dark Mode"
        onClick={() => setTheme("dark")}
        className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white transition-colors duration-200 focus:outline-none"
      >
        <Moon className={`w-4 h-4 transition-transform duration-300 ${isDark ? "scale-110 text-white" : "text-white/70 hover:text-white"}`} />
        {isDark && (
          <motion.div
            layoutId="activeThemePill"
            className="absolute inset-0 bg-[#2B2FE0] rounded-full shadow-md -z-10"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          />
        )}
      </button>
    </div>
  );
}
