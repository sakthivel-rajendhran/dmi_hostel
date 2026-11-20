"use client";

import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'primary'
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              variant === "danger"
                ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                : "bg-indigo-100 text-primary dark:bg-indigo-950/60 dark:text-indigo-400"
            }`}
          >
            {variant === "danger" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-xs font-semibold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full text-xs font-bold"
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
