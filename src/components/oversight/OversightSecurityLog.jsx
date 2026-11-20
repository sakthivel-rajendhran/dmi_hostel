"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Shield,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { ReadOnlyStudentDrawer } from "@/components/common/ReadOnlyStudentDrawer.jsx";
import { useOversightSecurityLog } from "@/hooks/queries/useOversight.js";
import { reportService } from "@/lib/services/reportService.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn.js";

export function OversightSecurityLog({ role = "principal" }) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'local' | 'home'
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all"); // 'all' | 'EXIT' | 'ENTRY'
  const [sourceFilter, setSourceFilter] = useState("all"); // 'all' | 'student_scan' | 'manual_override'
  const [lateOnly, setLateOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const filters = {
    search,
    type: actionFilter === "all" ? "" : actionFilter,
    page,
    pageSize,
  };

  const { data: logsRes, isLoading } = useOversightSecurityLog(filters);
  const rawLogs = logsRes?.data || [];
  const meta = logsRes?.meta || {};

  // Tab and client-side filter passes
  const filteredLogs = rawLogs.filter((log) => {
    if (activeTab === "local" && (log.passType || "").toLowerCase().includes("home")) return false;
    if (activeTab === "home" && !(log.passType || "").toLowerCase().includes("home")) return false;
    if (sourceFilter !== "all" && log.source !== sourceFilter) return false;
    if (lateOnly && !log.isLate) return false;
    return true;
  });

  const handleRowClick = (studentId) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const res = await reportService.exportReport({ type: "security_log" });
      if (!res.ok) throw new Error(res.message);

      const wb = XLSX.utils.book_new();
      (res.data.sheets || []).forEach((sh) => {
        const ws = XLSX.utils.json_to_sheet(sh.data);
        XLSX.utils.book_append_sheet(wb, ws, sh.name);
      });

      XLSX.writeFile(wb, res.data.filename);
      toast.success(`Exported ${res.data.rows.length} logs to ${res.data.filename}`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const res = await reportService.exportReport({ type: "security_log" });
      if (!res.ok) throw new Error(res.message);

      const ws = XLSX.utils.json_to_sheet(res.data.rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.csvFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Security log exported as CSV");
    } catch (err) {
      toast.error("CSV export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: "all", label: "All Movements" },
    { id: "local", label: "Local Pass Logs" },
    { id: "home", label: "Home Pass Logs" },
  ];

  const totalExits = rawLogs.filter((l) => l.type === "EXIT").length;
  const totalEntries = rawLogs.filter((l) => l.type === "ENTRY").length;
  const totalLate = rawLogs.filter((l) => l.isLate).length;
  const totalOverrides = rawLogs.filter((l) => l.isManualOverride).length;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
            Campus Gate Security Surveillance Log
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400">
            Immutable, read-only audit stream of digital QR scans and warden manual gate overrides
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">Total Logs</span>
          <span className="text-2xl font-black text-text-dark dark:text-white block">{rawLogs.length}</span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Recorded stream</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">Gate Exits</span>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block">{totalExits}</span>
          <span className="text-[10px] text-sky-600 dark:text-sky-300 font-medium">Campus departures</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">Re-entries</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{totalEntries}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">Verified returns</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">Still Outside</span>
          <span className="text-2xl font-black text-violet-600 dark:text-violet-400 block">{Math.max(0, totalExits - totalEntries)}</span>
          <span className="text-[10px] text-text-muted dark:text-slate-400">Active passes</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-text-muted dark:text-slate-400 block truncate">Late Entries</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">{totalLate}</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-300 font-medium">Curfew alerts</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/60 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block truncate">Manual Overrides</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 block">{totalOverrides}</span>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Auditable events</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(t) => { setActiveTab(t); setPage(1); }} />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Input
          placeholder="Search student, pass, or gate..."
          leftIcon={Search}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />

        <Select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          options={[
            { value: "all", label: "All Movements (EXIT & ENTRY)" },
            { value: "EXIT", label: "Exits Only" },
            { value: "ENTRY", label: "Entries Only" },
          ]}
        />

        <Select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          options={[
            { value: "all", label: "All Verification Sources" },
            { value: "student_scan", label: "Student QR Scans" },
            { value: "manual_override", label: "Manual Warden Overrides" },
          ]}
        />

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <input
            type="checkbox"
            id="lateFilter"
            checked={lateOnly}
            onChange={(e) => { setLateOnly(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
          />
          <label htmlFor="lateFilter" className="text-text-dark dark:text-white font-medium cursor-pointer">
            Late curfew violations only
          </label>
        </div>
      </div>

      {/* Log Table */}
      <Card className="overflow-hidden p-0 border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Time (IST)</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Dept · Year</th>
                <th className="p-3.5">Pass ID & Type</th>
                <th className="p-3.5">Movement</th>
                <th className="p-3.5">Verification Source</th>
                <th className="p-3.5">Status & Lateness</th>
                <th className="p-3.5">Gate / Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted dark:text-slate-400">
                    No gate movement logs match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleRowClick(log.studentId)}
                    className={cn(
                      "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors",
                      log.isManualOverride && "bg-amber-50/30 dark:bg-amber-950/15"
                    )}
                  >
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={log.studentName} src={log.studentAvatar} size="sm" />
                        <div>
                          <span className="font-bold text-text-dark dark:text-white block">{log.studentName}</span>
                          <span className="text-[11px] font-mono text-slate-500">{log.studentId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {log.department} · {log.floorLabel || "Floor"}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-text-dark dark:text-white block">{log.passId}</span>
                      <span className="text-[11px] text-text-muted dark:text-slate-400">{log.passType || "Local Pass"}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full font-bold font-mono text-[11px] inline-flex items-center gap-1",
                          log.type === "EXIT"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        )}
                      >
                        {log.type === "EXIT" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {log.isManualOverride ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 inline-block">
                            ⚠️ Manual Override
                          </span>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 max-w-xs leading-tight">
                            Reason: {log.overrideReason}
                          </p>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Digital QR Scan
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {log.isLate ? (
                        <span className="px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Late (+{log.lateMinutes || 25}m)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {log.gate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

export default OversightSecurityLog;
