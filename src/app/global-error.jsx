"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";

export default function GlobalRootError({ error, reset }) {
  const [errorId, setErrorId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = `ERR-ROOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setErrorId(id);
    // TODO(BACKEND): Sentry.captureException(error, { extra: { errorId: id, rootLayout: true } });
    console.error(`[${id}] Root layout error:`, error);
  }, [error]);

  const handleCopyId = () => {
    if (!errorId) return;
    navigator.clipboard?.writeText(errorId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white font-sans antialiased">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-500/5">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            System Level Error
          </h1>

          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            A critical system fault occurred in the application shell.
          </p>

          {errorId && (
            <div className="mb-6 flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs">
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400">Incident Code</span>
                <span className="font-mono font-semibold text-slate-200">{errorId}</span>
              </div>
              <button
                onClick={handleCopyId}
                type="button"
                className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 transition"
                title="Copy Code"
                aria-label="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
