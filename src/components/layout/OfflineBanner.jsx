"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99] bg-danger text-white py-2 px-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="w-4 h-4 animate-bounce" />
      <span>You are currently offline. Changes will sync once your internet connection is restored.</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-3 inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs transition"
      >
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    </div>
  );
}

export default OfflineBanner;
