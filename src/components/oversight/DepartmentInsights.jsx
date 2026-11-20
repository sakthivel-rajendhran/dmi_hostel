"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Download,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Building,
  GraduationCap,
  Calendar,
  FileSpreadsheet,
  FileText,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ReadOnlyStudentDrawer } from "@/components/common/ReadOnlyStudentDrawer.jsx";
import { useDeptComparison, useDeptDrilldown } from "@/hooks/queries/useOversight.js";
import { reportService } from "@/lib/services/reportService.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

export function DepartmentInsights({ role = "principal" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDept = searchParams.get("dept");

  const [dateRange, setDateRange] = useState("this_month");
  const [selectedMetric, setSelectedMetric] = useState("lateReturnRate");
  const [sortColumn, setSortColumn] = useState("lateReturnRate");
  const [sortDirection, setSortDirection] = useState("desc");
  const [drilldownDept, setDrilldownDept] = useState(urlDept || null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(Boolean(urlDept));
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: deptData, isLoading } = useDeptComparison(dateRange);
  const { data: drilldown, isLoading: isDrillLoading } = useDeptDrilldown(drilldownDept, dateRange);

  const handleOpenDrilldown = (code) => {
    setDrilldownDept(code);
    setIsDrilldownOpen(true);
  };

  const handleCloseDrilldown = () => {
    setIsDrilldownOpen(false);
    setDrilldownDept(null);
  };

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("desc");
    }
  };

  const handleOpenStudent = (sId) => {
    setSelectedStudentId(sId);
    setIsStudentDrawerOpen(true);
  };

  // Sort departments table
  const sortedDepartments = [...(deptData?.departments || [])].sort((a, b) => {
    const valA = a[sortColumn] ?? 0;
    const valB = b[sortColumn] ?? 0;
    if (typeof valA === "string") {
      return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === "asc" ? valA - valB : valB - valA;
  });

  // Export multi-sheet Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const res = await reportService.exportReport({ type: "campus_summary", filters: { range: dateRange } });
      if (!res.ok) throw new Error(res.message);

      const wb = XLSX.utils.book_new();
      (res.data.sheets || []).forEach((sh) => {
        const ws = XLSX.utils.json_to_sheet(sh.data);
        XLSX.utils.book_append_sheet(wb, ws, sh.name);
      });

      XLSX.writeFile(wb, res.data.filename);
      toast.success(`Exported ${res.data.rows.length} rows to ${res.data.filename}`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const res = await reportService.exportReport({ type: "campus_summary", filters: { range: dateRange } });
      if (!res.ok) throw new Error(res.message);

      const ws = XLSX.utils.json_to_sheet(res.data.rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.data.csvFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported CSV successfully`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const metricOptions = [
    { value: "lateReturnRate", label: "Late Return Rate (%)" },
    { value: "passesInRange", label: "Total Passes Issued" },
    { value: "students", label: "Hosteller Residents Count" },
    { value: "approvalRate", label: "Approval Rate (%)" },
    { value: "avgLateness", label: "Average Lateness (Minutes)" },
  ];

  const dateOptions = [
    { value: "today", label: "Today" },
    { value: "7days", label: "Past 7 Days" },
    { value: "this_month", label: "This Month" },
    { value: "this_semester", label: "This Semester" },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
            Department Insights & Comparative Analytics
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            Cross-department hosteller census, outpass quotas, curfew adherence and recommendation activity
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-36">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={dateOptions}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            leftIcon={FileSpreadsheet}
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            leftIcon={FileText}
            onClick={handleExportCSV}
            disabled={isExporting}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* Threshold Hint Card */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-text-dark dark:text-white">Late Return Thresholds:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
            Amber Warning &gt; 10%
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-800 dark:text-red-300 font-medium">
            Red Disciplinary Alert &gt; 20%
          </span>
        </div>
        <span className="text-[11px] text-text-muted dark:text-slate-400 hidden sm:inline">
          Configured in workflow policy
        </span>
      </div>

      {/* Comparative Department Table */}
      <Card className="overflow-hidden p-0 border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    <span>Department</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("students")}>
                  <div className="flex items-center gap-1">
                    <span>Residents</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("inCampus")}>
                  In Campus
                </th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("out")}>
                  Out
                </th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("passesInRange")}>
                  Passes
                </th>
                <th className="p-3.5">Local / Home</th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("approvalRate")}>
                  Approval %
                </th>
                <th className="p-3.5 cursor-pointer hover:text-text-dark dark:hover:text-white" onClick={() => handleSort("lateReturnRate")}>
                  <div className="flex items-center gap-1">
                    <span>Late Rate</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3.5">Avg Late</th>
                <th className="p-3.5 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="p-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : (
                sortedDepartments.map((dept) => (
                  <tr
                    key={dept.code}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3.5 font-bold text-text-dark dark:text-white">
                      <div>
                        <span>{dept.name}</span>
                        <span className="block text-[11px] font-mono text-slate-500 font-normal">
                          {dept.code}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold font-mono text-slate-700 dark:text-slate-300">
                      {dept.students}
                    </td>
                    <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      {dept.inCampus}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {dept.out}
                    </td>
                    <td className="p-3.5 font-bold font-mono text-primary">
                      {dept.passesInRange}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {dept.localShare}% / {dept.homeShare}%
                    </td>
                    <td className="p-3.5 font-semibold font-mono text-slate-700 dark:text-slate-300">
                      {dept.approvalRate}%
                    </td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full font-bold font-mono text-xs inline-block",
                          dept.isRed
                            ? "bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 animate-pulse"
                            : dept.isAmber
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {dept.lateReturnRate}%
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {dept.avgLateness > 0 ? `${dept.avgLateness} min` : "—"}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDrilldown(dept.code)}
                        className="text-primary hover:text-primary-dark"
                      >
                        <span>Drilldown</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ranked Bar Chart with Metric Selector */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-text-dark dark:text-white">
              Comparative Ranking by Selected Metric
            </h3>
            <p className="text-xs text-text-muted dark:text-slate-400">
              Interactive departmental comparison based on active institutional criteria
            </p>
          </div>

          <div className="w-64">
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              options={metricOptions}
            />
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedDepartments}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="code" fontSize={11} stroke="#94A3B8" />
              <YAxis fontSize={11} stroke="#94A3B8" />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              <Bar dataKey={selectedMetric} fill="#D97706" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Day of Week Heatmap */}
      <Card className="p-5 space-y-3">
        <h3 className="font-bold text-sm text-text-dark dark:text-white">
          Department Movement Density Heatmap (By Day of Week)
        </h3>
        <p className="text-xs text-text-muted dark:text-slate-400">
          Concentration of gate pass exits by day of week across all 7 academic departments
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase text-[10px]">
                <th className="text-left p-2">Dept</th>
                <th className="p-2">Mon</th>
                <th className="p-2">Tue</th>
                <th className="p-2">Wed</th>
                <th className="p-2">Thu</th>
                <th className="p-2">Fri</th>
                <th className="p-2">Sat</th>
                <th className="p-2">Sun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(deptData?.heatmap || []).map((row) => (
                <tr key={row.dept}>
                  <td className="text-left font-bold font-mono p-2 text-text-dark dark:text-white">{row.dept}</td>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                    const count = row[d] || 0;
                    return (
                      <td key={d} className="p-2">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-md font-mono text-[11px] block",
                            count > 10
                              ? "bg-amber-600 text-white font-bold"
                              : count > 6
                              ? "bg-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Department Drill-Down Drawer */}
      <Drawer
        isOpen={isDrilldownOpen}
        onClose={handleCloseDrilldown}
        title={`${drilldownDept || "Department"} Detailed Drilldown`}
        description={drilldown?.deptName || "Academic & Movement Analysis"}
        size="lg"
      >
        {isDrillLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : !drilldown ? (
          <div className="p-8 text-center text-text-muted">No drilldown data available.</div>
        ) : (
          <div className="space-y-6">
            {/* Year Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted dark:text-slate-400">
                Year-Wise Resident Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(drilldown.yearBreakdown || []).map((yr) => (
                  <div key={yr.year} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-bold text-text-dark dark:text-white block">{yr.yearLabel}</span>
                    <span className="text-text-muted dark:text-slate-400 text-[11px] block">{yr.students} Residents</span>
                    <span className="font-mono text-primary font-bold text-xs block mt-1">{yr.passes} passes</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequent Leavers in this Department */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted dark:text-slate-400">
                Top Frequent Leavers (Outpass Volume)
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {(drilldown.frequentLeavers || []).slice(0, 5).map((s) => (
                  <div
                    key={s.studentId}
                    onClick={() => handleOpenStudent(s.studentId)}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <div>
                        <h5 className="font-bold text-text-dark dark:text-white">{s.name}</h5>
                        <span className="text-[11px] font-mono text-slate-500">
                          {s.studentId} · {s.floorLabel} Room {s.roomNo}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {s.passCount} passes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Late Return Watchlist (>= 2 in 90 days) */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Late Return Watchlist (&ge; 2 Late in 90 Days)</span>
              </h4>
              {(drilldown.lateWatchlist || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs">
                  Zero students in this department have repeat late returns.
                </div>
              ) : (
                <div className="space-y-2">
                  {drilldown.lateWatchlist.map((w) => (
                    <div
                      key={w.studentId}
                      onClick={() => handleOpenStudent(w.studentId)}
                      className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 flex justify-between items-center text-xs cursor-pointer hover:bg-red-50"
                    >
                      <div>
                        <h5 className="font-bold text-text-dark dark:text-white">{w.name}</h5>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {w.studentId} · {w.floorLabel} Room {w.roomNo}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full font-bold font-mono text-[11px] bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                        {w.lateCount} Curfew Violations
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Staff & HOD Recommendation Activity */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted dark:text-slate-400">
                Staff & HOD Review Activity
              </h4>
              <div className="space-y-2">
                {(drilldown.staffActivity || []).map((staff, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-text-dark dark:text-white block">{staff.name}</span>
                      <span className="text-[11px] text-text-muted dark:text-slate-400">{staff.role}</span>
                    </div>
                    <div className="text-right text-[11px] font-mono">
                      <span className="text-emerald-600 font-bold">{staff.recommended} recommended</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">{staff.avgTurnaround} turnaround</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Student Drawer */}
      <ReadOnlyStudentDrawer
        studentId={selectedStudentId}
        isOpen={isStudentDrawerOpen}
        onClose={() => {
          setIsStudentDrawerOpen(false);
          setSelectedStudentId(null);
        }}
      />
    </div>
  );
}

export default DepartmentInsights;
