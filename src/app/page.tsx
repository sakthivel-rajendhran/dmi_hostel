"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeroSection } from "@/components/login/hero-section";
import { LoginCard } from "@/components/login/login-card";
import { BackgroundScene } from "@/components/login/background-scene";
import { motion } from "framer-motion";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-dvh lg:h-dvh lg:overflow-hidden w-full overflow-x-hidden flex flex-col lg:grid lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* 1. Multi-Layer Vintage Vignette Background Scene */}
      <BackgroundScene />

      {/* 2. Top Navigation Bar (In-Flow First Grid Row: Owns its vertical space) */}
      <header
        style={{
          height: "clamp(60px, 9vh, 88px)",
          paddingLeft: "clamp(24px, 4vw, 64px)",
          paddingRight: "clamp(24px, 4vw, 64px)",
        }}
        className="relative z-30 w-full flex items-center justify-between pointer-events-auto flex-shrink-0"
      >
        {/* Top-Left: College Logo Crest + Divider + Name */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 select-none flex-shrink-0"
        >
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex-shrink-0 drop-shadow-md">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>

          <div className="h-8 sm:h-9 w-[1.5px] bg-white/40" />

          <div className="flex flex-col text-white text-shadow-hero">
            <span className="text-base sm:text-xl font-extrabold tracking-tight leading-tight">
              DMI College
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-white/90 leading-tight tracking-wide">
              Hostel Management
            </span>
          </div>
        </motion.div>

        {/* Top-Right: Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 flex-shrink-0"
        >
          <ThemeToggle />
        </motion.div>
      </header>

      {/* 3. Main Row (Second Grid Row: min-h-0, strictly below header) */}
      <main
        style={{
          paddingLeft: "clamp(24px, 4vw, 64px)",
          paddingRight: "clamp(24px, 4vw, 64px)",
          paddingBottom: "clamp(8px, 1.8vh, 24px)",
          gap: "clamp(20px, 2.5vw, 48px)",
        }}
        className="relative z-20 min-h-0 w-full max-w-[1540px] mx-auto grid items-center grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(390px,500px)] flex-1 pt-2 lg:pt-0"
      >
        {/* Left Column: Hero Branding, Highlights & Quote */}
        <div className="hidden lg:flex flex-col justify-center h-full min-h-0">
          <HeroSection />
        </div>

        {/* Right Column: Centered Glass Login Card (starts strictly below TopBar) */}
        <div className="flex flex-col items-center justify-center w-full self-center max-h-full">
          <LoginCard
            onOpenRegister={() => router.push("/register")}
            onOpenForgotPassword={() => router.push("/forgot-password")}
          />
        </div>
      </main>

      {/* 4. Mobile Hero Summary (<1024px only) */}
      <div className="lg:hidden relative z-20 px-6 pb-4 text-center text-white/90 select-none text-shadow-hero">
        <p className="font-caveat text-lg text-white/95 italic font-bold">
          &ldquo;DMI – Learn, Grow, Belong&rdquo;
        </p>
      </div>
    </div>
  );
}
