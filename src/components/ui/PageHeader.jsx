"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  badge,
  actions,
  className = "",
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6", className)}>
      <div className="space-y-1">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-text-muted dark:text-slate-400 mb-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href || crumb.label}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                  {isLast || !crumb.href ? (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-primary-blue transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111936] dark:text-white tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <p className="text-xs sm:text-sm text-text-muted dark:text-slate-400 max-w-2xl">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, description, actions, className = "" }) {
  return (
    <div className={cn("flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 dark:border-white/10", className)}>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="text-xs text-text-muted dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export default PageHeader;
