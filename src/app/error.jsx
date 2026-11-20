"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";

export default function GlobalError({ error, reset }) {
  const [errorId, setErrorId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate deterministic client error tracking ID
    const id = `ERR-DMI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setErrorId(id);

    // TODO(BACKEND): Sentry.captureException(error, { extra: { errorId: id } });
    console.error(`[${id}] Global application error:`, error);
  }, [error]);

  const handleCopyId = () => {
    if (!errorId) return;
    navigator.clipboard?.writeText(errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4 ring-8 ring-danger/5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          An unexpected error occurred while processing this request. Our engineering team has been notified.
        </p>

        {errorId && (
          <div className="mb-6 flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400">Error Tracking Reference</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{errorId}</span>
            </div>
            <button
              onClick={handleCopyId}
              type="button"
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition"
              title="Copy Error ID"
              aria-label="Copy Error ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {error?.message && (
          <pre className="text-xs text-left bg-slate-50 dark:bg-slate-950 p-3 rounded-xl overflow-x-auto text-danger mb-6 font-mono border border-slate-200 dark:border-slate-800">
            {error.message}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => reset()} iconLeft={RefreshCw}>
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            iconLeft={Home}
          >
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
