"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  PlusCircle,
  Ticket,
  User,
  QrCode,
  Menu,
  X,
  Bell,
  LogOut,
  Moon,
  Sun,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  FileText,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth.js";
import { SoftBackground } from "@/components/ui/SoftBackground.jsx";
import { NotificationBell } from "@/components/ui/NotificationBell.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt.jsx";
import { CommandPalette } from "./CommandPalette.jsx";
import { PageTransition } from "./PageTransition.jsx";
import { cn } from "@/lib/utils/cn.js";

const STUDENT_NAV_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: Home },
  { label: "Apply for Pass", href: "/student/apply", icon: PlusCircle },
  { label: "My Passes", href: "/student/passes", icon: Ticket },
  { label: "Scan Gate QR", href: "/student/scan", icon: QrCode },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
  { label: "Student Profile", href: "/student/profile", icon: User },
];

const BOTTOM_TABS = [
  { label: "Home", href: "/student/dashboard", icon: Home },
  { label: "Apply", href: "/student/apply", icon: PlusCircle },
  { label: "Scan", href: "/student/scan", icon: QrCode, isRaised: true },
  { label: "Passes", href: "/student/passes", icon: Ticket },
  { label: "Profile", href: "/student/profile", icon: User },
];

function getPageTitle(pathname) {
  if (pathname.startsWith("/student/passes/")) return "Outpass Details";
  switch (pathname) {
    case "/student/dashboard":
      return "Student Dashboard";
    case "/student/apply":
      return "Apply for Outpass";
    case "/student/passes":
      return "My Outpasses";
    case "/student/scan":
      return "Scan Gate QR";
    case "/student/profile":
      return "Student Profile";
    case "/student/notifications":
      return "Notifications";
    case "/student/letters":
      return "Permission Letters";
    default:
      return "Student Portal";
  }
}

export function StudentShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Read sidebar collapsed preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dmi_student_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmi_student_sidebar_collapsed", String(next));
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const pageTitle = getPageTitle(pathname);

  // Desktop / Tablet Sidebar Content
  const sidebarContent = (
    <aside
      className={cn(
        "h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 select-none",
        isCollapsed ? "w-[76px]" : "w-[264px]"
      )}
    >
      <div>
        {/* Brand Header */}
        <div
          className={cn(
            "h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-800/80 gap-3",
            isCollapsed && "justify-center px-2"
          )}
        >
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-400 shadow-sm flex-none">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              fill
              className="object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate" title="DMI College">
                DMI College
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium truncate">
                Student Portal
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5" aria-label="Student Navigation">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/student/passes"
                ? pathname.startsWith("/student/passes")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative whitespace-nowrap",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-none",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-primary dark:text-slate-400"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {/* Student Mini Card */}
        <div
          className={cn(
            "p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3",
            isCollapsed && "justify-center p-1.5"
          )}
        >
          <Avatar name={user?.name || "Student"} size="sm" status="online" />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={user?.name || "Student"}>
                {user?.name || "Rahul Kumar"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {user?.studentId || "CSE-3-001"}
              </p>
            </div>
          )}
        </div>

        {/* Theme Toggle (non-collapsed) */}
        {!isCollapsed && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <span className="text-[10px] font-mono capitalize text-slate-400">{theme}</span>
          </button>
        )}

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-x-clip">
      <SoftBackground />

      {/* 1. DESKTOP & TABLET SIDEBAR (Hidden on phone <768px) */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen z-40">
        {sidebarContent}
      </div>

      {/* 2. MOBILE DRAWER (<1024px overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-scale-in">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 3. MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 w-full relative">
        {/* MOBILE APP BAR (<768px: sticky 56px app bar) */}
        <header className="md:hidden sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-amber-400/60 shrink-0">
                <Image
                  src="/images/dmi-foundations-logo.png"
                  alt="DMI Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="text-sm font-bold leading-none truncate whitespace-nowrap" title="DMI Hostel">
                DMI Hostel
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <PwaInstallPrompt variant="pill" />
            <Link
              href="/student/scan"
              aria-label="Scan QR code"
              className={cn(
                "p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                pathname === "/student/scan" && "text-primary bg-primary/10"
              )}
            >
              <QrCode className="w-4 h-4" />
            </Link>
            <NotificationBell />
            <Link href="/student/profile" className="ml-1" aria-label="Student Profile">
              <Avatar
                name={user?.name || "Student"}
                size="sm"
                status="online"
                className="ring-2 ring-primary/20 cursor-pointer"
              />
            </Link>
          </div>
        </header>

        {/* DESKTOP & TABLET TOP BAR (≥768px: sticky 64px navbar) */}
        <header className="hidden md:flex h-16 sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Quick search button (Command Palette trigger) */}
          <div className="flex-1 max-w-sm hidden lg:block">
            <button
              onClick={() => setIsCmdOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:border-primary/50 dark:hover:border-indigo-500/50 transition text-xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Search passes, rules, profile...</span>
              </div>
              <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCmdOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>

            <PwaInstallPrompt variant="pill" />
            <NotificationBell />

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition"
                aria-label="User menu"
              >
                <Avatar name={user?.name || "Student"} size="sm" status="online" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-scale-in"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user?.name || "Rahul Kumar"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {user?.studentId || "CSE-3-001"}
                    </p>
                  </div>

                  <Link
                    href="/student/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/student/passes"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Ticket className="w-4 h-4 text-slate-400" />
                    <span>Outpasses</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger rounded-xl hover:bg-danger/10 transition mt-1 border-t border-slate-100 dark:border-slate-800 pt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 4. MAIN PAGE CONTENT: Single Document Window Scroll */}
        <main className="flex-1 min-w-0 w-full px-4 sm:px-6 py-6 pb-[calc(var(--tabbar-h)+2rem)] md:pb-8">
          <div className="w-full max-w-6xl mx-auto">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>

        {/* 5. MOBILE BOTTOM TAB BAR (<768px only, fixed 64px) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 flex items-center justify-around z-30 shadow-lg"
          aria-label="Mobile Navigation Bar"
        >
          {BOTTOM_TABS.map((tab) => {
            const isActive =
              tab.href === "/student/passes"
                ? pathname.startsWith("/student/passes")
                : pathname === tab.href;
            const Icon = tab.icon;

            if (tab.isRaised) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex flex-col items-center justify-center flex-1 relative -top-3 group"
                  aria-label="Scan Gate QR"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg ring-4 ring-white dark:ring-slate-900 transition-all duration-200 group-hover:scale-105 active:scale-95",
                      isActive
                        ? "bg-primary shadow-primary/40 ring-primary/20 dark:ring-indigo-500/30"
                        : "bg-primary/95 shadow-primary/25"
                    )}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-0.5 font-bold tracking-tight whitespace-nowrap",
                      isActive ? "text-primary dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 dark:text-slate-400 transition hover:text-primary dark:hover:text-white",
                  isActive && "text-primary dark:text-indigo-400 font-semibold"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
                <span className="text-[11px] mt-1 whitespace-nowrap leading-none">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
    </div>
  );
}

export default StudentShell;
