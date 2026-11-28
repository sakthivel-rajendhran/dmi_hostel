"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BackgroundScene } from "@/components/login/background-scene";
import { Button } from "@/components/ui/Button.jsx";
import { forceChangePasswordSchema, getPasswordStrength } from "@/lib/validators.js";
import { useAuth } from "@/hooks/use-auth.js";
import { authService } from "@/lib/services/authService.js";
import { cn } from "@/lib/utils/cn.js";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, user, role, loading, refreshSession } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authentication & Guard Check
  useEffect(() => {
    if (loading) return;

    if (!session || !user) {
      router.replace("/");
      return;
    }

    const accStatus = (user?.accountStatus || user?.account_status || "").toUpperCase();
    if (role === "student" && accStatus && accStatus !== "APPROVED") {
      toast.error("Your account is awaiting Warden approval.");
      router.replace("/");
      return;
    }

    // If user does not need to change password, redirect straight to dashboard
    const mustChange = session?.mustChangePassword ?? user?.mustChangePassword;
    if (mustChange === false) {
      router.replace(role === "student" ? "/student/dashboard" : "/warden/dashboard");
    }
  }, [session, user, role, loading, router]);

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
      const res = await authService.changePassword(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword
      );

      if (res.ok) {
        toast.success("Password changed successfully! Welcome to DMI Hostel.");
        refreshSession();
        setTimeout(() => {
          router.push("/student/dashboard");
        }, 600);
      } else {
        setServerError(res.error || res.message || "Failed to update password. Please verify current credentials.");
      }
    } catch (err) {
      setServerError("An unexpected connection error occurred. Please try again.");
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
            padding: "clamp(20px, 3vh, 36px) clamp(20px, 2.8vw, 40px)",
          }}
          className="relative w-full max-w-[490px] mx-auto rounded-[32px] bg-white/90 dark:bg-[#090F2C]/92 backdrop-blur-2xl border border-white/75 dark:border-white/12 shadow-[0_25px_60px_rgba(5,10,50,0.28)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] select-none transition-all duration-300 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Change Your Password
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                First login detected. Your initial password must be changed before accessing the Student Portal.
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  {...register("currentPassword")}
                  placeholder="Enter initial default password"
                  autoComplete="current-password"
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                New Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  {...register("newPassword")}
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
              {errors.newPassword && (
                <p className="text-[11px] text-red-500 font-medium mt-1">
                  {errors.newPassword.message}
                </p>
              )}

              {/* Password Strength Meter */}
              {newPasswordValue.length > 0 && (
                <div className="mt-2 space-y-1.5 transition-all duration-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Password strength:</span>
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
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="Re-enter new password"
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
              className="w-full mt-2 font-bold shadow-lg shadow-indigo-600/25 h-12 rounded-2xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white hover:shadow-indigo-600/40"
            >
              Save Changes
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
