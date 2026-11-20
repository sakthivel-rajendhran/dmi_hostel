"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function KioskShell({ children, gateName = "Main Campus Gate" }) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Live Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Online / Offline monitor
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Screen Wake Lock
  useEffect(() => {
    let wakeLock = null;
    async function requestWakeLock() {
      if ("wakeLock" in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLock.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.warn("Screen Wake Lock error:", err);
        }
      }
    }
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Kiosk Header */}
      <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/warden/gate-qr"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Back to Warden Portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shadow-sm">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI College Emblem"
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h1 className="text-base font-black text-white leading-tight tracking-tight uppercase">
              DMI College of Engineering
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-primary font-bold">{gateName}</span>
              <span>&bull;</span>
              <span>Gate QR Display Mode</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Status Indicators */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xl font-black font-mono tracking-wider text-emerald-400">
              {timeStr || "00:00:00"}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">{dateStr}</div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <button
              onClick={toggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            <div
              className={cn(
                "p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5",
                isOnline
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                  : "bg-red-950/60 text-red-400 border border-red-800/60"
              )}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="h-12 bg-slate-900/60 border-t border-slate-800/80 px-6 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Digital Security Checkpoint</span>
        </div>
        <div>Students scan using their mobile camera in DMI Hostel App</div>
      </footer>
    </div>
  );
}

export default KioskShell;
