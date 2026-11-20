"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Mail,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleSelector } from "./role-selector";
import { loginSchema } from "@/lib/validators.js";
import { useAuth } from "@/hooks/use-auth.js";
import { getHomeRoute } from "@/config/roles.js";
import { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginCardProps {
  onOpenRegister?: () => void;
  onOpenForgotPassword?: () => void;
  formRef?: React.RefObject<any>;
}

export function LoginCard({ onOpenRegister, onOpenForgotPassword }: LoginCardProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      role: "student",
      identifier: "",
      password: "",
      rememberMe: true,
    },
  });

  const handleRoleChange = (newRole: "student" | "admin") => {
    setRole(newRole);
    setValue("role", newRole);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 450));

    const result = await login(data.role, data.identifier, data.password);

    if (result && result.success) {
      if (result.session?.mustChangePassword) {
        setSuccessMessage("First login detected. Redirecting to set your permanent password...");
        setTimeout(() => {
          router.push("/change-password");
        }, 500);
      } else {
        const userRole = result.session?.role || (data.role === "student" ? "student" : "warden");
        const dest = getHomeRoute(userRole);
        setSuccessMessage(
          data.role === "student"
            ? "Welcome back! Loading Resident Portal..."
            : "Authenticated. Loading Portal..."
        );
        setTimeout(() => {
          router.push(dest);
        }, 500);
      }
    } else {
      setErrorMessage(result?.message || "Invalid credentials provided.");
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        padding: "clamp(16px, 2.4vh, 32px) clamp(20px, 2.4vw, 36px)",
      }}
      className="relative w-full max-w-[490px] mx-auto rounded-[32px] h-[clamp(580px,82vh,700px)] bg-white/88 dark:bg-[#090F2C]/90 backdrop-blur-2xl border border-white/75 dark:border-white/12 shadow-[0_25px_60px_rgba(5,10,50,0.28)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] select-none transition-all duration-300 short-tight-card flex flex-col overflow-hidden"
    >
      {/* Top Circular Crest Badge with Flanking Lines */}
      <div className="flex items-center justify-center gap-3 -mt-1 mb-[clamp(4px,0.9vh,12px)]">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/80 dark:via-slate-700 to-transparent" />
        <div
          style={{
            width: "clamp(74px, 11.2vh, 102px)",
            height: "clamp(74px, 11.2vh, 102px)",
          }}
          className="short-badge rounded-full bg-white dark:bg-[#070D28] border-2 border-white/90 dark:border-white/20 shadow-xl flex items-center justify-center p-1 relative flex-shrink-0 overflow-hidden"
        >
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              fill
              sizes="(max-width: 768px) 80px, 110px"
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/80 dark:via-slate-700 to-transparent" />
      </div>

      {/* Card Header Titles */}
      <div className="text-center">
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3.8vh, 2.5rem)",
            lineHeight: 1.15,
          }}
          className="font-extrabold text-[#111936] dark:text-white tracking-tight"
        >
          Welcome Back!
        </h2>
        <p
          style={{
            fontSize: "clamp(0.875rem, 2.1vh, 1.25rem)",
          }}
          className="text-[#5B6485] dark:text-slate-300 mt-1 font-normal"
        >
          Sign in to access your hostel dashboard
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 thin-scrollbar flex flex-col justify-between">
        <div>
          {/* Role Segmented Selector */}
          <div
            style={{
              marginTop: "clamp(6px, 1.2vh, 12px)",
            }}
          >
            <RoleSelector role={role} onSelect={handleRoleChange} disabled={isLoading} />
          </div>

      {/* Alert Banners */}
      <AnimatePresence mode="wait">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          marginTop: "clamp(8px, 1.6vh, 16px)",
        }}
        className="flex flex-col gap-[clamp(8px,1.4vh,14px)]"
      >
        {/* Email Identifier Input */}
        <div>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#5B6485] dark:text-slate-400 pointer-events-none">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type={role === "student" ? "text" : "email"}
              autoComplete="username"
              placeholder={role === "student" ? "Student ID / Reg No / Email" : "Staff / Admin Gmail"}
              {...register("identifier")}
              disabled={isLoading}
              style={{
                height: "clamp(44px, 6vh, 60px)",
              }}
              className={`w-full pl-11 pr-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border ${errors.identifier
                ? "border-red-400 focus:ring-red-400"
                : "border-slate-200/90 dark:border-white/10 focus:ring-primary-blue"
                } text-xs sm:text-sm font-semibold text-[#111936] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
          </div>
          {errors.identifier && (
            <p className="mt-1 ml-2 text-[11px] text-red-500 font-medium">
              {errors.identifier.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#5B6485] dark:text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              {...register("password")}
              disabled={isLoading}
              style={{
                height: "clamp(44px, 6vh, 60px)",
              }}
              className={`w-full pl-11 pr-11 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border ${errors.password
                ? "border-red-400 focus:ring-red-400"
                : "border-slate-200/90 dark:border-white/10 focus:ring-primary-blue"
                } text-xs sm:text-sm font-semibold text-[#111936] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 text-[#5B6485] hover:text-[#111936] dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 ml-2 text-[11px] text-red-500 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("rememberMe")}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-primary-blue focus:ring-primary-blue border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer accent-[#2438E8]"
            />
            <span className="text-[11px] sm:text-xs font-medium text-[#111936] dark:text-slate-200">
              Remember Me
            </span>
          </label>

          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-[11px] sm:text-xs font-semibold text-primary-blue hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Submit Button with Distinct Margin Separation */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            height: "clamp(46px, 6.4vh, 64px)",
            marginTop: "clamp(8px, 1.4vh, 16px)",
          }}
          className="relative w-full rounded-2xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/45 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </>
          )}
        </button>
      </form>

      {/* OR Divider with Lines on Both Sides */}
      <div
        style={{
          margin: "clamp(8px, 1.4vh, 16px) 0",
        }}
        className="flex items-center gap-3"
      >
        <div className="flex-1 h-px bg-slate-300/70 dark:bg-white/10" />
        <span className="text-[10px] sm:text-xs font-semibold text-[#5B6485] dark:text-slate-400 uppercase tracking-wider px-1">
          OR
        </span>
        <div className="flex-1 h-px bg-slate-300/70 dark:bg-white/10" />
      </div>

      {/* Secondary Action: Register or Admin Note */}
      {role === "student" ? (
        <button
          type="button"
          onClick={onOpenRegister}
          style={{
            height: "clamp(44px, 5.6vh, 56px)",
          }}
          className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 backdrop-blur-md text-[11px] sm:text-xs font-medium text-[#111936] dark:text-white flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-blue dark:text-indigo-400" />
          <span>
            New Student?{" "}
            <strong className="text-primary-blue dark:text-indigo-400 font-semibold">
              Create an Account
            </strong>
          </span>
        </button>
      ) : (
        <div className="text-center py-2 px-3 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
          <p className="text-[11px] text-[#5B6485] dark:text-slate-400 font-medium">
            Authorized College Staff & Admin Portal
          </p>
        </div>
      )}

      {/* Card Footer Version */}
      <p className="mt-[clamp(6px,1.2vh,12px)] text-center text-xs text-[#5B6485]/70 dark:text-slate-500 font-medium tracking-wide">
        DMI College Hostel Management v1.0.0
      </p>
        </div>
      </div>
    </motion.div>
  );
}
