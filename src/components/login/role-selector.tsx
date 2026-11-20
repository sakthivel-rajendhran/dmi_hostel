"use client";

import React from "react";
import { GraduationCap, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface RoleSelectorProps {
  role: "student" | "admin";
  onSelect: (role: "student" | "admin") => void;
  disabled?: boolean;
}

export function RoleSelector({ role, onSelect, disabled = false }: RoleSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Login user role"
      className="relative flex p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-inner transition-colors duration-300"
    >
      {/* Student Option */}
      <button
        type="button"
        role="tab"
        aria-selected={role === "student"}
        disabled={disabled}
        onClick={() => onSelect("student")}
        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
          role === "student"
            ? "text-white"
            : "text-text-muted hover:text-text-dark dark:text-slate-300 dark:hover:text-white"
        }`}
      >
        <GraduationCap className={`w-4 h-4 transition-transform duration-200 ${role === "student" ? "scale-110" : ""}`} />
        <span>Student</span>
        {role === "student" && (
          <motion.div
            layoutId="activeRolePill"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] shadow-md shadow-indigo-500/30 -z-10"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
        )}
      </button>

      {/* Admin Option */}
      <button
        type="button"
        role="tab"
        aria-selected={role === "admin"}
        disabled={disabled}
        onClick={() => onSelect("admin")}
        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
          role === "admin"
            ? "text-white"
            : "text-text-muted hover:text-text-dark dark:text-slate-300 dark:hover:text-white"
        }`}
      >
        <Shield className={`w-4 h-4 transition-transform duration-200 ${role === "admin" ? "scale-110" : ""}`} />
        <span>Staff / Admin</span>
        {role === "admin" && (
          <motion.div
            layoutId="activeRolePill"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2438E8] via-[#2B2FE0] to-[#6D28D9] shadow-md shadow-indigo-500/30 -z-10"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
        )}
      </button>
    </div>
  );
}
