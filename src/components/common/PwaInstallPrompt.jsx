"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download, Share2, PlusSquare, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { usePwa } from "@/hooks/usePwa.js";

export function PwaInstallPrompt({ variant = "card" }) {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissInstall } = usePwa();
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);

  // If already running in standalone mode or neither installable nor iOS, render nothing
  if (isInstalled || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setIsIosModalOpen(true);
    } else {
      await promptInstall();
    }
  };

  if (variant === "pill") {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-xs font-bold shadow-sm hover:brightness-105 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {/* iOS Instruction Modal */}
        <Modal
          isOpen={isIosModalOpen}
          onClose={() => setIsIosModalOpen(false)}
          title="Install DMI Hostel on iOS"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Install DMI Hostel for full-screen camera access, instant Gate QR scanning, and offline pass availability:
            </p>

            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Tap the <strong className="inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</strong> button at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Scroll down the share menu and select <strong className="inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Tap <strong>Add</strong> in the top right corner. The DMI app icon will appear on your home screen!
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsIosModalOpen(false)}
              className="w-full font-bold"
            >
              Got it
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  // Default card variant (e.g. for student profile or drawer)
  return (
    <>
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200/80 dark:border-indigo-800/50 flex items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-tight">
              Install DMI Hostel PWA
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Instant mobile camera gate scanner & offline pass access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="primary"
            onClick={handleInstallClick}
            className="font-bold shadow-sm"
          >
            Install
          </Button>
          <button
            onClick={dismissInstall}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            title="Dismiss for 14 days"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instruction Modal */}
      <Modal
        isOpen={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
        title="Install DMI Hostel on iOS"
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Install DMI Hostel on your iPhone or iPad for native-like performance and camera scanning:
          </p>

          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="text-slate-700 dark:text-slate-200">
                Tap the <strong className="inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</strong> icon at the bottom of Safari.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="text-slate-700 dark:text-slate-200">
                Scroll and tap <strong className="inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="text-slate-700 dark:text-slate-200">
                Tap <strong>Add</strong> in the top right corner.
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsIosModalOpen(false)}
            className="w-full font-bold"
          >
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default PwaInstallPrompt;
