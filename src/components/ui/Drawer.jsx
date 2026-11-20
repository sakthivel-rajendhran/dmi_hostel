"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = "right", // 'right' | 'left'
  width = "max-w-md",
  className = "",
}) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const variants = {
    closed: { x: side === "right" ? "100%" : "-100%" },
    open: { x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className={cn("fixed inset-y-0 flex max-w-full", side === "right" ? "right-0" : "left-0")}>
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={variants}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className={cn(
                "w-screen bg-white dark:bg-[#0c1437] border-l border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto",
                width,
                className
              )}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 mb-5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function BottomSheet({ isOpen, onClose, title, children, className = "" }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className={cn(
              "relative z-10 w-full rounded-t-[32px] bg-white dark:bg-[#0c1437] border-t border-slate-200 dark:border-white/10 p-6 max-h-[85vh] overflow-y-auto shadow-2xl pb-8",
              className
            )}
          >
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            {title && (
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Drawer;
