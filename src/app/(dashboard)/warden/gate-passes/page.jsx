"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { QrCode, Search, ShieldCheck, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { passService } from "@/lib/services/passService.js";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenGatePassesPage() {
  const { data: passes = [], isLoading, refetch } = usePasses();
  const [searchTerm, setSearchTerm] = useState("");

  const approved = passes.filter((p) =>
    ["approved", "gate_pass_issued", "out"].includes(p.status)
  );

  const filtered = approved.filter(
    (p) =>
      (p.studentName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.studentId?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleIssueGatePass = async (id) => {
    const res = await passService.issueGatePass(id);
    if (res.ok) {
      toast.success(`Gate pass issued for Pass #${id}!`);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Passes Directory"
        subtitle="Active authorizations cleared for security gate scanner"
      />

      <div className="w-full sm:w-72">
        <Input
          placeholder="Search by student or ID..."
          leftIcon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading passes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <QrCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm">No Active Gate Passes</h4>
            <p className="text-xs text-text-muted dark:text-slate-400">
              Approved passes ready for gate checkout will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-text-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Pass ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Valid Until</th>
                  <th className="p-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((pass) => (
                  <tr key={pass.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-mono font-bold text-text-dark dark:text-white">
                      #{pass.id}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-text-dark dark:text-white">
                        {pass.studentName}
                      </div>
                      <div className="font-mono text-primary font-semibold text-[11px]">
                        {pass.studentId} • Room {pass.roomNumber}
                      </div>
                    </td>
                    <td className="p-4 capitalize font-medium">{pass.type}</td>
                    <td className="p-4">
                      <StatusChip status={pass.status} size="sm" />
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(pass.toTime)}
                    </td>
                    <td className="p-4 text-right">
                      {pass.status === "approved" ? (
                        <Button
                          size="xs"
                          onClick={() => handleIssueGatePass(pass.id)}
                          leftIcon={QrCode}
                        >
                          Issue Gate Pass
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4" /> Ready at Gate
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
