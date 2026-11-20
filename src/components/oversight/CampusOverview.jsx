"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ArrowRight,
  TrendingUp,
  Download,
  Building,
  Bed,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  HeartHandshake,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { StatusBadge } from "@/components/ui/StatusBadge.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ReadOnlyStudentDrawer } from "@/components/common/ReadOnlyStudentDrawer.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useCampusOverview } from "@/hooks/queries/useOversight.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

/**
 * Institutional Campus Overview Portal
 * Shared between Principal (emphasizes academic/curfew signals) and Correspondent (emphasizes institutional/welfare trends)
 */
export function CampusOverview({ role = "principal" }) {
  const router = useRouter();
  const { user } = useAuth();
  const isPrincipal = role === "principal";
  const basePath = isPrincipal ? "/principal" : "/correspondent";

  const [dateRange, setDateRange] = useState("this_month");
  const [currentTime, setCurrentTime] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Live Clock
  useEffect(() => {
    setMounted(true);
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: overview, isLoading, isFetching, refetch } = useCampusOverview(dateRange);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Phone number copied!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenStudentDrawer = (studentId) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "7days", label: "Past 7 Days" },
    { value: "this_month", label: "This Month" },
    { value: "this_semester", label: "This Semester (6 Months)" },
  ];

  const kpis = overview?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Institutional Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-slate-50 to-slate-100 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border border-amber-500/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              {isPrincipal ? "Academic & Campus Oversight" : "Executive Management & Trust Oversight"}
            </span>
            {isFetching && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Live syncing
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-text-dark dark:text-white tracking-tight">
            Welcome, {user?.name || (isPrincipal ? "Dr. Joseph Lawrence" : "Rev. Fr. Mary Antony")}
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            {isPrincipal ? "Principal & Academic Director" : "Correspondent & Managing Trustee"} · DMI College of Engineering
          </p>
        </div>

        {/* Date, Live Clock & Window Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-text-dark dark:text-white">
              {formatDate(new Date(), "EEEE, dd MMMM yyyy")}
            </p>
            <p className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
              {currentTime || "12:00:00 PM"}
            </p>
          </div>

          <div className="w-48">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={dateRangeOptions}
            />
          </div>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        ) : (
          <>
            {/* 1. Total Students */}
            <div
              onClick={() => router.push(`${basePath}/departments`)}
              className="cursor-pointer p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all shadow-sm group"
            >
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Hostellers
              </span>
              <span className="text-xl font-black text-text-dark dark:text-white block">
                {kpis.totalHostelStudents?.value || 40}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate block">
                {kpis.totalHostelStudents?.delta || "Enrolled"}
              </span>
            </div>

            {/* 2. In Campus */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                In Campus
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                {kpis.inCampus?.value || 32}
              </span>
              <span className="text-[10px] text-text-muted dark:text-slate-400 truncate block">
                {kpis.inCampus?.delta || "80% present"}
              </span>
            </div>

            {/* 3. Out Local */}
            <div
              onClick={() => router.push(`${basePath}/security-log`)}
              className="cursor-pointer p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 transition-all shadow-sm"
            >
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Out (Local)
              </span>
              <span className="text-xl font-black text-sky-600 dark:text-sky-400 block">
                {kpis.outLocal?.value || 3}
              </span>
              <span className="text-[10px] text-text-muted dark:text-slate-400 truncate block">
                Curfew 21:00
              </span>
            </div>

            {/* 4. Out Home */}
            <div
              onClick={() => router.push(`${basePath}/security-log`)}
              className="cursor-pointer p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 transition-all shadow-sm"
            >
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Out (Home)
              </span>
              <span className="text-xl font-black text-violet-600 dark:text-violet-400 block">
                {kpis.outHome?.value || 3}
              </span>
              <span className="text-[10px] text-text-muted dark:text-slate-400 truncate block">
                Leaves
              </span>
            </div>

            {/* 5. Overdue Now (Alert Card) */}
            <div
              onClick={() => router.push(`${basePath}/late-returns?tab=overdue_now`)}
              className={cn(
                "cursor-pointer p-3 rounded-2xl border transition-all shadow-sm",
                (kpis.overdueNow?.value || 0) > 0
                  ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 animate-pulse"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}
            >
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 block truncate">
                Overdue Now
              </span>
              <span className="text-xl font-black text-red-600 dark:text-red-400 block">
                {kpis.overdueNow?.value || 0}
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-300 font-medium truncate block">
                {(kpis.overdueNow?.value || 0) > 0 ? "Curfew Breach" : "Zero Overdue"}
              </span>
            </div>

            {/* 6. Late Returns in Range */}
            <div
              onClick={() => router.push(`${basePath}/late-returns?tab=history`)}
              className="cursor-pointer p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all shadow-sm"
            >
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Late in Range
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
                {kpis.lateReturnsInRange?.value || 4}
              </span>
              <span className="text-[10px] text-text-muted dark:text-slate-400 truncate block">
                History
              </span>
            </div>

            {/* 7. Passes Issued */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Passes Issued
              </span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block">
                {kpis.passesInRange?.value || 28}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate block">
                +12% volume
              </span>
            </div>

            {/* 8. Bed Occupancy */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
                Bed Occupancy
              </span>
              <span className="text-xl font-black text-text-dark dark:text-white block">
                {kpis.hostelOccupancy?.value || "83%"}
              </span>
              <span className="text-[10px] text-text-muted dark:text-slate-400 truncate block">
                480 capacity
              </span>
            </div>
          </>
        )}
      </div>

      {/* Needs Attention Strip (Read-only Curfew Breaches) */}
      {(overview?.needsAttention || []).length > 0 && (
        <Card className="p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-none" />
              <div>
                <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
                  Needs Attention: {overview.needsAttention.length} Students Currently Overdue
                </h3>
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  Curfew grace period exceeded. Disciplinary action is managed by the Chief Warden.
                </p>
              </div>
            </div>
            <Link
              href={`${basePath}/late-returns?tab=overdue_now`}
              className="text-xs font-semibold text-red-700 dark:text-red-300 hover:underline flex items-center gap-1"
            >
              <span>View full audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.needsAttention.map((s) => (
              <div
                key={s.passId}
                onClick={() => handleOpenStudentDrawer(s.studentId)}
                className="cursor-pointer p-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/60 shadow-sm hover:shadow-md transition-all space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.name} src={s.avatar} size="sm" />
                    <div>
                      <h4 className="font-bold text-xs text-text-dark dark:text-white truncate">
                        {s.name}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500">{s.studentId}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                    Late by {s.lateMinutes}m
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>{s.department} · {s.floorLabel}</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span>{s.guardianPhone}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(s.guardianPhone, s.passId);
                      }}
                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      {copiedKey === s.passId ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Role-Specific Featured Widgets (Principal vs Correspondent) */}
      {isPrincipal ? (
        /* PRINCIPAL VIEW: Department Comparison & Frequent Leavers */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-text-dark dark:text-white">
                  Academic Discipline: Department Curfew & Late Return Rate
                </h3>
                <p className="text-xs text-text-muted dark:text-slate-400">
                  Percentage of passes returned late by department
                </p>
              </div>
              <Link
                href={`${basePath}/departments`}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Department details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-64 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.deptComparison || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="code" fontSize={11} stroke="#94A3B8" />
                    <YAxis unit="%" fontSize={11} stroke="#94A3B8" />
                    <Tooltip
                      formatter={(val) => [`${val}%`, "Late Return Rate"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar dataKey="lateReturnRate" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Frequent Leavers Strip */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-text-dark dark:text-white">
              Frequent Leavers (High Outpass Activity)
            </h3>
            <p className="text-xs text-text-muted dark:text-slate-400">
              Students with most frequent gate pass requests
            </p>

            <div className="space-y-2 pt-1">
              {(overview?.frequentLeavers || []).slice(0, 5).map((fl) => (
                <div
                  key={fl.studentId}
                  onClick={() => handleOpenStudentDrawer(fl.studentId)}
                  className="cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={fl.name} size="sm" />
                    <div>
                      <h4 className="font-bold text-text-dark dark:text-white">{fl.name}</h4>
                      <span className="text-[11px] text-slate-500">
                        {fl.department} · {fl.floorLabel}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {fl.passCount} passes
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* CORRESPONDENT VIEW: Month-on-Month Trends & Emergency/Welfare */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-text-dark dark:text-white">
                  Institutional Growth: Passes Stacked by Month vs Baseline
                </h3>
                <p className="text-xs text-text-muted dark:text-slate-400">
                  Monthly movement trends across 6 months (Local vs Home)
                </p>
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Semester View
              </span>
            </div>

            <div className="h-64 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.passesStacked || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="period" fontSize={11} stroke="#94A3B8" />
                    <YAxis fontSize={11} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                    <Legend />
                    <Bar dataKey="local" name="Local Pass" stackId="a" fill="#0EA5E9" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="home" name="Home Pass" stackId="a" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="previousPeriod" name="Prev Period Baseline" stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Emergency & Welfare Card */}
          <Card className="p-5 space-y-4 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-slate-900 border-amber-500/20">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-amber-600 flex-none" />
              <div>
                <h3 className="font-bold text-sm text-text-dark dark:text-white">
                  Emergency & Student Welfare
                </h3>
                <p className="text-[11px] text-text-muted dark:text-slate-400">
                  Trustee health, medical leave & safety adherence
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300">Emergency Outpasses</span>
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  {overview?.emergencyWelfare?.emergencyPasses || 2}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300">Medical / Clinic Leaves</span>
                <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {overview?.emergencyWelfare?.medicalPasses || 4}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300">Students Away &gt; 3 Days</span>
                <span className="font-bold text-sm text-violet-600 dark:text-violet-400">
                  {overview?.emergencyWelfare?.longAbsenceStudents || 2}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex justify-between items-center">
                <span>Parent Notification Delivery</span>
                <span className="font-bold">99.4% Verified</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Movement Charts & Floor Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movements by Hour of Day */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-text-dark dark:text-white">
                Campus Gate Movements by Hour of Day
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400">
                Gate exits vs re-entries across 24 hours
              </p>
            </div>
            <span className="text-xs text-text-muted dark:text-slate-400">
              Peak: 16:00–18:00
            </span>
          </div>

          <div className="h-60 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.movementsByHour || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="hour" fontSize={10} stroke="#94A3B8" interval={2} />
                  <YAxis fontSize={10} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                  <Legend />
                  <Bar dataKey="exits" name="Gate Exits" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="entries" name="Gate Entries" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Floor Occupancy (4 Horizontal Bars) */}
        <Card className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-text-dark dark:text-white">
                Hostel Floor Occupancy
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400">
                One complex · 4 floors · 120 beds each
              </p>
            </div>
            <Bed className="w-4 h-4 text-amber-500" />
          </div>

          <div className="space-y-4 pt-1">
            {(overview?.floorOccupancy || []).map((fl) => (
              <div key={fl.floorId} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-slate-700 dark:text-slate-300">{fl.floorLabel}</span>
                  <span className="font-mono text-text-dark dark:text-white">
                    {fl.occupied} / {fl.capacity} ({fl.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      fl.pct > 90 ? "bg-amber-600" : "bg-primary"
                    )}
                    style={{ width: `${fl.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Live Campus Gate Scanner Activity Feed */}
      <Card className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-text-dark dark:text-white">
                Live Gate Scanner Activity Feed
              </h3>
              <p className="text-xs text-text-muted dark:text-slate-400">
                Real-time gate scan verification stream (re-fetches every 15s)
              </p>
            </div>
          </div>
          <Link
            href={`${basePath}/security-log`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Complete security log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {(overview?.recentActivity || []).slice(0, 5).map((act) => (
            <div
              key={act.id}
              onClick={() => handleOpenStudentDrawer(act.studentId)}
              className="cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all text-xs space-y-1.5"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-text-dark dark:text-white truncate">
                  {act.passId}
                </span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                    act.type === "EXIT"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  )}
                >
                  {act.type}
                </span>
              </div>

              <p className="font-semibold text-text-dark dark:text-white truncate">{act.studentName}</p>
              <p className="text-[11px] text-slate-500">{act.department} · {act.gate}</p>

              {act.isManualOverride && (
                <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 truncate" title={act.overrideReason}>
                  ⚠️ Manual Override: {act.overrideReason}
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{formatDateTime(act.timestamp)}</span>
                {act.isLate && <span className="text-red-500 font-bold">Late Entry</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Shared Read-Only Student Drawer */}
      <ReadOnlyStudentDrawer
        studentId={selectedStudentId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStudentId(null);
        }}
      />
    </div>
  );
}

export default CampusOverview;
