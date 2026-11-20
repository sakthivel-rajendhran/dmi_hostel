"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Shared Fixed-Dimension Auth Card for Login, Register Wizard, Password Reset, etc.
 * Guarantees zero layout shift and identical dimensions across all auth screens.
 */
export function AuthCard({
  children,
  title,
  subtitle,
  headerAction,
  showBadge = true,
  className = "",
  bodyClassName = "",
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        padding: "clamp(16px, 2.4vh, 32px) clamp(20px, 2.4vw, 36px)",
      }}
      className={cn(
        "relative w-full max-w-[490px] mx-auto rounded-[32px]",
        "h-[clamp(580px,82vh,700px)]",
        "bg-white/88 dark:bg-[#090F2C]/90 backdrop-blur-2xl",
        "border border-white/75 dark:border-white/12",
        "shadow-[0_25px_60px_rgba(5,10,50,0.28)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)]",
        "select-none transition-all duration-300 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Top Circular Crest Badge with Flanking Lines */}
      {showBadge && (
        <div className="flex items-center justify-center gap-3 -mt-1 mb-[clamp(4px,0.8vh,10px)] flex-shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/80 dark:via-slate-700 to-transparent" />
          <div
            style={{
              width: "clamp(60px, 9vh, 84px)",
              height: "clamp(60px, 9vh, 84px)",
            }}
            className="rounded-full bg-white dark:bg-[#070D28] border-2 border-white/90 dark:border-white/20 shadow-xl flex items-center justify-center p-1 relative flex-shrink-0 overflow-hidden"
          >
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src="/images/dmi-foundations-logo.png"
                alt="DMI Foundations Logo"
                fill
                sizes="(max-width: 768px) 70px, 90px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/80 dark:via-slate-700 to-transparent" />
        </div>
      )}

      {/* Header Titles */}
      {(title || subtitle) && (
        <div className="text-center flex-shrink-0 mb-[clamp(6px,1.2vh,12px)]">
          {title && (
            <h2
              style={{
                fontSize: "clamp(1.3rem, 3vh, 1.85rem)",
                lineHeight: 1.15,
              }}
              className="font-extrabold text-[#111936] dark:text-white tracking-tight"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: "clamp(0.78rem, 1.7vh, 0.95rem)",
              }}
              className="text-[#5B6485] dark:text-slate-300 mt-0.5 font-normal"
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Header Action slot (e.g. Stepper or Role Tabs) */}
      {headerAction && <div className="flex-shrink-0 mb-3">{headerAction}</div>}

      {/* Scrollable Body with Internal Thin Scrollbar and subtle bottom shadow fade */}
      <div className={cn("flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 thin-scrollbar relative", bodyClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

export default AuthCard;
