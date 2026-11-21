"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GREETING_CARD_CONFIG, getTimePeriodData } from "@/config/greetingCard";

/**
 * Premium nature-inspired student greeting card with dynamic time-based greetings,
 * Playfair Display typography, and responsive high-contrast layout.
 *
 * @param {Object} props
 * @param {Object} [props.profile] - Student profile data
 * @param {Object} [props.user] - Authenticated user object
 * @param {Object} [props.campusStatus] - Current student status object ({ label, variant, dotClass })
 * @param {string} [props.overridePeriod] - Optional test override ('morning' | 'afternoon' | 'evening' | 'night')
 */
export default function StudentGreetingCard({
  profile,
  user,
  campusStatus,
  overridePeriod,
}) {
  const [timeData, setTimeData] = useState(() =>
    getTimePeriodData(new Date(), overridePeriod)
  );

  // Dynamic device clock tracker: checks every 15 seconds
  useEffect(() => {
    const updateTime = () => {
      // Also allow URL query override for quick visual verification (e.g. ?timePeriod=afternoon)
      let urlOverride = overridePeriod;
      if (!urlOverride && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        urlOverride = params.get("timePeriod") || params.get("greetingPeriod");
      }
      setTimeData(getTimePeriodData(new Date(), urlOverride));
    };

    updateTime();
    const timer = setInterval(updateTime, 15000);
    return () => clearInterval(timer);
  }, [overridePeriod]);

  // Student details resolution
  const displayName = profile?.name || user?.name || "Student";

  // Time-period specific visual styling presets
  const periodStyles = {
    morning: {
      gradient: "from-slate-950/90 via-slate-900/60 to-amber-700/35",
      badgeBorder: "border-amber-300/30",
      accentGlow: "bg-amber-400/20",
      pillBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      label: "Morning Sky",
    },
    afternoon: {
      gradient: "from-slate-950/90 via-slate-900/50 to-sky-700/35",
      badgeBorder: "border-sky-300/30",
      accentGlow: "bg-sky-400/20",
      pillBg: "bg-sky-500/20 text-sky-200 border-sky-400/30",
      label: "Bright Daylight",
    },
    evening: {
      gradient: "from-slate-950/92 via-purple-950/65 to-orange-600/40",
      badgeBorder: "border-orange-300/30",
      accentGlow: "bg-orange-500/25",
      pillBg: "bg-orange-500/20 text-orange-200 border-orange-400/30",
      label: "Golden Sunset",
    },
    night: {
      gradient: "from-black/95 via-indigo-950/75 to-blue-950/50",
      badgeBorder: "border-indigo-300/30",
      accentGlow: "bg-indigo-400/20",
      pillBg: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
      label: "Midnight Sky",
    },
  };

  const currentStyle = periodStyles[timeData.id] || periodStyles.morning;

  // Status badge styling map
  const campusBadgeClasses = {
    success: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    danger: "bg-red-500/25 text-red-200 border-red-400/40",
    warning: "bg-amber-500/25 text-amber-200 border-amber-400/40",
  };

  return (
    <section
      aria-label="Student identity and greeting"
      data-testid="student-greeting-card"
      data-period={timeData.id}
      className="relative overflow-hidden rounded-2xl shadow-lg border border-white/15 min-h-[125px] sm:min-h-[135px] p-4 sm:p-5 flex flex-col justify-between text-white transition-all duration-300 group"
    >
      {/* ── 1. Nature-Inspired Photographic Background ── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-102"
        style={{
          backgroundImage: `url('${timeData.bgImage || GREETING_CARD_CONFIG.backgrounds.default}')`,
        }}
        role="img"
        aria-label="Nature photographic background with sky and trees"
      />

      {/* ── 2. Atmospheric Gradient Overlay for High Contrast ── */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t transition-colors duration-500",
          currentStyle.gradient
        )}
      />

      {/* Multi-layer vignette overlay for guaranteed readable text */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

      {/* Subtle Ambient Radial Glow */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full blur-2xl opacity-60 transition-all duration-500",
          currentStyle.accentGlow
        )}
      />

      {/* ── 3. Content Area ── */}
      <div className="relative z-10 flex flex-col justify-between h-full gap-3 sm:gap-3.5">
        {/* Top Header: Greeting & Student Name */}
        <div className="min-w-0">
          {/* Main Greeting in Playfair Display (reduced, elegant serif) */}
          <h1
            data-testid="greeting-heading"
            className="font-playfair text-[17px] sm:text-[18px] font-bold tracking-tight text-white leading-tight drop-shadow"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "17px",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.7)",
            }}
          >
            {timeData.greeting}
          </h1>

          {/* Student Name in Bold Sans Serif (compact, prominent) */}
          <h2
            data-testid="student-name"
            className="font-sans font-bold text-sm sm:text-base text-white tracking-tight mt-0.5 drop-shadow truncate"
            style={{
              textShadow: "0 1px 4px rgba(0, 0, 0, 0.6)",
            }}
          >
            {displayName}
          </h2>
        </div>

        {/* Bottom Section: Current Status */}
        <div className="flex items-center justify-between border-t border-white/15 pt-2 flex-wrap gap-2">
          <span
            className="font-sans text-[11px] sm:text-xs text-slate-200 font-medium tracking-wide drop-shadow"
            style={{ textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)" }}
          >
            Current Status:
          </span>

          <div
            data-testid="student-status-badge"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-sans font-semibold border backdrop-blur-sm shadow-sm",
              campusBadgeClasses[campusStatus?.variant || "success"]
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                campusStatus?.dotClass || "bg-emerald-400"
              )}
            />
            <span className="tracking-wide">
              {campusStatus?.label || "In Campus"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
