"use client";

import React, { useState } from "react";
import { ShieldAlert, Download, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
    const matchSearch =
      (log.studentName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (log.studentId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (log.gate || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === "all" || log.movementType === typeFilter;
    return matchSearch && matchType;
  });

  const handleExport = async () => {
    const res = await securityLogService.exportSecurityLogs();
    if (res.ok) {
      toast.success("Security log exported as CSV!");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Security Surveillance Log"
        subtitle="Immutable timestamped record of every gate entry and exit event"
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={Download}>
            Export Audit CSV
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search student or gate..."
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-text-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Movement</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Pass ID</th>
                  <th className="p-4">Gate Station</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => {
                  const isExit = log.movementType === "EXIT";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-4 text-slate-500 whitespace-nowrap font-mono">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            isExit
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {isExit ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                          {log.movementType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-text-dark dark:text-white">
                          {log.studentName}
                        </div>
                        <div className="font-mono text-primary font-semibold text-[11px]">
                          {log.studentId}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-semibold">#{log.passId}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{log.gate}</td>
                      <td className="p-4">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
