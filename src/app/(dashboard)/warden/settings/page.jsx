"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, ShieldAlert, Check, FileText, CheckCircle2, History } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { usePolicy } from "@/hooks/usePolicy.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

export default function WardenSettingsPage() {
  const { policy, updatePolicy } = usePolicy();

  const [requireStaff, setRequireStaff] = useState(false);
  const [roomAllocationMode, setRoomAllocationMode] = useState("student_enters");
  const [photoPolicy, setPhotoPolicy] = useState("auto_compress");

  // Student Letters Module State
  const [lettersEnabled, setLettersEnabled] = useState(false);
  const [approverMode, setApproverMode] = useState("either");
  const [letterApprovalRequired, setLetterApprovalRequired] = useState(false);
  const [requiredHomeDays, setRequiredHomeDays] = useState(7);

  // Audit list
  const [auditLogs, setAuditLogs] = useState([
    {
      action: "System Initialized",
      timestamp: "2026-11-19 08:30:00",
      actor: "Chief Warden",
    },
  ]);

  useEffect(() => {
    if (policy) {
      setRequireStaff(Boolean(policy.requireStaffRecommendation));
      setRoomAllocationMode(policy.roomAllocationMode || "student_enters");
      setPhotoPolicy(policy.photoPolicy || "auto_compress");

      const sl = policy.studentLetters || {};
      setLettersEnabled(Boolean(sl.enabled));
      setApproverMode(sl.approverMode || "either");
      setLetterApprovalRequired(Boolean(sl.letterApprovalRequired));
      setRequiredHomeDays(sl.requiredHomeDays || 7);
    }
  }, [policy]);

  const handleSave = (e) => {
    e.preventDefault();

    const updated = updatePolicy({
      requireStaffRecommendation: requireStaff,
      roomAllocationMode,
      photoPolicy,
      studentLetters: {
        enabled: lettersEnabled,
        approverMode,
        letterApprovalRequired,
        requiredFor: ["home_over_days"],
        requiredHomeDays: Number(requiredHomeDays),
        maxLetterBytes: 2097152,
        accept: ["application/pdf", "image/jpeg", "image/png"],
        letterTypes: [
          { id: "long_leave", label: "Long leave / Extended Break" },
          { id: "medical", label: "Medical Leave / Hospitalization" },
          { id: "special_event", label: "Special Academic / Sports Duty" },
          { id: "other", label: "Other Special Permission" },
        ],
      },
    });

    const newAudit = {
      action: `Policy updated: Letters ${lettersEnabled ? "ENABLED" : "DISABLED"} (${approverMode})`,
      timestamp: new Date().toLocaleTimeString(),
      actor: "Chief Warden",
    };
    setAuditLogs([newAudit, ...auditLogs]);

    toast.success("Hostel policy and Student Letters configuration updated successfully!");
  };

  const approverModeOptions = [
    { value: "either", label: "Either Principal OR Correspondent" },
    { value: "both", label: "Both Principal AND Correspondent (Dual Approval)" },
    { value: "principal_only", label: "Principal Approval Exclusively" },
    { value: "correspondent_only", label: "Correspondent Approval Exclusively" },
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title="Hostel Policy & Operational Workflows"
        subtitle="Manage switchable operations, room allocation mode, and executive letter approvals"
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Core Approval & Operational Policies */}
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-sm text-text-dark dark:text-white uppercase tracking-wider text-[11px]">
            Academic & Approval Rules
          </h3>

          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-text-dark dark:text-white">
                Require Staff / HOD Recommendation
              </h4>
              <p className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                When enabled, outpasses require academic advisor recommendation before Warden can approve
              </p>
            </div>
            <Switch checked={requireStaff} onChange={setRequireStaff} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Room Allocation Mode"
              value={roomAllocationMode}
              onChange={(e) => setRoomAllocationMode(e.target.value)}
              options={[
                { value: "student_enters", label: "Student Enters at Sign-up" },
                { value: "warden_allocates", label: "Warden Allocates Later" },
              ]}
              helperText="Controls whether students select room during registration"
            />

            <Select
              label="Photo Upload Policy"
              value={photoPolicy}
              onChange={(e) => setPhotoPolicy(e.target.value)}
              options={[
                { value: "auto_compress", label: "Auto-Compress (≤15 MB to 1 MB)" },
                { value: "reject", label: "Reject If > 1 MB" },
              ]}
              helperText="Client-side canvas compression or strict validation"
            />
          </div>
        </Card>

        {/* Card 2: Student Letters Module (Feature Flagged) */}
        <Card className="p-6 space-y-5 border-amber-500/30">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-sm text-text-dark dark:text-white">
                  Student Letters Module (Executive Endorsement)
                </h4>
              </div>
              <p className="text-xs text-text-muted dark:text-slate-400">
                Enables students to submit special permission letters for Principal and Correspondent review. When disabled, all letter UI is removed from all roles.
              </p>
            </div>
            <Switch checked={lettersEnabled} onChange={setLettersEnabled} />
          </div>

          {lettersEnabled && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Executive Approver Mode"
                  value={approverMode}
                  onChange={(e) => setApproverMode(e.target.value)}
                  options={approverModeOptions}
                  helperText="Defines which institutional leader must endorse the letter"
                />

                <Input
                  label="Required Days Threshold for Home Passes"
                  type="number"
                  min={1}
                  max={30}
                  value={requiredHomeDays}
                  onChange={(e) => setRequiredHomeDays(e.target.value)}
                  helperText="Home passes exceeding this duration require an approved letter"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <h5 className="font-semibold text-xs text-text-dark dark:text-white">
                    Strict Gate Pass Enforcement
                  </h5>
                  <p className="text-[11px] text-text-muted dark:text-slate-400">
                    Block Home Pass application and Warden approval until an endorsed letter is linked
                  </p>
                </div>
                <Switch
                  checked={letterApprovalRequired}
                  onChange={setLetterApprovalRequired}
                />
              </div>

              {/* Live Effect Preview */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold block">Live Effect Preview:</span>
                <p>
                  • Module is <strong>ACTIVE</strong>. Letters navigation visible for Principal, Correspondent and Student.
                </p>
                <p>
                  • Approver Mode: <strong>{approverModeOptions.find(o => o.value === approverMode)?.label}</strong>.
                </p>
                <p>
                  • Enforcement: {letterApprovalRequired ? `Home passes exceeding ${requiredHomeDays} days are BLOCKED at application and approval until an approved letter is linked.` : "Letter submissions are advisory and purely informational."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Card 3: Policy Audit Log */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted dark:text-slate-400">
              Policy Configuration Audit Trail
            </h4>
          </div>

          <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="pt-1.5 flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>{log.action}</span>
                <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" leftIcon={Save}>
            Save All Policies
          </Button>
        </div>
      </form>
    </div>
  );
}
