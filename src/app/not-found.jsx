"use client";

import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <span className="text-4xl font-extrabold text-primary font-mono block mb-1 tracking-tight">
          404
        </span>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          The requested hostel page could not be located. It may have been moved, renamed, or you may not have authorization to view it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="md" iconLeft={Home}>
            <Link href="/login">Return to Home</Link>
          </Button>
          <Button
            variant="outline"
            size="md"
            iconLeft={ArrowLeft}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
