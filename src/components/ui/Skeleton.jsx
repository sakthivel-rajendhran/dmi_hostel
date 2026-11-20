"use client";

import React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";
import { Button } from "./Button.jsx";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[28px] p-6 bg-white dark:bg-[#0B133A]/80 border border-slate-200/80 dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "No data available",
  description = "There are no records matching your request at this moment.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={cn("rounded-[32px] p-10 text-center border-2 border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 flex flex-col items-center justify-center space-y-3", className)}>
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{title}</h4>
      <p className="text-xs sm:text-sm text-text-muted dark:text-slate-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Failed to load content",
  message = "An error occurred while fetching information. Please try again.",
  onRetry,
  className = "",
}) {
  return (
    <div className={cn("rounded-[32px] p-8 text-center bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex flex-col items-center justify-center space-y-3", className)}>
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-red-900 dark:text-red-200">{title}</h4>
      <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 max-w-md">{message}</p>
      {onRetry && (
        <div className="pt-2">
          <Button variant="outline" size="sm" iconLeft={RefreshCw} onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export default Skeleton;
