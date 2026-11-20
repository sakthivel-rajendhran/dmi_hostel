"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const PWA_DISMISSED_KEY = "dmi_pwa_prompt_dismissed_until";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isWaitingUpdate, setIsWaitingUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Connection status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    setIsIOS(isAppleDevice && isSafari && !isStandalone);

    // 4. Check dismissal window
    const dismissedUntil = localStorage.getItem(PWA_DISMISSED_KEY);
    const isDismissed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);

    // 5. Intercept beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed && !isStandalone) {
        setIsInstallable(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 6. Register Service Worker and listen for updates
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check if a worker is waiting
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setIsWaitingUpdate(true);
          }

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setIsWaitingUpdate(true);
                toast.info("A new version of DMI Hostel is available!", {
                  duration: 10000,
                  action: {
                    label: "Refresh Now",
                    onClick: () => {
                      newWorker.postMessage({ type: "SKIP_WAITING" });
                      window.location.reload();
                    },
                  },
                });
              }
            });
          });
        })
        .catch((err) => {
          // SW registration failed (e.g. unsupported host)
        });

      // Reload when new worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    const expiry = Date.now() + DISMISS_DURATION_MS;
    localStorage.setItem(PWA_DISMISSED_KEY, expiry.toString());
    setIsInstallable(false);
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [waitingWorker]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isOnline,
    isWaitingUpdate,
    promptInstall,
    dismissInstall,
    applyUpdate,
  };
}
