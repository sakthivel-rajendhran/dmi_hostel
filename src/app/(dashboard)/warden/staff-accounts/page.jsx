"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Edit2,
  Copy,
  Check,
  History,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Mail,
  Phone,
  Briefcase,
  Layers,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import {
  useStaffAccounts,
  useAccountAudit,
  useCreateAccount,
  useUpdateAccount,
  useResetPassword,
  useDisableAccount,
  useEnableAccount,
  useRemoveAccount,
  useReassignPending,
} from "@/hooks/queries/useAccounts.js";
import { ROLES } from "@/config/roles.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { gmailSchema } from "@/lib/validators.js";
import { formatDistanceToNow } from "date-fns";

const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science & Engineering (CSE)" },
  { value: "ECE", label: "Electronics & Communication (ECE)" },
  { value: "EEE", label: "Electrical & Electronics (EEE)" },
  { value: "MECH", label: "Mechanical Engineering (MECH)" },
  { value: "CIVIL", label: "Civil Engineering (CIVIL)" },
  { value: "IT", label: "Information Technology (IT)" },
  { value: "AIDS", label: "Artificial Intelligence & Data Science (AIDS)" },
];

const createAccountSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    gmail: gmailSchema,
    role: z.enum([ROLES.STAFF, ROLES.HOD, ROLES.PRINCIPAL, ROLES.CORRESPONDENT]),
    department: z.string().optional(),
    assignedYears: z.array(z.number()).optional(),
    designation: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      if ([ROLES.STAFF, ROLES.HOD].includes(data.role)) {
        return !!data.department && data.department.trim().length > 0;
      }
      return true;
    },
    {
      message: "Department is required for Staff and HOD roles",
      path: ["department"],
    }
  );

