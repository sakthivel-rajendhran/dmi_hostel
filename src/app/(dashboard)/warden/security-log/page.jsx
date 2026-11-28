"use client";

import React, { useState } from "react";
import { ShieldAlert, Download, Search, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { useSecurityLogs } from "@/hooks/queries/useSecurityLogs.js";
import { securityLogService } from "@/lib/services/securityLogService.js";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenSecurityLogPage() {
  const { data: logs = [], isLoading } = useSecurityLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (log.studentName?.toLowerCase() || "").includes(term) ||
      (log.studentId?.toLowerCase() || "").includes(term) ||
      (log.regNo?.toLowerCase() || "").includes(term) ||
      (log.passId?.toLowerCase() || "").includes(term) ||
      (log.passNumber?.toLowerCase() || "").includes(term) ||
      (log.gateStation?.toLowerCase() || "").includes(term) ||
      (log.gate?.toLowerCase() || "").includes(term);

    const matchType =
      typeFilter === "all" ||
      (typeFilter === "EXIT" && Boolean(log.exitTime)) ||
      (typeFilter === "ENTRY" && Boolean(log.entryTime));

    return matchSearch && matchType;
  });

  const handleExport = async () => {
    const res = await securityLogService.exportSecurityLogs();
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      const headers = [
        "Pass ID",
        "Student Name",
        "Register Number",
        "Gate Station",
        "Exit Time",
        "Entry Time",
        "Current Movement Status",
      ];
      const rows = res.data.map((l) => [
        `"${(l.passNumber || l.passId || "").replace(/"/g, '""')}"`,
        `"${(l.studentName || "").replace(/"/g, '""')}"`,
        `"${(l.regNo || l.studentId || "").replace(/"/g, '""')}"`,
        `"${(l.gateStation || l.gate || "Main Campus Gate").replace(/"/g, '""')}"`,
        `"${l.exitTime ? formatDateTime(l.exitTime) : "—"}"`,
        `"${l.entryTime ? formatDateTime(l.entryTime) : (l.exitTime ? "Not Yet Returned" : "—")}"`,
        `"${(l.status || "").replace(/"/g, '""')}"`,
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Gate_Security_Audit_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${res.data.length} gatepass surveillance records to CSV!`);
    } else {
      toast.info("No security logs available to export.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Security Surveillance Log"
        subtitle="Aggregated surveillance log of gate entries, exits, and student movement status"
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={Download}>
            Export Audit CSV
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search student, pass, or gate..."
            leftIcon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {["all", "EXIT", "ENTRY"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                typeFilter === t
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {t === "all" ? "All Movements" : `${t} Only`}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-text-dark dark:text-white">No security records available.</h4>
            <p className="text-xs text-text-muted dark:text-slate-400 mt-1">
              Gate scanning and checkpoint movements will be recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-text-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Pass ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Gate Station</th>
                  <th className="p-4">Exit Time</th>
                  <th className="p-4">Entry Time</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id || log.passId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    {/* PASS ID */}
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      #{log.passNumber || log.passId}
                    </td>

                    {/* STUDENT */}
                    <td className="p-4">
                      <div className="font-bold text-text-dark dark:text-white">
                        {log.studentName}
                      </div>
                      <div className="font-mono text-primary font-semibold text-[11px] flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span>{log.studentId}</span>
                        {log.regNo && <span className="text-slate-400">({log.regNo})</span>}
                        {log.department && (
                          <span className="text-slate-400 font-normal">
                            • {log.department}{log.year ? ` Yr ${log.year}` : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* GATE STATION */}
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {log.gateStation || log.gate || "Main Campus Gate"}
                    </td>

                    {/* EXIT TIME */}
                    <td className="p-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                      {log.exitTime ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                          <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                          {formatDateTime(log.exitTime)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Exited</span>
                      )}
                    </td>

                    {/* ENTRY TIME */}
                    <td className="p-4 whitespace-nowrap font-mono">
                      {log.entryTime ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                          {formatDateTime(log.entryTime)}
                        </span>
                      ) : log.exitTime ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-500" />
                          Not Yet Returned
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="p-4 whitespace-nowrap">
                      {log.status === "RETURNED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Returned
                        </span>
                      ) : log.status === "OUTSIDE CAMPUS" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Outside Campus
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Not Exited
                        </span>
                      )}
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
