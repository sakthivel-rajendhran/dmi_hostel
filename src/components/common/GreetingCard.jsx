"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Award,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GREETING_CARD_CONFIG, getTimePeriodData } from "@/config/greetingCard";

/**
 * Universal DMI Portal Greeting Card
 * Automatically changes background image, greeting text, and text glow intensity
 * based on Indian Standard Time (Asia/Kolkata, UTC+05:30):
 * - GOOD MORNING:   05:00 AM – 11:59 AM
 * - GOOD AFTERNOON: 12:00 PM – 04:59 PM
 * - GOOD EVENING:   05:00 PM – 07:59 PM
 * - GOOD NIGHT:     08:00 PM – 04:59 AM
 *
 * Celestial elements (crescent moon & twinkling stars) appear EXCLUSIVELY at night.
 * Dynamically resolves name, role, department, and status per portal role:
 * - Student
 * - Warden
 * - Staff
 * - HOD
 * - Correspondent
 */

// Curated subtle twinkling stars distributed naturally across the night sky
const NIGHT_STARS = [
  { top: "10%", left: "34%", size: 2, delay: "0s", duration: "3.2s" },
  { top: "22%", left: "40%", size: 1.5, delay: "1.4s", duration: "2.8s" },
  { top: "8%", left: "48%", size: 2.5, delay: "0.7s", duration: "3.6s", glow: true },
  { top: "26%", left: "53%", size: 1.2, delay: "2.1s", duration: "2.4s" },
  { top: "12%", left: "61%", size: 1.8, delay: "0.3s", duration: "4.0s" },
  { top: "6%", left: "68%", size: 2.2, delay: "1.8s", duration: "3.1s", glow: true },
  { top: "32%", left: "73%", size: 1.5, delay: "2.7s", duration: "3.5s" },
  { top: "16%", left: "80%", size: 2, delay: "1.1s", duration: "2.9s" },
  { top: "8%", left: "88%", size: 1.5, delay: "2.3s", duration: "3.3s" },
  { top: "6%", left: "24%", size: 1.5, delay: "1.7s", duration: "3.0s" },
  { top: "14%", left: "29%", size: 2, delay: "0.9s", duration: "2.6s" },
  { top: "24%", left: "65%", size: 2.5, delay: "2.9s", duration: "3.8s", glow: true },
];

