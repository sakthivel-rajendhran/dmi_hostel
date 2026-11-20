"use client";

import React, { useState, useEffect } from "react";
import { Zap, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaBadge() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="PWA install status"
        className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0A1640]/70 hover:bg-[#0A1640]/90 border border-white/20 backdrop-blur-xl shadow-md transition-all duration-200 active:scale-95"
      >
        <Zap className="w-3.5 h-3.5 text-accent-gold fill-accent-gold transition-transform group-hover:scale-110" />
        <span className="text-xs font-semibold tracking-wider text-white">
          {installed ? "INSTALLED" : "PWA"}
        </span>
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl border border-white/10 whitespace-nowrap z-50 pointer-events-none"
          >
            {installed ? "App is already installed!" : "PWA Ready: Add to Home Screen via Browser Menu"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