export default function StaffAccountsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Selected Account for Actions
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editAction, setEditAction] = useState(null); // 'edit' | 'years' | 'dept'
  const [disableReason, setDisableReason] = useState("");
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isEnableOpen, setIsEnableOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTargetId, setReassignTargetId] = useState("");

  // Queries & Mutations
  const { data: accountsData, isLoading } = useStaffAccounts({
    search,
    role: roleFilter,
    department: deptFilter,
    status: statusFilter,
    page,
    limit: 10,
  });

  const { data: auditData } = useAccountAudit(20);

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const resetMutation = useResetPassword();
  const disableMutation = useDisableAccount();
  const enableMutation = useEnableAccount();
  const removeMutation = useRemoveAccount();
  const reassignMutation = useReassignPending();

  // Create Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    watch: watchCreate,
    setValue: setCreateValue,
    reset: resetCreateForm,
    formState: { errors: createErrors },
  } = useForm({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      gmail: "",
      role: ROLES.STAFF,
      department: "CSE",
      assignedYears: [3],
      designation: "",
      phone: "",
    },
  });

  const selectedRole = watchCreate("role");
  const selectedYears = watchCreate("assignedYears") || [];

  const handleCopyCredentials = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Temporary password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const onConfirmCreate = async (formData) => {
    try {
      const res = await createMutation.mutateAsync(formData);
      setIsCreateOpen(false);
      resetCreateForm();
      setCreatedCredentials({
        name: formData.name,
        gmail: formData.gmail,
        role: formData.role,
        tempPassword: res.tempPassword,
      });
    } catch (err) {
      // toast handled in mutation
    }
  };

  const handleToggleYear = (year) => {
    if (selectedYears.includes(year)) {
      setCreateValue(
        "assignedYears",
        selectedYears.filter((y) => y !== year)
      );
    } else {
      setCreateValue("assignedYears", [...selectedYears, year].sort());
    }
  };

  const handleConfirmDisable = async () => {
    if (!selectedAccount) return;
    await disableMutation.mutateAsync({
      id: selectedAccount.id,
      reason: disableReason,
    });
    setIsDisableOpen(false);
    setDisableReason("");
  };

  const handleConfirmEnable = async () => {
    if (!selectedAccount) return;
    await enableMutation.mutateAsync(selectedAccount.id);
    setIsEnableOpen(false);
  };

  const handleConfirmReset = async () => {
    if (!selectedAccount) return;
    const res = await resetMutation.mutateAsync(selectedAccount.id);
    setIsResetOpen(false);
    setCreatedCredentials({
      name: selectedAccount.name,
      gmail: selectedAccount.gmail,
      role: selectedAccount.role,
      tempPassword: res.tempPassword,
    });
  };

  const handleConfirmRemove = async () => {
    if (!selectedAccount) return;
    try {
      await removeMutation.mutateAsync(selectedAccount.id);
      setIsRemoveOpen(false);
    } catch (err) {
      if (err.message.includes("pending pass request")) {
        setIsRemoveOpen(false);
        setIsReassignOpen(true);
      }
    }
  };

  const handleConfirmReassign = async () => {
    if (!selectedAccount || !reassignTargetId) return;
    await reassignMutation.mutateAsync({
      fromUserId: selectedAccount.id,
      toUserId: reassignTargetId,
    });
    setIsReassignOpen(false);
    setReassignTargetId("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Staff & Executive Accounts"
        subtitle="Manage faculty advisors, department chairs, and institutional executive access."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={History}
              onClick={() => setIsAuditOpen(true)}
            >
              Recent Changes
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={UserPlus}
              onClick={() => setIsCreateOpen(true)}
              className="shadow-md shadow-indigo-600/20"
            >
              Create Account
            </Button>
          </div>
        }
      />

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Accounts</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {accountsData?.stats?.total ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {accountsData?.stats?.active ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Setup</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {accountsData?.stats?.pending ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Disabled</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {accountsData?.stats?.disabled ?? "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search name, Gmail, designation..."
            leftIcon={Search}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All Roles" },
              { value: ROLES.STAFF, label: "Faculty Advisors (Staff)" },
              { value: ROLES.HOD, label: "Heads of Dept (HOD)" },
              { value: ROLES.PRINCIPAL, label: "Principal" },
              { value: ROLES.CORRESPONDENT, label: "Correspondent" },
            ]}
          />
          <Select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All Departments" }, ...DEPARTMENTS]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Password change pending", label: "Password Change Pending" },
              { value: "Disabled", label: "Disabled" },
            ]}
          />
        </div>
      </Card>

      {/* Accounts DataTable */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Account Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department & Cohort</th>
                <th className="py-3 px-4">Gmail ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="w-20 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="w-24 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : !accountsData?.items?.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-sm">No staff or executive accounts found</p>
                    <p className="text-xs mt-0.5">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                accountsData.items.map((acc) => {
                  const isStaff = acc.role === ROLES.STAFF;
                  const isHod = acc.role === ROLES.HOD;
                  const years = Array.isArray(acc.assignedYears) ? acc.assignedYears : [];

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={acc.name}
                            src={acc.photoDataUrl || acc.photo}
                            size="sm"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {acc.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {acc.designation || "Staff Member"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Chip */}
                      <td className="py-3.5 px-4">
                        <RoleBadge role={acc.role} />
                      </td>

                      {/* Department & Cohort */}
                      <td className="py-3.5 px-4">
                        {isStaff || isHod ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {acc.dept || acc.department}
                            </span>
                            {isStaff && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {years.length === 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                    All Years
                                  </span>
                                ) : (
                                  years.map((y) => (
                                    <span
                                      key={y}
                                      className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold"
                                    >
                                      Yr {y}
                                    </span>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Campus-Wide</span>
                        )}
                      </td>

                      {/* Gmail */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {acc.gmail}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            acc.status === "Active"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              : acc.status === "Disabled"
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.status === "Active"
                                ? "bg-emerald-500"
                                : acc.status === "Disabled"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {acc.status}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {acc.lastLogin
                          ? formatDistanceToNow(new Date(acc.lastLogin), { addSuffix: true })
                          : "Never"}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Reset Password */}
                          <button
                            title="Reset Password"
                            onClick={() => {
                              setSelectedAccount(acc);
                              setIsResetOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Disable / Enable Toggle */}
                          {acc.status === "Disabled" ? (
                            <button
                              title="Re-enable Account"
                              onClick={() => {
                                setSelectedAccount(acc);
                                setIsEnableOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              title="Disable Account"
                              onClick={() => {
                                setSelectedAccount(acc);
                                setIsDisableOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Account */}
                          <button
                            title="Remove Account"
                            onClick={() => {
                              setSelectedAccount(acc);
                              setIsRemoveOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: Create Account */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Staff or Executive Account"
      >
        <form onSubmit={handleCreateSubmit(onConfirmCreate)} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name (with Title)
            </label>
            <Input
              placeholder="e.g. Prof. Rajesh Sharma"
              {...registerCreate("name")}
              error={createErrors.name?.message}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Gmail Address
            </label>
            <Input
              placeholder="e.g. rajesh.sharma@gmail.com"
              {...registerCreate("gmail")}
              error={createErrors.gmail?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Role
              </label>
              <Select
                {...registerCreate("role")}
                options={[
                  { value: ROLES.STAFF, label: "Faculty Advisor (Staff)" },
                  { value: ROLES.HOD, label: "Head of Dept (HOD)" },
                  { value: ROLES.PRINCIPAL, label: "Principal" },
                  { value: ROLES.CORRESPONDENT, label: "Correspondent" },
                ]}
              />
            </div>

            {[ROLES.STAFF, ROLES.HOD].includes(selectedRole) && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <Select
                  {...registerCreate("department")}
                  options={DEPARTMENTS}
                  error={createErrors.department?.message}
                />
              </div>
            )}
          </div>

          {selectedRole === ROLES.STAFF && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Student Cohorts (Leave empty for entire department)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((year) => {
                  const isChecked = selectedYears.includes(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleToggleYear(year)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                          : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-white/10 dark:text-slate-400"
                      }`}
                    >
                      Year {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Designation / Title (Optional)
              </label>
              <Input
                placeholder="e.g. Associate Professor"
                {...registerCreate("designation")}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone (Optional)
              </label>
              <Input
                placeholder="e.g. 9876543210"
                {...registerCreate("phone")}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>One-Time Temporary Password:</strong> The system will generate a temporary credentials payload that must be copied and securely delivered to the staff member.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createMutation.isPending}
              className="flex-1 font-bold shadow-md shadow-indigo-600/25"
            >
              Generate Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: One-Time Temporary Credentials Display */}
      <Modal
        isOpen={!!createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        title="Temporary Credentials Created"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
            <p className="font-bold text-sm">Account provisioned successfully!</p>
            <p className="text-xs mt-0.5">
              Deliver these one-time credentials to <strong>{createdCredentials?.name}</strong>. The user will be required to change this password on first login.
            </p>
          </div>

          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
              <span className="text-slate-500">Gmail ID:</span>
              <span className="font-bold text-slate-900 dark:text-white">{createdCredentials?.gmail}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Temporary Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                  {createdCredentials?.tempPassword}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(createdCredentials?.tempPassword)}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  title="Copy Password"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
            <strong>Warning:</strong> For security reasons, this temporary password will not be shown again. Ensure you copy it before closing this window.
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setCreatedCredentials(null)}
            className="w-full font-bold"
          >
            Done & Close
          </Button>
        </div>
      </Modal>

      {/* CONFIRM DIALOG: Reset Password */}
      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Account Password?"
        description={`This will invalidate ${selectedAccount?.name}'s current password and generate a fresh temporary password. The user will be required to update their password upon logging in.`}
        confirmText="Reset Password"
        variant="primary"
        isLoading={resetMutation.isPending}
      />

      {/* MODAL: Disable Account (Reason Required) */}
      <Modal
        isOpen={isDisableOpen}
        onClose={() => {
          setIsDisableOpen(false);
          setDisableReason("");
        }}
        title={`Disable Account: ${selectedAccount?.name}`}
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Disabling this account will instantly block login access with an <code>ACCOUNT_DISABLED</code> error. A mandatory audit reason is required:
          </p>
          <Input
            placeholder="e.g. Extended sabbatical / department transfer hold"
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDisableOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmDisable}
              disabled={disableReason.trim().length < 5}
              isLoading={disableMutation.isPending}
              className="flex-1 font-bold"
            >
              Disable Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DIALOG: Re-enable Account */}
      <ConfirmDialog
        isOpen={isEnableOpen}
        onClose={() => setIsEnableOpen(false)}
        onConfirm={handleConfirmEnable}
        title="Re-enable Account?"
        description={`Allow ${selectedAccount?.name} to log in and resume institutional outpass workflow duties.`}
        confirmText="Re-enable Account"
        variant="primary"
        isLoading={enableMutation.isPending}
      />

      {/* CONFIRM DIALOG: Remove Account */}
      <ConfirmDialog
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Staff Account?"
        description={`Are you sure you want to remove ${selectedAccount?.name}? This action soft-deletes the profile. If there are active pass recommendations in this advisor's cohort, removal will be prevented until requests are reassigned.`}
        confirmText="Remove Account"
        variant="danger"
        isLoading={removeMutation.isPending}
      />

      {/* MODAL: Reassign Pending Recommendations */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title="Reassign Pending Recommendations"
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
            <strong>Pending Requests Exist:</strong> {selectedAccount?.name} has active pass requests awaiting recommendation. Select another advisor in {selectedAccount?.dept} to take over these requests:
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transfer Requests To:
            </label>
            <Select
              value={reassignTargetId}
              onChange={(e) => setReassignTargetId(e.target.value)}
              options={[
                { value: "", label: "Select Faculty Advisor..." },
                ...(accountsData?.items || [])
                  .filter((a) => a.id !== selectedAccount?.id && a.dept === selectedAccount?.dept)
                  .map((a) => ({ value: a.id, label: `${a.name} (${a.designation || a.role})` })),
              ]}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsReassignOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmReassign}
              disabled={!reassignTargetId}
              isLoading={reassignMutation.isPending}
              className="flex-1 font-bold"
            >
              Transfer & Proceed
            </Button>
          </div>
        </div>
      </Modal>

      {/* DRAWER: Recent Audit Log */}
      <Drawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Staff Accounts Audit Trail"
        size="md"
      >
        <div className="space-y-3 p-4 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Chronological record of staff credential creation, cohort changes, and status updates.
          </p>

          <div className="space-y-2 mt-3">
            {!auditData?.length ? (
              <p className="text-center py-8 text-slate-400">No audit events recorded yet.</p>
            ) : (
              auditData.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {log.action.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                    <span>By: {log.actor} ({log.actorRole})</span>
                    <span>•</span>
                    <span>Target: {log.targetName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
