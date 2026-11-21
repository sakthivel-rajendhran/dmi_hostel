"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BackgroundScene } from "@/components/login/background-scene";
import { Button } from "@/components/ui/Button.jsx";
import { forceChangePasswordSchema, getPasswordStrength } from "@/lib/validators.js";
import { useAuth } from "@/hooks/use-auth.js";
import { authService } from "@/lib/services/authService.js";
import { getHomeRoute } from "@/config/roles.js";
import { cn } from "@/lib/utils/cn.js";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshSession } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forceChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword") || "";
  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.changePassword(data.currentPassword, data.newPassword);
      if (res.ok) {
        toast.success("Password set successfully! Redirecting to your dashboard...");
        refreshSession();
        setTimeout(() => {
          const dest = getHomeRoute(user?.role || "student");
          router.push(dest);
        }, 800);
      } else {
        setServerError(res.error || "Failed to update password. Please verify current credentials.");
      }
    } catch (err) {
      setServerError("An unexpected error occurred. Please try again.");
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
        <div className="flex items-center gap-3 select-none flex-shrink-0">
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
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            padding: "clamp(16px, 2.4vh, 32px) clamp(20px, 2.4vw, 36px)",
          }}
          className="relative w-full max-w-[490px] mx-auto rounded-[32px] bg-white/88 dark:bg-[#090F2C]/90 backdrop-blur-2xl border border-white/75 dark:border-white/12 shadow-[0_25px_60px_rgba(5,10,50,0.28)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] select-none transition-all duration-300 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Set Permanent Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                First login detected. Replace temporary credentials to proceed.
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Temporary / Current Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  {...register("currentPassword")}
                  placeholder="Enter temporary password"
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-[11px] text-red-500 font-medium mt-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Permanent Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  {...register("newPassword")}
                  placeholder="At least 8 characters"
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-[11px] text-red-500 font-medium mt-1">
                  {errors.newPassword.message}
                </p>
              )}

              {/* Password Strength Bar Graph */}
              {newPasswordValue.length > 0 && (
                <div className="mt-2 space-y-1.5 transition-all duration-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Password strength:</span>
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
                  {/* Segmented Strength Bar Graph: Weak, Medium, Strong */}
                  <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                    {/* Level 1: Weak */}
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
                    {/* Level 2: Medium */}
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
                    {/* Level 3: Strong */}
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

            {/* Confirm Password */}
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
                  {...register("confirmPassword")}
                  placeholder="Repeat permanent password"
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-500 font-medium mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2 font-bold shadow-lg shadow-indigo-600/25"
            >
              Update Password & Enter
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
