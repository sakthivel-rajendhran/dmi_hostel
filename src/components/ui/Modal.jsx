"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
  showClose = true,
  className = "",
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-desc" : undefined}
            className={cn(
              "relative z-10 w-full rounded-[32px] p-6 sm:p-8 bg-white dark:bg-[#0c1437] border border-white/80 dark:border-white/10 shadow-2xl text-[#111936] dark:text-white max-h-[90vh] overflow-y-auto",
              maxWidth,
              className
            )}
          >
            {showClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {(title || description) && (
              <div className="mb-5 pr-8">
                {title && <h3 id="modal-title" className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h3>}
                {description && <p id="modal-desc" className="text-xs sm:text-sm text-text-muted dark:text-slate-400 mt-1">{description}</p>}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-colors",
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/30"
                : "bg-primary-blue hover:brightness-105 shadow-indigo-600/30"
            )}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Modal;
