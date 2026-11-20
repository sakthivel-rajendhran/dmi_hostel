"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { EmptyState } from "@/components/ui/EmptyState.jsx";
import { cn } from "@/lib/utils/cn.js";

/**
 * StateFeedback Component
 * Standardizes loading, slow network, error with retry, and empty state feedback.
 *
 * @param {object} props
 * @param {boolean} props.isLoading
 * @param {boolean} [props.isError]
 * @param {Error|string} [props.error]
 * @param {function} [props.onRetry]
 * @param {boolean} [props.isEmpty]
 * @param {object} [props.emptyProps] - Props forwarded to EmptyState
 * @param {React.ReactNode} [props.skeleton] - Custom skeleton component
 * @param {number} [props.skeletonCount=3] - Number of default skeleton rows
 * @param {"table"|"cards"|"detail"} [props.skeletonType="cards"]
 * @param {number} [props.slowTimeoutMs=8000] - Timeout after which slow network banner appears
 * @param {React.ReactNode} props.children - Rendered when normal state
 */
export function StateFeedback({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyProps,
  skeleton,
  skeletonCount = 3,
  skeletonType = "cards",
  slowTimeoutMs = 8000,
  children,
}) {
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      setIsSlowNetwork(false);
      timer = setTimeout(() => {
        setIsSlowNetwork(true);
      }, slowTimeoutMs);
    } else {
      setIsSlowNetwork(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, slowTimeoutMs]);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        {isSlowNetwork && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-medium animate-fade-in">
            <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
            <span>Still loading data... Your network connection might be slow.</span>
          </div>
        )}

        {skeleton ? (
          skeleton
        ) : skeletonType === "table" ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-28 rounded hidden sm:block" />
                <Skeleton className="h-8 w-16 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    const errorMessage =
      typeof error === "string"
        ? error
        : error?.message || "Failed to load data. Please check your connection.";

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 rounded-3xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 ring-8 ring-rose-50 dark:ring-rose-950/20">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Unable to Load Data
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md">
          {errorMessage}
        </p>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            variant="outline"
            className="mt-6 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState {...emptyProps} />;
  }

  return children;
}

export default StateFeedback;
