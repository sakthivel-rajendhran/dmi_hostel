"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { Modal } from "@/components/ui/Modal.jsx";
import { Button } from "@/components/ui/Button.jsx";

const WARNING_SECONDS = 60;

export function IdleTimeoutProvider({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(WARNING_SECONDS);

  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const timeoutMs = (WORKFLOW_CONFIG.idleTimeoutMinutes || 30) * 60 * 1000;
  const warningMs = timeoutMs - WARNING_SECONDS * 1000;

  // Active camera scanning exemption
  const isExempt = pathname === "/student/scan";

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setRemainingSeconds(WARNING_SECONDS);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [showWarning]);

  useEffect(() => {
    if (!user || isExempt) {
      if (showWarning) setShowWarning(false);
      return;
    }

    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    const handleEvent = () => {
      // Throttle event handling
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));

    // Periodic check
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        // Log out immediately
        clearInterval(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setShowWarning(false);
        logout();
        router.push("/login?reason=idle_timeout");
      } else if (elapsed >= warningMs && !showWarning) {
        setShowWarning(true);
        setRemainingSeconds(Math.ceil((timeoutMs - elapsed) / 1000));

        // Start 1-second countdown interval
        countdownRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              logout();
              router.push("/login?reason=idle_timeout");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 2000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user, isExempt, timeoutMs, warningMs, logout, router, showWarning]);

  const handleStaySignedIn = () => {
    resetActivity();
  };

  const handleSignOutNow = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    logout();
    router.push("/login");
  };

  return (
    <>
      {children}

      <Modal
        isOpen={showWarning}
        onClose={handleStaySignedIn}
        maxWidth="max-w-md"
        showClose={false}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 ring-8 ring-amber-500/5">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Session Expiring Soon
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            You have been inactive for over {WORKFLOW_CONFIG.idleTimeoutMinutes} minutes. For institutional security, you will be automatically signed out in:
          </p>

          <div className="py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 inline-block font-mono text-3xl font-extrabold text-primary dark:text-indigo-400">
            {remainingSeconds}s
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="md" onClick={handleStaySignedIn}>
              Stay Signed In
            </Button>
            <Button variant="outline" size="md" onClick={handleSignOutNow} iconLeft={LogOut}>
              Sign Out Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default IdleTimeoutProvider;
