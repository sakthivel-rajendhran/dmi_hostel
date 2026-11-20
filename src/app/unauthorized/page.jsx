"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { getHomeRoute } from "@/config/roles.js";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const homeRoute = getHomeRoute(user?.role);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-text-dark dark:text-white mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-text-muted dark:text-slate-400 mb-6 leading-relaxed">
          Your current account role does not have authorization to view this section of the DMI Hostel portal.
        </p>

        {user && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-6 inline-flex items-center gap-2 text-xs">
            <span className="text-text-muted dark:text-slate-400">Current Role:</span>
            <RoleBadge role={user.role} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={homeRoute}>
            <Button className="w-full sm:w-auto" leftIcon={Home}>
              Go to My Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto" leftIcon={ArrowLeft}>
              Back to Login
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-text-muted dark:text-slate-500 mt-6">
          Tip: You can switch between all 7 roles using the floating Dev Panel in the bottom-left corner.
        </p>
      </div>
    </div>
  );
}
