"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn.js";

export function Tabs({ tabs = [], activeTab, onChange, className = "" }) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id || "");
  const currentTab = activeTab !== undefined ? activeTab : internalActive;

  const handleSelect = (id) => {
    if (onChange) onChange(id);
    else setInternalActive(id);
  };

  return (
    <div className={cn("border-b border-slate-200 dark:border-white/10", className)}>
      <nav className="flex space-x-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={cn(
                "relative py-3.5 px-1 flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "text-primary-blue dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-bold",
                    isActive
                      ? "bg-primary-blue/10 text-primary-blue dark:bg-indigo-400/20 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-blue dark:bg-indigo-400 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Tabs;
