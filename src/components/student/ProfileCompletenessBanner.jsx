"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { useProfileCompleteness } from "@/hooks/queries/useStudents.js";

export function ProfileCompletenessBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const studentId = user?.studentId || user?.id;

  const { data: completeness } = useProfileCompleteness(studentId);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem(`dismiss_profile_banner_${studentId}`);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, [studentId]);

  if (isDismissed || !completeness || completeness.complete || completeness.percentage === 100) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`dismiss_profile_banner_${studentId}`, "true");
    }
  };

  return (
    <div
      role="region"
      aria-label="Profile completion reminder"
      className="relative mb-4 overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50/80 p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Complete Your Profile ({completeness.percentage}%)
            </h4>
          </div>
          <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
            Please fill in your {completeness.missingFields.slice(0, 3).join(", ")}
            {completeness.missingFields.length > 3 ? " and more" : ""} to enable outpass submissions.
          </p>
          <div className="mt-2.5">
            <Link
              href="/student/profile"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 underline decoration-amber-400 underline-offset-4 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              Complete profile now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="absolute right-2 top-2 p-1.5 text-amber-600/70 hover:text-amber-900 dark:text-amber-400/70 dark:hover:text-amber-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
export default ProfileCompletenessBanner;
