"use client";

import React from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import { cn } from "@/lib/utils/cn.js";

/**
 * EmptyState Component
 * Displays standardized empty, no-results, or initial states across all portals.
 *
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} props.title - Primary heading
 * @param {string} [props.description] - Explanatory body text
 * @param {object|React.ReactNode} [props.action] - Primary action button config or React node
 * @param {string} [props.action.label]
 * @param {function} [props.action.onClick]
 * @param {string} [props.action.href]
 * @param {React.ComponentType} [props.action.icon]
 * @param {object|React.ReactNode} [props.secondaryAction] - Secondary action
 * @param {"default"|"card"|"subtle"} [props.variant="default"]
 * @param {string} [props.className]
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}) {
  const isCard = variant === "card";
  const isSubtle = variant === "subtle";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 transition-all",
        isCard &&
          "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm",
        isSubtle &&
          "bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl",
        !isCard && !isSubtle && "py-12",
        className
      )}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 ring-8 ring-slate-50 dark:ring-slate-900/40 animate-fade-in">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            React.isValidElement(action) ? (
              action
            ) : action.href ? (
              <Button asChild size="sm">
                <Link href={action.href}>
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={action.onClick}
                variant={action.variant || "primary"}
              >
                {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            React.isValidElement(secondaryAction) ? (
              secondaryAction
            ) : secondaryAction.href ? (
              <Button asChild variant="outline" size="sm">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