export function GreetingCard({
  role,
  user,
  profile,
  campusStatus,
  overridePeriod,
  name: nameProp,
  uniqueId: uniqueIdProp,
  department: departmentProp,
  statusLabel: statusLabelProp,
  statusValue: statusValueProp,
  className = "",
}) {
  const [timeData, setTimeData] = useState(() =>
    getTimePeriodData(new Date(), overridePeriod)
  );
  const [bgError, setBgError] = useState(false);

  // Dynamic local clock tracker: evaluates every 15 seconds & rechecks on tab focus
  useEffect(() => {
    const updateTime = () => {
      let urlOverride = overridePeriod;
      if (!urlOverride && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        urlOverride =
          params.get("timePeriod") ||
          params.get("greetingPeriod") ||
          params.get("mockTime");
      }
      setTimeData((prev) => {
        const next = getTimePeriodData(new Date(), urlOverride);
        if (
          prev &&
          prev.id === next.id &&
          prev.greeting === next.greeting &&
          prev.bgImage === next.bgImage &&
          prev.glowClass === next.glowClass
        ) {
          return prev;
        }
        return next;
      });
    };

    updateTime();

    // Recheck immediately when user switches tabs or awakens device
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        updateTime();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    const timer = setInterval(updateTime, 15000);
    return () => {
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [overridePeriod]);

  // Image load fallback safety
  useEffect(() => {
    if (timeData?.bgImage) {
      const img = new Image();
      img.src = timeData.bgImage;
      img.onerror = () => setBgError(true);
      img.onload = () => setBgError(false);
    }
  }, [timeData?.bgImage]);

  // Effective Role Resolution
  const resolvedRole = (role || user?.role || "student").toLowerCase();

  // Dynamic Details Resolution
  let rawName = nameProp || profile?.name || user?.name || "User";
  let primaryBadge = uniqueIdProp || "";
  let secondaryBadge = departmentProp || "";
  let bottomLabel = statusLabelProp || "Current Status";
  let bottomValue = statusValueProp || "Active";
  let CenterIcon = GraduationCap;
  let statusVariant = "default";

  if (resolvedRole === "student") {
    rawName = nameProp || profile?.name || user?.name || "Student";
    primaryBadge =
      uniqueIdProp ||
      profile?.studentId ||
      user?.studentId ||
      profile?.regNo ||
      user?.regNo ||
      "";
    secondaryBadge = "";
    bottomLabel = "Current Status";
    bottomValue = campusStatus?.label || "In Campus";
    CenterIcon = GraduationCap;
    statusVariant = campusStatus?.variant || "default";
  } else if (resolvedRole === "warden") {
    rawName = nameProp || user?.name || "Dr. Anthony Xavier";
    primaryBadge = uniqueIdProp || user?.designation || "CHIEF WARDEN";
    secondaryBadge = "HOSTEL ADMINISTRATION";
    bottomLabel = "Account Status";
    bottomValue = "CHIEF WARDEN · ACTIVE";
    CenterIcon = ShieldCheck;
  } else if (resolvedRole === "staff") {
    rawName = nameProp || user?.name || "Faculty Advisor";
    primaryBadge = uniqueIdProp || user?.id || "STAFF";
    secondaryBadge = departmentProp || user?.department || user?.dept || "CSE";
    bottomLabel = "Portal Role";
    bottomValue = "FACULTY ADVISOR · ACTIVE";
    CenterIcon = BookOpen;
  } else if (resolvedRole === "hod") {
    rawName = nameProp || user?.name || "Head of Department";
    primaryBadge = uniqueIdProp || user?.id || "HOD";
    secondaryBadge = departmentProp || user?.department || user?.dept || "CSE";
    bottomLabel = "Portal Role";
    bottomValue = "HEAD OF DEPARTMENT · ACTIVE";
    CenterIcon = Award;
  } else if (resolvedRole === "correspondent") {
    rawName = nameProp || user?.name || "Rev. Fr. Mary Antony";
    primaryBadge = uniqueIdProp || "CORRESPONDENT";
    secondaryBadge = "EXECUTIVE MANAGEMENT";
    bottomLabel = "Oversight Role";
    bottomValue = "MANAGING TRUSTEE · ACTIVE";
    CenterIcon = Building2;
  }

  const displayName = String(rawName).trim().toUpperCase();

  // Color mapping matching reference pill aesthetic
  const getStatusTheme = () => {
    const normalized = String(bottomValue).toLowerCase();
    if (normalized.includes("overdue") || statusVariant === "danger") {
      return {
        border: "border-rose-500",
        dot: "bg-rose-500 animate-pulse",
        text: "text-rose-300",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]",
      };
    }
    if (normalized.includes("out") || statusVariant === "warning") {
      return {
        border: "border-amber-400",
        dot: "bg-amber-400",
        text: "text-amber-300",
        glow: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
      };
    }
    // "In Campus" / "Active" / Default verified state
    return {
      border: "border-emerald-400",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
      glow: "shadow-[0_0_12px_rgba(52,211,153,0.4)]",
    };
  };

  const statusTheme = getStatusTheme();

  // Background image URL resolution with safe fallback
  const resolvedBgImage = bgError
    ? GREETING_CARD_CONFIG.backgroundFallback
    : timeData?.bgImage || GREETING_CARD_CONFIG.backgroundFallback;

  return (
    <section
      aria-label="Portal identity and greeting"
      data-testid="portal-greeting-card"
      data-role={resolvedRole}
      data-period={timeData?.id || "morning"}
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-[#020d2c]",
        "shadow-[0_12px_36px_rgba(2,16,60,0.35)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        "min-h-[185px] sm:min-h-[215px] md:min-h-[230px]",
        "p-5 sm:p-7 md:p-8 flex flex-col justify-between text-white transition-all duration-300 select-none",
        className
      )}
    >
      {/* ── Background Image Layer (Expanded to ~110% to eliminate edge strips & ensure full right-edge coverage) ── */}
      <div
        className={cn(
          "absolute -inset-[4.8%] bg-cover bg-no-repeat pointer-events-none transition-all duration-700",
          ["morning", "afternoon", "evening", "night"].includes(timeData?.id)
            ? "bg-[position:65%_center] sm:bg-center"
            : "bg-center",
          timeData?.id === "morning" && "brightness-[1.03] saturate-[1.03]",
          timeData?.id === "afternoon" && "brightness-[1.04] saturate-[1.02]",
          timeData?.id === "evening" && "brightness-[1.02] contrast-[1.02]",
          timeData?.id === "night" && "brightness-[1.02]"
        )}
        style={{
          backgroundImage: `url('${resolvedBgImage}')`,
        }}
        aria-hidden="true"
      />

      {/* ── 1. Contrast Overlay (Guarantees 100% Text Legibility) ── */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          timeData?.id === "night"
            ? "bg-gradient-to-r from-[#021347]/85 via-[#02144d]/45 to-transparent"
            : timeData?.id === "evening"
            ? "bg-gradient-to-r from-[#021347]/85 via-[#02144d]/45 to-transparent"
            : timeData?.id === "morning" || timeData?.id === "afternoon"
            ? "bg-gradient-to-r from-[#021347]/80 via-[#02144d]/40 to-transparent"
            : "bg-gradient-to-r from-[#021347]/85 via-[#02144d]/50 to-black/30"
        )}
        aria-hidden="true"
      />

      {/* ── 2. Session-Specific Atmosphere & Lighting Accents ── */}
      {/* Top-Left Soft Cyan Lighting Accent */}
      <div
        className="pointer-events-none absolute -top-14 -left-14 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl opacity-75"
        aria-hidden="true"
      />

      {/* MORNING: Soft warm golden sunlight glow & breathing aura near sunrise area (05:00 AM – 11:59 AM) */}
      {timeData?.id === "morning" && (
        <div
          className="pointer-events-none absolute top-[10%] right-[10%] sm:right-[16%] w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-amber-400/25 blur-3xl animate-sunlight-pulse"
          aria-hidden="true"
        />
      )}

      {/* EVENING: Tasteful vintage sunset appearance with warm cinematic tones (05:00 PM – 07:59 PM) */}
      {timeData?.id === "evening" && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-600/10 via-orange-500/12 to-rose-500/15 mix-blend-screen"
          aria-hidden="true"
        />
      )}

      {/* NIGHT: Subtle blue moonlight halo accent in upper sky quadrant (08:00 PM – 04:59 AM) */}
      {timeData?.id === "night" && (
        <div
          className="pointer-events-none absolute top-1 right-10 sm:right-20 w-44 h-44 rounded-full bg-cyan-400/15 blur-3xl opacity-80"
          aria-hidden="true"
        />
      )}

      {/* ── 3 & 4. Celestial Elements: Twinkling Stars & Crescent Moon (GOOD NIGHT period ONLY) ── */}
      {timeData?.showCelestial && (
        <>
          {/* Small Subtle Twinkling Night Stars */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {NIGHT_STARS.map((star, idx) => (
              <span
                key={idx}
                className={cn(
                  "absolute rounded-full star-twinkle pointer-events-none",
                  star.glow
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]"
                    : "bg-sky-100/90 shadow-[0_0_4px_rgba(224,242,254,0.6)]"
                )}
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDuration: star.duration,
                  animationDelay: star.delay,
                }}
              />
            ))}
          </div>

          {/* Fallback SVG Crescent Moon (when SVG background is used) */}
          {resolvedBgImage?.endsWith(".svg") && (
            <div
              className="pointer-events-none absolute top-3 sm:top-4 md:top-5 right-5 sm:right-8 md:right-12 lg:right-16 z-10"
              aria-hidden="true"
            >
              <div className="relative animate-moon-float">
                <div className="absolute -inset-2.5 rounded-full bg-cyan-300/20 blur-md pointer-events-none" />
                <svg
                  viewBox="0 0 24 24"
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 relative z-10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="crescentMoonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="40%" stopColor="#F0F9FF" />
                      <stop offset="80%" stopColor="#BAE6FD" />
                      <stop offset="100%" stopColor="#7DD3FC" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    fill="url(#crescentMoonGlow)"
                  />
                  <circle cx="16" cy="11" r="0.75" fill="#38BDF8" fillOpacity="0.4" />
                  <circle cx="17.5" cy="14" r="1.1" fill="#38BDF8" fillOpacity="0.35" />
                  <circle cx="14" cy="16.5" r="0.7" fill="#38BDF8" fillOpacity="0.3" />
                </svg>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 5. Foreground Content Area ── */}
      <div className="relative z-10 flex flex-col justify-between h-full gap-2.5 sm:gap-3.5">
        {/* Top: Dynamic Greeting & User Name */}
        <div className="min-w-0 pr-2">
          {/* Main Greeting Typography with Session-Specific Text Glow */}
          <h1
            data-testid="greeting-heading"
            className="font-greeting-display text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black uppercase text-white tracking-wider leading-none"
          >
            <span
              className={cn(
                timeData?.glowClass || "greeting-glow-morning",
                "tracking-wider transition-all duration-500"
              )}
            >
              {timeData?.greeting || "GOOD MORNING"}
            </span>
          </h1>

          {/* User Name Typography (Futuristic, Geometric, Wide Tracking, STATIC) */}
          <div className="mt-2 sm:mt-2.5 flex items-center flex-wrap gap-2 sm:gap-3">
            <h2
              data-testid="greeting-name"
              className="font-student-name text-base sm:text-lg md:text-xl lg:text-[22px] font-black uppercase text-white tracking-[0.24em] sm:tracking-[0.32em] md:tracking-[0.38em] leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] truncate max-w-full"
              style={{
                textShadow: "0 2px 10px rgba(0, 0, 30, 0.8), 0 1px 2px rgba(0, 0, 0, 0.9)",
              }}
            >
              {displayName}
            </h2>

            {/* Primary Detail Badge (ID / Role) */}
            {primaryBadge && (
              <span
                data-testid="greeting-primary-badge"
                className="font-mono text-[10px] sm:text-[11px] font-semibold text-cyan-200/90 bg-white/10 px-2 py-0.5 rounded-md border border-white/20 backdrop-blur-xs tracking-wider uppercase drop-shadow"
              >
                {primaryBadge}
              </span>
            )}

            {/* Secondary Badge (Department / Scope) */}
            {secondaryBadge && (
              <span
                data-testid="greeting-secondary-badge"
                className="font-sans text-[10px] sm:text-[11px] font-semibold text-emerald-200/90 bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-400/30 backdrop-blur-xs tracking-wider uppercase drop-shadow"
              >
                {secondaryBadge}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Elegant Divider with Centered Academic/Portal Icon */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 max-w-md w-full my-1 sm:my-1.5"
          aria-hidden="true"
        >
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-white/40 to-white/60" />
          <CenterIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/95 shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-white/60 via-white/40 to-transparent" />
        </div>

        {/* Bottom: Dynamic Current Status Section */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Status Label */}
          <span
            className="font-sans text-xs sm:text-sm font-medium text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
          >
            {bottomLabel}:
          </span>

          {/* Status Badge Pill */}
          <div
            data-testid="greeting-status-badge"
            className={cn(
              "inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 rounded-full",
              "text-xs sm:text-sm font-sans font-bold",
              "bg-[#030d2a]/85 border backdrop-blur-md transition-all duration-300",
              statusTheme.border,
              statusTheme.text,
              statusTheme.glow
            )}
          >
            <span
              className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0", statusTheme.dot)}
            />
            <span className="tracking-wide">{bottomValue}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GreetingCard;
