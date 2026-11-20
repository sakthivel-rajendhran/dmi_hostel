"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn.js";

export function DropdownMenu({ trigger, items = [], align = "right", className = "" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-40 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0c1437] border border-slate-200/90 dark:border-white/10 shadow-xl p-1.5 focus:outline-none",
              align === "right" ? "right-0" : "left-0",
              className
            )}
          >
            {items.map((item, idx) => {
              if (item.divider) {
                return <div key={idx} className="h-px bg-slate-100 dark:bg-white/10 my-1" />;
              }

              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left",
                    item.danger
                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Tooltip({ text, children, position = "top" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "absolute z-40 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap shadow-lg pointer-events-none",
              position === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
              position === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
              position === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5"
            )}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DropdownMenu;
