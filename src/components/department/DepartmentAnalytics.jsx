"use client";

import React, { useState, useEffect } from "react";
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
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Phone,
  Bed,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useDeptAnalytics } from "@/hooks/queries/useDepartment.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

export function DepartmentAnalytics() {
  const { user } = useAuth();
  const deptCode = user?.dept || user?.department || "CSE";
  const deptName = user?.departmentName || "Computer Science & Engineering";

  const [dateRange, setDateRange] = useState("this_month");
  const [mounted, setMounted] = useState(false);
  const [tableTab, setTableTab] = useState("leavers");

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: analytics, isLoading, refetch } = useDeptAnalytics(dateRange);

  const kpis = analytics?.kpis || {
    totalRequests: 0,
    approvalRate: "0%",
    rejectionRate: "0%",
    avgRecommendationTime: "0 hrs",
    lateReturnsRate: "0%",
    overdueIncidents: 0,
    mostActiveYear: "3rd Year",
  };

  const monthlyTrend = analytics?.monthlyTrend || [];
  const passesByYear = analytics?.passesByYear || [];
  const peakExitDays = analytics?.peakExitDays || [];
  const peakExitHours = analytics?.peakExitHours || [];
  const statusDonut = analytics?.statusDonut || [];
  const lateReturnsTrend = analytics?.lateReturnsTrend || [];
  const frequentLeavers = analytics?.frequentLeavers || [];
  const lateWatchlist = analytics?.lateWatchlist || [];
  const staffActivity = analytics?.staffActivity || [];

  // Multi-sheet Excel Export via SheetJS
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Department Summary & KPIs
      const summaryData = [
        { Parameter: "Department", Value: `${deptCode} - ${deptName}` },
        { Parameter: "Date Range Scope", Value: dateRange.replace(/_/g, " ").toUpperCase() },
        { Parameter: "Report Generation Date", Value: new Date().toISOString() },
        { Parameter: "Total Pass Requests", Value: kpis.totalRequests },
        { Parameter: "Approval Rate", Value: kpis.approvalRate },
        { Parameter: "Rejection Rate", Value: kpis.rejectionRate },
        { Parameter: "Avg Recommendation Time", Value: kpis.avgRecommendationTime },
        { Parameter: "Late Return Rate", Value: kpis.lateReturnsRate },
        { Parameter: "Overdue Incidents", Value: kpis.overdueIncidents },
        { Parameter: "Most Active Cohort", Value: kpis.mostActiveYear },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary KPIs");

      // Sheet 2: Frequent Leavers
      const leaversData = frequentLeavers.map((item, idx) => ({
        Rank: idx + 1,
        "Student ID": item.studentId,
        "Student Name": item.studentName,
        Year: `Year ${item.year}`,
        Floor: item.floor,
        Room: item.room,
        "Total Passes": item.totalPasses,
        "Local Passes": item.localPasses,
        "Home Passes": item.homePasses,
        "Late Returns": item.lateCount,
      }));
      const wsLeavers = XLSX.utils.json_to_sheet(leaversData);
      XLSX.utils.book_append_sheet(wb, wsLeavers, "Frequent Leavers");

      // Sheet 3: Late-Return Watchlist
      const watchlistData = lateWatchlist.map((item) => ({
        "Student ID": item.studentId,
        "Student Name": item.studentName,
        Year: `Year ${item.year}`,
        Room: item.room,
        Floor: item.floor,
        "Student Phone": item.phone,
        "Guardian Phone": item.guardianPhone,
        "Late Incidents (90D)": item.lateReturnsCount,
        "Last Late Timestamp": item.lastLateDate,
      }));
      const wsWatchlist = XLSX.utils.json_to_sheet(watchlistData);
      XLSX.utils.book_append_sheet(wb, wsWatchlist, "Late Return Watchlist");

      // Sheet 4: Staff Activity
      const staffData = staffActivity.map((item) => ({
        "Faculty Advisor": item.name,
        Role: item.role,
        "Assigned Cohorts": item.assignedYears,
        "Passes Recommended": item.recommended,
        "Passes Declined": item.notRecommended,
        "Avg Turnaround Time": item.avgTurnaround,
        "Pending In Queue": item.pending,
      }));
      const wsStaff = XLSX.utils.json_to_sheet(staffData);
      XLSX.utils.book_append_sheet(wb, wsStaff, "Staff Advisory Activity");

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `DMI-${deptCode}-Hostel-Report_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported complete multi-sheet report: ${filename}`);
    } catch (err) {
      toast.error(`Excel export failed: ${err.message}`);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const rows = [
        ["Metric", "Value"],
        ["Department", deptCode],
        ["Total Requests", kpis.totalRequests],
        ["Approval Rate", kpis.approvalRate],
        ["Rejection Rate", kpis.rejectionRate],
        ["Avg Turnaround", kpis.avgRecommendationTime],
        ["Late Return Rate", kpis.lateReturnsRate],
        ["Overdue Incidents", kpis.overdueIncidents],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `DMI-${deptCode}-Summary_${dateStr}.csv`;
      a.click();
      toast.success("Exported Summary CSV");
    } catch (e) {
      toast.error("CSV export failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Department Analytics & Hostel Governance (${deptCode})`}
        subtitle="Statistical outpass trends, peak departure hours, curfew adherence & advisor workloads"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={Download}
            className="text-xs"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            leftIcon={FileSpreadsheet}
            className="text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white"
          >
            Export Multi-Sheet Excel (.xlsx)
          </Button>
        </div>
      </PageHeader>

      {/* Date Range Selector Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-violet-600" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "this_semester", label: "This Semester" },
            { id: "all_time", label: "Academic Year" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition",
                dateRange === item.id
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7 KPI StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        <StatCard
          title="Total Requests"
          value={kpis.totalRequests}
          subtitle="Scoped outpasses"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Approval Rate"
          value={kpis.approvalRate}
          subtitle="Warden cleared"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Rejection Rate"
          value={kpis.rejectionRate}
          subtitle="Curfew/policy"
          icon={XCircle}
          variant="default"
        />
        <StatCard
          title="Turnaround"
          value={kpis.avgRecommendationTime}
          subtitle="Avg advisory time"
          icon={Clock}
          variant="teal"
        />
        <StatCard
          title="Late Returns"
          value={kpis.lateReturnsRate}
          subtitle="Of total returns"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatCard
          title="Overdue Right Now"
          value={kpis.overdueIncidents}
          subtitle="Active breaches"
          icon={ShieldAlert}
          variant={kpis.overdueIncidents > 0 ? "rose" : "default"}
        />
        <StatCard
          title="Most Active"
          value={kpis.mostActiveYear}
          subtitle="Highest pass count"
          icon={Users}
          variant="violet"
        />
      </div>

      {/* Recharts Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Trend (Stacked Local vs Home) */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Pass Volume (Stacked)
              </h3>
              <p className="text-xs text-slate-400">Local Day Passes vs Home Weekend Outpasses</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              6-Month Trend
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="local" name="Local Pass" stackId="a" fill="#0D9488" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="home" name="Home Pass" stackId="a" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 2: Passes by Academic Year */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pass Volume by Academic Cohort
              </h3>
              <p className="text-xs text-slate-400">Distribution across 1st through 4th Year residents</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              Cohorts
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={passesByYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Bar dataKey="count" name="Total Passes" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 3: Peak Exit Days of the Week */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Peak Gate Departures by Day
              </h3>
              <p className="text-xs text-slate-400">Student movement concentration (Monday – Sunday)</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              Weekly Rhythm
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakExitDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Bar dataKey="count" name="Exits" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 4: Peak Exit Hours (Area Chart) */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Hourly Departure Distribution
              </h3>
              <p className="text-xs text-slate-400">Gate departures throughout the day (06:00 – 20:00)</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              Time of Day
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakExitHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Departures"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 5: Status Distribution (Donut Pie) */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Outpass Status Breakdown
              </h3>
              <p className="text-xs text-slate-400">Approval, on-time returns, and late incidents</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              Status Shares
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 6: Late Returns Trend (Line Chart) */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Late Return Incidents by Week
              </h3>
              <p className="text-xs text-slate-400">Weekly occurrences of curfew elapsed entries</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
              Curfew Breaches
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lateReturnsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Late Incidents"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* In-Depth Governance Tables */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Department Governance & Audit Tables
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditable registers for repeat leavers, curfew breaches, and faculty workloads
            </p>
          </div>

          <Tabs
            tabs={[
              { id: "leavers", label: `Frequent Leavers (${frequentLeavers.length})` },
              { id: "watchlist", label: `Late Watchlist (${lateWatchlist.length})` },
              { id: "staff", label: `Staff Activity (${staffActivity.length})` },
            ]}
            activeTab={tableTab}
            onChange={setTableTab}
          />
        </div>

        {/* Table 1: Frequent Leavers */}
        {tableTab === "leavers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Academic & Room</th>
                  <th className="py-3 px-4 text-center">Total Passes</th>
                  <th className="py-3 px-4 text-center">Local / Home</th>
                  <th className="py-3 px-4 text-center">Late Returns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {frequentLeavers.map((item, idx) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.studentName}
                      <span className="block text-[11px] text-slate-400 font-mono font-normal">
                        {item.studentId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      Year {item.year} • Room {item.room} ({item.floor})
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {item.totalPasses}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {item.localPasses}L / {item.homePasses}H
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.lateCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {item.lateCount} Late
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 2: Late-Return Watchlist */}
        {tableTab === "watchlist" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Year & Room</th>
                  <th className="py-3 px-4">Incidents (90D)</th>
                  <th className="py-3 px-4">Last Late Return</th>
                  <th className="py-3 px-4 text-right">Emergency Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lateWatchlist.map((item) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.studentName}
                      <span className="block text-[11px] text-slate-400 font-mono font-normal">
                        {item.studentId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      Year {item.year} • Room {item.room} ({item.floor})
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        <AlertTriangle className="w-3 h-3" />
                        {item.lateReturnsCount} Breaches
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatDate(item.lastLateDate)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.guardianPhone ? (
                        <a
                          href={`tel:${item.guardianPhone}`}
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-primary font-semibold"
                        >
                          <Phone className="w-3 h-3 text-rose-500" />
                          <span>{item.guardianPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 3: Staff Activity */}
        {tableTab === "staff" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Faculty Advisor</th>
                  <th className="py-3 px-4">Assigned Cohorts</th>
                  <th className="py-3 px-4 text-center">Recommended</th>
                  <th className="py-3 px-4 text-center">Not Recommended</th>
                  <th className="py-3 px-4 text-center">Avg Turnaround</th>
                  <th className="py-3 px-4 text-center">Pending Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffActivity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.name}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {item.assignedYears}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                      {item.recommended}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-600 font-mono">
                      {item.notRecommended}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {item.avgTurnaround}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.pending}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default DepartmentAnalytics;
