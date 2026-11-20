"use client";

import { useState, useEffect } from "react";

/**
 * Hook for live pass return countdown / overdue elapsed timer
 * @param {string|Date} targetTime
 * @returns {{ isOverdue: boolean, text: string, hours: number, minutes: number, seconds: number }}
 */
export function useCountdownTimer(targetTime) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTime) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!targetTime) {
    return { isOverdue: false, text: "—", hours: 0, minutes: 0, seconds: 0 };
  }

  const target = new Date(targetTime).getTime();
  if (isNaN(target)) {
    return { isOverdue: false, text: "—", hours: 0, minutes: 0, seconds: 0 };
  }

  const diffMs = target - now;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalSeconds = Math.floor(absDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let text = "";
  if (isOverdue) {
    if (hours > 0) {
      text = `Overdue by ${hours}h ${minutes}m ${seconds}s`;
    } else {
      text = `Overdue by ${minutes}m ${seconds}s`;
    }
  } else {
    if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s remaining`;
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds}s remaining`;
    } else {
      text = `${seconds}s remaining`;
    }
  }

  return { isOverdue, text, hours, minutes, seconds };
}

export default useCountdownTimer;
