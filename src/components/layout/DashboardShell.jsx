"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  QrCode,
  Users,
  Bed,
  ShieldAlert,
  Shield,
  Megaphone,
  Settings,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  User,
  UserCog,
  Home,
  PlusCircle,
  FileText,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { ROLE_CONFIG, ROLES } from "@/config/roles.js";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { NotificationBell } from "@/components/ui/NotificationBell.jsx";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { CommandPalette } from "./CommandPalette.jsx";
import { PageTransition } from "./PageTransition.jsx";
import { cn } from "@/lib/utils/cn.js";

// Icon mapping helper
const ICON_MAP = {
  LayoutDashboard,
  CheckSquare,
  QrCode,
  Users,
  Bed,
  ShieldAlert,
  Shield,
  Megaphone,
  Settings,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  User,
  UserCog,
  Home,
  PlusCircle,
  FileText,
  Bell,
};

export function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { policy } = usePolicy();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Read sidebar collapsed preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dmi_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("dmi_sidebar_collapsed", String(next));
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const roleKey = user?.role || ROLES.WARDEN;
  const currentRoleConfig = ROLE_CONFIG[roleKey] || ROLE_CONFIG[ROLES.WARDEN];
  const allNavItems = currentRoleConfig.nav || [];
  const navItems = allNavItems.filter((item) => {
    if (item.featureFlag === "studentLetters") {
      return Boolean(policy?.studentLetters?.enabled);
    }
    return true;
  });

  // Role accent styles
  const getRoleAccentBorder = () => {
    switch (roleKey) {
      case ROLES.WARDEN:
        return "border-indigo-500/20";
      case ROLES.STAFF:
        return "border-teal-500/20";
      case ROLES.HOD:
        return "border-purple-500/20";
      case ROLES.PRINCIPAL:
      case ROLES.CORRESPONDENT:
        return "border-amber-500/20";
      default:
        return "border-primary/20";
    }
  };

  const getActiveNavClass = () => {
    switch (roleKey) {
      case ROLES.STAFF:
        return "bg-teal-600 text-white shadow-md shadow-teal-600/25 font-semibold";
      case ROLES.HOD:
        return "bg-violet-600 text-white shadow-md shadow-violet-600/25 font-semibold";
      case ROLES.PRINCIPAL:
      case ROLES.CORRESPONDENT:
        return "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/25 font-semibold";
      default:
        return "bg-primary text-white shadow-md shadow-primary/25 font-semibold";
    }
  };

  const sidebarContent = (
    <aside
      className={cn(
        "h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 select-none",
        isCollapsed ? "w-[76px]" : "w-[264px]"
      )}
    >
      {/* Brand Header */}
      <div>
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
              <h2 className="font-bold text-sm text-text-dark dark:text-white leading-tight truncate">
                DMI College
              </h2>
              <span className="text-[11px] text-text-muted dark:text-slate-400 block font-medium truncate">
                Hostel Admin Portal
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  isActive
                    ? getActiveNavClass()
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-none", isActive ? "text-white" : "text-slate-500 group-hover:text-primary dark:text-slate-400")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {/* User Card */}
        <div
          className={cn(
            "p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3",
            isCollapsed && "justify-center p-1.5"
          )}
        >
          <Avatar name={user?.name || "Administrator"} size="sm" status="online" />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-dark dark:text-white truncate">
                {user?.name || "Admin"}
              </p>
              <p className="text-[10px] text-text-muted dark:text-slate-400 capitalize truncate">
                {currentRoleConfig.label}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium"
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
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-text-dark dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 h-full z-10 animate-scale-in">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <RoleBadge role={roleKey} />
          </div>

          {/* Quick search button (Command Palette trigger) */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setIsCmdOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:border-primary/50 dark:hover:border-indigo-500/50 transition text-xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Search students, outpasses, actions...</span>
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
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>

            <PwaInstallPrompt variant="pill" />
            <NotificationBell />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition"
              >
                <Avatar name={user?.name || "Admin"} size="sm" status="online" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-scale-in"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-text-dark dark:text-white truncate">
                      {user?.name || "Administrator"}
                    </p>
                    <p className="text-[11px] text-text-muted dark:text-slate-400 truncate">
                      {user?.email || "admin@dmi.edu"}
                    </p>
                  </div>
                  <Link
                    href="/design-system"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-text-dark dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Design System</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-xl transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
    </div>
  );
}

export default DashboardShell;
