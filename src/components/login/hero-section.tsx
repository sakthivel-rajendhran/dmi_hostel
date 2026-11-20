"use client";

import React from "react";
import { ShieldCheck, Bell, ScanLine, Users } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: ShieldCheck,
    label: "Apply for Passes",
  },
  {
    icon: Bell,
    label: "Get Instant Notifications",
  },
  {
    icon: ScanLine,
    label: "Scan QR for Verification",
  },
  {
    icon: Users,
    label: "Manage Your Profile",
  },
];

export function HeroSection() {
  return (
    <div className="h-full min-h-0 flex flex-col justify-between py-1 text-white select-none">
      {/* Top Section: H1, Subtext, Feature Chips */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-[clamp(8px,1.5vh,18px)]"
      >
        {/* Main H1 */}
        <h1
          style={{
            fontSize: "clamp(2rem, min(4.2vw, 7.2vh), 4.5rem)",
            lineHeight: 1.05,
          }}
          className="font-extrabold tracking-tight text-shadow-hero"
        >
          <span>Secure </span>
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #C9D4FF 0%, #B7A6FF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 2px 10px rgba(0,0,50,0.55))",
            }}
            className="text-transparent inline-block"
          >
            Hostel
          </span>
          <br />
          <span className="text-white">Management System</span>
        </h1>

        {/* Subtitle (Hidden when height < 680px) */}
        <p
          style={{
            fontSize: "clamp(0.95rem, min(1.3vw, 2.6vh), 1.35rem)",
          }}
          className="text-white/90 leading-relaxed max-w-lg font-normal text-shadow-sub short-hide-subtext subtext-min-height"
        >
          A smarter, safer and more connected hostel experience for our DMI College community.
        </p>

        {/* 4 Feature Chips */}
        <div
          style={{
            gap: "clamp(8px, 1.3vh, 12px)",
          }}
          className="flex flex-col pt-1"
        >
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.08 + index * 0.06 }}
                style={{
                  height: "clamp(44px, 6.2vh, 64px)",
                }}
                className="short-chip group inline-flex items-center gap-3.5 px-3.5 sm:px-4 rounded-full bg-slate-900/40 hover:bg-slate-900/55 backdrop-blur-md border border-white/25 transition-all duration-300 w-fit shadow-md shadow-black/20 hover:translate-x-1"
              >
                <div
                  style={{
                    width: "clamp(36px, 4.8vh, 52px)",
                    height: "clamp(36px, 4.8vh, 52px)",
                  }}
                  className="rounded-full bg-gradient-to-br from-[#2438E8] to-[#6D28D9] flex items-center justify-center text-white shadow-md shadow-indigo-600/40 flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span
                  style={{
                    fontSize: "clamp(0.9rem, 2.1vh, 1.1rem)",
                  }}
                  className="font-semibold text-white tracking-wide pr-3 text-shadow-sub"
                >
                  {item.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom Quote with Full-Width SVG Swoosh in normal flow */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
        className="mt-auto pt-2 pb-1"
      >
        <div className="relative inline-block text-shadow-hero">
          <p className="font-caveat text-xl sm:text-2xl text-white/95 italic tracking-wide font-bold whitespace-nowrap">
            &ldquo;DMI – Learn, Grow, Belong&rdquo;
          </p>
          <svg
            viewBox="0 0 100 12"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-0 -bottom-2 w-full h-3 text-[#FFC83D] pointer-events-none drop-shadow-md"
            aria-hidden="true"
          >
            <path
              d="M1 9C30 2 70 2 99 9"
              stroke="#FFC83D"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
