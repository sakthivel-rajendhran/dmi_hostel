"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  X,
  FileText,
  Users,
  Shield,
  QrCode,
  Bell,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.js";
import { ROLES } from "@/config/roles.js";

export function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled externally or passed
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleConfig = user?.role ? ROLES[user.role] : null;
  const navItems = roleConfig?.navItems || [];

  // Filtered actions
  const matchedNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    {
      label: "Sign Out",
      action: () => router.push("/"),
      icon: ExternalLink,
      desc: "Safely end current portal session",
    },
  ];

  const handleSelect = (item) => {
    onClose();
    if (item.href) {
      router.push(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Type a command or search pages, students, passes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm focus:outline-none text-text-dark dark:text-white placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {/* Navigation group */}
          {matchedNav.length > 0 && (
            <div className="py-2">
              <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Navigation
              </span>
              <div className="mt-1 space-y-1">
                {matchedNav.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-text-dark dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">
                      Jump to &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="py-2">
            <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              System Actions
            </span>
            <div className="mt-1 space-y-1">
              {quickActions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-text-dark dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div>{item.label}</div>
                      <div className="text-[11px] text-text-muted dark:text-slate-400">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    Open &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-text-muted dark:text-slate-400">
          <span>
            Logged in as: <strong className="font-semibold text-text-dark dark:text-white">{user?.name || "Guest"}</strong> ({user?.role || "none"})
          </span>
          <span className="flex items-center gap-1">
            <Command className="w-3.5 h-3.5" /> + K anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
