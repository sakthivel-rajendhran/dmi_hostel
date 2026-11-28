"use client";

import React, { useState } from "react";
import { useSafeSearchParams } from "@/hooks/useSafeSearchParams.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  Clock,
  Download,
  Search,
  Filter,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Calendar,
  Building,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ReadOnlyStudentDrawer } from "@/components/common/ReadOnlyStudentDrawer.jsx";
import { useLateSummary, useLateReturns } from "@/hooks/queries/useOversight.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

export function LateReturnsAudit({ role = "correspondent" }) {
  const searchParams = useSafeSearchParams();
  const initialTab = searchParams.get("tab") || "overdue_now";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [dateRange, setDateRange] = useState("this_month");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [year, setYear] = useState("all");
  const [floor, setFloor] = useState("all");
  const [passType, setPassType] = useState("all");
  const [bucket, setBucket] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: summary, isLoading: isSummaryLoading } = useLateSummary(dateRange);

  const filters = {
    tab: activeTab,
    dateRange,
    search,
    department,
    year,
    floor,
    passType,
    bucket,
  };

  const { data: reportRes, isLoading: isReportLoading } = useLateReturns(filters, page, pageSize);
  const reportData = reportRes?.data || [];
  const reportMeta = reportRes?.meta || {};

  const handleCopyPhone = (e, phone, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedKey(id);
    toast.success("Guardian phone copied!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRowClick = (studentId) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const exportRows = reportData.map((row) => ({
        "Pass ID": row.id,
        "Student ID": row.studentId,
        "Name": row.studentName,
        "Department": row.department,
        "Year": row.year,
        "Floor": row.floorLabel,
        "Room": row.roomNo || row.room,
        "Type": row.type,
        "Expected Return": row.expectedReturnTime,
        "Actual Return": row.actualReturnTime || "STILL OUT",
        "Late By (Min)": row.lateMinutes || 30,
        "Guardian Phone": row.guardianPhone,
        "Status": row.status,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, "Late Returns Audit");
      const filename = `DMI-LateReturns_${activeTab}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${exportRows.length} rows to Excel`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const exportRows = reportData.map((row) => ({
        "Pass ID": row.id,
        "Student ID": row.studentId,
        "Name": row.studentName,
        "Department": row.department,
        "Year": row.year,
        "Floor": row.floorLabel,
        "Room": row.roomNo || row.room,
        "Type": row.type,
        "Expected Return": row.expectedReturnTime,
        "Actual Return": row.actualReturnTime || "STILL OUT",
        "Late By (Min)": row.lateMinutes || 30,
        "Guardian Phone": row.guardianPhone,
        "Status": row.status,
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DMI-LateReturns_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Exported CSV successfully`);
    } catch (err) {
      toast.error("CSV export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: "overdue_now", label: `Overdue Now (${summary?.overdueNow || 0})` },
    { id: "history", label: "Late Returns History" },
    { id: "repeat_offenders", label: `Repeat Offenders (${summary?.repeatOffendersCount || 0})` },
  ];

  const deptOptions = [
    { value: "all", label: "All Departments" },
    ...WORKFLOW_CONFIG.departments.map((d) => ({ value: d.code, label: d.code })),
  ];

  const yearOptions = [
    { value: "all", label: "All Years" },
    { value: "1", label: "1st Year" },
    { value: "2", label: "2nd Year" },
    { value: "3", label: "3rd Year" },
    { value: "4", label: "4th Year" },
  ];

  const floorOptions = [
    { value: "all", label: "All Floors" },
    ...WORKFLOW_CONFIG.floors.map((f) => ({ value: f.id, label: f.label })),
  ];

  const bucketOptions = [
    { value: "all", label: "All Lateness Buckets" },
    { value: "under_30", label: "Under 30 Minutes" },
    { value: "30_120", label: "30 to 120 Minutes" },
    { value: "over_120", label: "Over 2 Hours (>120m)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
            Late Returns & Curfew Compliance Audit
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            Read-only institutional audit of curfew violations, lateness duration & repeat offenders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={FileSpreadsheet}
            onClick={handleExportExcel}
            disabled={isExporting || reportData.length === 0}
          >
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={FileText}
            onClick={handleExportCSV}
            disabled={isExporting || reportData.length === 0}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* 6 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900/60 shadow-sm">
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 block truncate">
            Overdue Now
          </span>
          <span className="text-2xl font-black text-red-600 dark:text-red-400 block">
            {summary?.overdueNow ?? 0}
          </span>
          <span className="text-[10px] text-red-600 dark:text-red-300 font-medium">Curfew breach</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
            Late in Range
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
            {summary?.lateInRange ?? 0}
          </span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Recorded</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
            Avg Lateness
          </span>
          <span className="text-2xl font-black text-text-dark dark:text-white block">
            {summary?.avgLateness ?? 0}m
          </span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Per late return</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
            Longest Delay
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block">
            {summary?.longestLateness ?? 0}m
          </span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Peak violation</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
            Repeat Offenders
          </span>
          <span className="text-2xl font-black text-violet-600 dark:text-violet-400 block">
            {summary?.repeatOffendersCount ?? 0}
          </span>
          <span className="text-[10px] text-violet-600 dark:text-violet-300 font-medium">&ge; 2 in 90 days</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">
            Late Return Rate
          </span>
          <span className="text-2xl font-black text-primary block">
            {summary?.lateRate ?? 0}%
          </span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Of total passes</span>
        </div>
      </div>

      {/* Charts Strip: Trend Line & Return Hour Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 space-y-3">
          <h3 className="font-bold text-xs text-text-dark dark:text-white uppercase tracking-wider">
            Lateness Frequency Trend Over Time
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.trendLine || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" />
                <YAxis fontSize={10} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="count" name="Late Returns" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-bold text-xs text-text-dark dark:text-white uppercase tracking-wider">
            Late Returns by Expected Curfew Hour
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.byHourExpected || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="hour" fontSize={10} stroke="#94A3B8" />
                <YAxis fontSize={10} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                <Bar dataKey="count" name="Violations" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Disciplinary Notice Banner */}
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
        <Info className="w-4 h-4 text-amber-600 flex-none" />
        <span>Disciplinary actions, gate pass suspensions and parent summons are handled strictly by the Chief Warden.</span>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => { setActiveTab(t); setPage(1); }} />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search student name, ID or pass..."
            leftIcon={Search}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} options={deptOptions} />
        <Select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} options={yearOptions} />
        <Select value={floor} onChange={(e) => { setFloor(e.target.value); setPage(1); }} options={floorOptions} />
        <Select value={bucket} onChange={(e) => { setBucket(e.target.value); setPage(1); }} options={bucketOptions} />
      </div>

      {/* DataTable / Collapsible Card View */}
      <Card className="overflow-hidden p-0 border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Dept · Year</th>
                <th className="p-3.5">Floor · Room</th>
                <th className="p-3.5">Pass Details</th>
                <th className="p-3.5">Expected Return</th>
                <th className="p-3.5">Actual Return</th>
                <th className="p-3.5">Late By</th>
                <th className="p-3.5">Guardian Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isReportLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted dark:text-slate-400">
                    No late returns match the current filters.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.studentId)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.studentName} src={row.studentAvatar} size="sm" />
                        <div>
                          <span className="font-bold text-text-dark dark:text-white block">{row.studentName}</span>
                          <span className="text-[11px] font-mono text-slate-500">{row.studentId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {row.department} · Year {row.year}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {row.floorLabel} · {row.roomNo || row.room}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-text-dark dark:text-white block">{row.id}</span>
                      <span className="text-[11px] text-text-muted dark:text-slate-400">{row.type}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {formatDateTime(row.expectedReturnTime)}
                    </td>
                    <td className="p-3.5">
                      {row.isStillOut ? (
                        <span className="px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse">
                          STILL OUT
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">{formatDateTime(row.actualReturnTime)}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        +{row.lateMinutes || 30} min
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                        <span>{row.guardianPhone}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(e, row.guardianPhone, row.id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          title="Copy Guardian Phone"
                        >
                          {copiedKey === row.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportMeta.totalPages > 1 && (
          <div className="p-3.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Showing page {reportMeta.page} of {reportMeta.totalPages} ({reportMeta.total} records)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= reportMeta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Shared Student Drawer */}
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

export default LateReturnsAudit;
