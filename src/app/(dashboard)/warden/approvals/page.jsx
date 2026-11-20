"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Check, X, Search, Filter, FileText, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { usePasses } from "@/hooks/queries/usePasses.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import { passService } from "@/lib/services/passService.js";
import { letterService } from "@/lib/services/letterService.js";
import { formatDateTime } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";

export default function WardenApprovalsPage() {
  const { data: passes = [], isLoading, refetch } = usePasses();
  const { policy } = usePolicy();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [previewLetter, setPreviewLetter] = useState(null);

  const pending = passes.filter((p) => ["pending", "recommended"].includes(p.status));
  const filtered = pending.filter((p) => {
    const matchSearch =
      (p.studentName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (p.studentId?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || (p.type || "").toLowerCase().includes(filterType.toLowerCase());
    return matchSearch && matchType;
  });

  const handleApprove = async (id) => {
    const res = await passService.approvePass(id, "Dr. John Xavier (Chief Warden)", "Approved for campus exit");
    if (res.ok) {
      toast.success(`Pass #${id} approved successfully!`);
      refetch();
    } else {
      if (res.code === "LETTER_REQUIRED") {
        toast.error(res.message, {
          duration: 6000,
          description: "An approved Principal/Correspondent special permission letter is required for this extended pass.",
        });
      } else {
        toast.error(res.message || "Failed to approve pass");
      }
    }
  };

  const handleReject = async (id) => {
    const res = await passService.rejectPass(id, "Dr. John Xavier (Chief Warden)", "Application declined");
    if (res.ok) {
      toast.error(`Pass #${id} rejected.`);
      refetch();
    }
  };

  const handleViewLetter = async (letterId) => {
    const res = await letterService.getById(letterId);
    if (res.ok) {
      setPreviewLetter(res.data);
    } else {
      toast.error("Could not load attached letter.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pass Approvals Queue"
        subtitle="Review, approve, and authorize digital outpass applications"
      />

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by student or ID..."
            leftIcon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {["all", "local", "home"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filterType === t
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {t === "all" ? "All Types" : `${t} Passes`}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Table Card */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-text-dark dark:text-white">No Pending Clearances</h4>
            <p className="text-xs text-text-muted dark:text-slate-400">
              There are no student pass applications waiting for approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-text-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Type & Letter</th>
                  <th className="p-4">Destination</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Expected Window</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((pass) => (
                  <tr key={pass.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-bold text-text-dark dark:text-white">
                        {pass.studentName}
                      </div>
                      <div className="font-mono text-primary font-semibold text-[11px]">
                        {pass.studentId} • Room {pass.roomNo || pass.room || pass.roomNumber}
                      </div>
                    </td>
                    <td className="p-4 space-y-1">
                      <span className="capitalize font-semibold block">{pass.type}</span>
                      {policy?.studentLetters?.enabled && pass.letterId && (
                        <button
                          type="button"
                          onClick={() => handleViewLetter(pass.letterId)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Letter #{pass.letterId}</span>
                        </button>
                      )}
                    </td>
                    <td className="p-4 font-medium">{pass.destination}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {pass.reason}
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(pass.departureTime || pass.fromTime)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(pass.id)}
                          leftIcon={Check}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleReject(pass.id)}
                          leftIcon={X}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Letter Preview Modal */}
      {previewLetter && (
        <Modal
          isOpen={Boolean(previewLetter)}
          onClose={() => setPreviewLetter(null)}
          title={`Attached Permission Letter (${previewLetter.id})`}
          description={`Submitted by ${previewLetter.studentName} (${previewLetter.studentId})`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-text-dark dark:text-white block">{previewLetter.subject}</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{previewLetter.details}</p>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Status: <strong className="capitalize text-primary">{previewLetter.status}</strong></span>
              <span>Document: {previewLetter.fileName}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewLetter(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
