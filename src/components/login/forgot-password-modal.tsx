"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, KeyRound, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your Student ID or Registered Email");
      return;
    }
    setError(null);
    setStep("sent");
  };

  const handleReset = () => {
    setStep("input");
    setIdentifier("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleReset}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0e1635] border border-white/40 dark:border-white/10 shadow-2xl"
      >
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary-blue/30 dark:border-indigo-400/30 shadow-md flex-shrink-0 bg-white dark:bg-slate-900 p-0.5 mb-4">
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h3 className="text-xl font-bold text-[#111936] dark:text-white">
          Reset Your Password
        </h3>
        <p className="text-xs sm:text-sm text-[#5B6485] dark:text-slate-300 mt-1">
          Enter your College ID or registered email to receive a password recovery link.
        </p>

        {step === "input" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#111936] dark:text-slate-200 mb-1.5">
                Student ID or Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STU001 or student@dmice.ac.in"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-sm font-medium text-[#111936] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#2438E8] to-[#6D28D9] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all"
            >
              <span>Send Recovery Link</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="mt-6 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">Recovery Instructions Sent!</p>
                <p className="text-xs mt-1 text-emerald-600 dark:text-emerald-400">
                  We have dispatched a verification email to the registered address associated with{" "}
                  <strong>{identifier}</strong>. Check your inbox and spam folder.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#111936] dark:text-white text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
