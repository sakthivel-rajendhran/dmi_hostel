"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BackgroundScene } from "@/components/login/background-scene";
import { Button } from "@/components/ui/Button.jsx";
import { forgotPasswordSchema, resetPasswordSchema, getPasswordStrength } from "@/lib/validators.js";
import { cn } from "@/lib/utils/cn.js";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState("request"); // 'request' | 'reset' | 'success'
  const [token, setToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form 1: Request Recovery
  const requestForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: "" },
  });

  // Form 2: Reset Password
  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const newPasswordValue = resetForm.watch("password") || "";
  const strength = getPasswordStrength(newPasswordValue);

  // Step 1: Submit identifier to request token
  const handleRequestSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.identifier }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        setToken(json.token);
        setMaskedEmail(json.maskedEmail || "your registered email");
        toast.success("Verification token generated!");
        setStep("reset");
      } else {
        setServerError(json.message || "Failed to find account. Please verify your Student ID or Email.");
      }
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit new password with token
  const handleResetSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        toast.success("Password reset successful!");
        setStep("success");
      } else {
        setServerError(json.message || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh lg:h-dvh lg:overflow-hidden w-full overflow-x-hidden flex flex-col lg:grid lg:grid-rows-[auto_minmax(0,1fr)]">
      <BackgroundScene />

      {/* Top Header */}
      <header
        style={{
          height: "clamp(60px, 9vh, 88px)",
          paddingLeft: "clamp(24px, 4vw, 64px)",
          paddingRight: "clamp(24px, 4vw, 64px)",
        }}
        className="relative z-30 w-full flex items-center justify-between pointer-events-auto flex-shrink-0"
      >
        <Link href="/" className="flex items-center gap-3 select-none flex-shrink-0">
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex-shrink-0 drop-shadow-md">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              DMI COLLEGE OF ENGINEERING
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-white/80 tracking-wide uppercase">
              Hostel Management Portal
            </p>
          </div>
        </Link>
      </header>

      {/* Main Centered Auth Card */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            padding: "clamp(20px, 3vh, 36px) clamp(20px, 2.8vw, 40px)",
          }}
          className="relative w-full max-w-[490px] mx-auto rounded-[32px] bg-white/90 dark:bg-[#090F2C]/92 backdrop-blur-2xl border border-white/75 dark:border-white/12 shadow-[0_25px_60px_rgba(5,10,50,0.28)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] select-none transition-all duration-300 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary-blue dark:text-indigo-400 flex items-center justify-center shrink-0 border border-primary/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {step === "request" && "Forgot Password"}
                {step === "reset" && "Set New Password"}
                {step === "success" && "Password Reset Complete"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                {step === "request" && "Enter your registered Student ID or email to recover account access."}
                {step === "reset" && `Recovery verified for ${maskedEmail}. Create your new password.`}
                {step === "success" && "Your password has been successfully updated. You can now log in."}
              </p>
            </div>
          </div>

          {/* Server Error Message */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: Request Token */}
          {step === "request" && (
            <form onSubmit={requestForm.handleSubmit(handleRequestSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student ID or Registered Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    {...requestForm.register("identifier")}
                    placeholder="e.g. CSE-3-001 or student@dmice.ac.in"
                    autoComplete="username"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                  />
                </div>
                {requestForm.formState.errors.identifier && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    {requestForm.formState.errors.identifier.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white font-bold shadow-lg shadow-indigo-600/25"
              >
                Verify & Continue
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Enter New Password */}
          {step === "reset" && (
            <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNew ? "text" : "password"}
                    {...resetForm.register("password")}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    {resetForm.formState.errors.password.message}
                  </p>
                )}

                {/* Password Strength Meter */}
                {newPasswordValue.length > 0 && (
                  <div className="mt-2 space-y-1.5 transition-all duration-300">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Strength:</span>
                      <span
                        className={cn(
                          "font-bold text-xs capitalize",
                          strength.label === "Weak" || strength.label.includes("Invalid")
                            ? "text-rose-500"
                            : strength.label === "Medium"
                            ? "text-amber-500"
                            : "text-emerald-500"
                        )}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          strength.score > 0
                            ? strength.label === "Weak" || strength.label.includes("Invalid")
                              ? "bg-rose-500"
                              : strength.label === "Medium"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-slate-200 dark:bg-slate-700"
                        )}
                      />
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          strength.score >= 40 && !strength.label.includes("Invalid")
                            ? strength.label === "Medium"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-slate-200 dark:bg-slate-700"
                        )}
                      />
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          strength.score >= 70 && !strength.label.includes("Invalid")
                            ? "bg-emerald-500"
                            : "bg-slate-200 dark:bg-slate-700"
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    {...resetForm.register("confirmPassword")}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white font-bold shadow-lg shadow-indigo-600/25"
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === "success" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your credentials have been updated in the hostel system. You can now log in.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => router.push("/")}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white font-bold"
              >
                Proceed to Login
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
