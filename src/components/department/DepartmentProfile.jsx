"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Building,
  Shield,
  Mail,
  Phone,
  Briefcase,
  Layers,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit3,
  X,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useStaffProfile, useUpdateStaffProfile } from "@/hooks/queries/useDepartment.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

const AVAILABLE_DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering (CSE)" },
  { code: "IT", name: "Information Technology (IT)" },
  { code: "ECE", name: "Electronics & Communication (ECE)" },
  { code: "EEE", name: "Electrical & Electronics (EEE)" },
  { code: "MECH", name: "Mechanical Engineering (MECH)" },
  { code: "AIDS", name: "AI & Data Science (AIDS)" },
  { code: "CYBER", name: "Cyber Security (CYBER)" },
];

export function DepartmentProfile({ role = "staff" }) {
  const { user } = useAuth();
  const isHod = role === "hod";

  // Fetch live profile from MySQL via staffService
  const { data: profile, isLoading, refetch: refetchProfile } = useStaffProfile();
  const updateProfileMutation = useUpdateStaffProfile();

  // Active user details (live MySQL query with fallback to active session)
  const currentProfile = profile || user || {};

  const name = currentProfile.name || "Academic Officer";
  const loginId = currentProfile.id || "—";
  const department = currentProfile.department || currentProfile.dept || "CSE";
  const roleDisplay = isHod ? "Head of Department" : "Faculty Advisor";
  const email = currentProfile.email || "Not configured";
  const phone = currentProfile.phone || "Not configured";
  const designation = currentProfile.designation || (isHod ? "Head of Department" : "Assistant Professor");
  const assignedYears = currentProfile.assignedYears;

  const assignedScopeText =
    assignedYears && Array.isArray(assignedYears) && assignedYears.length > 0
      ? `Year ${assignedYears.join(", ")} Residents`
      : isHod
      ? "All Department Batches (Years 1–4)"
      : "All Academic Years Scope";

  // Accent styling based on role
  const accentTheme = isHod
    ? {
        badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        deptBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        btnClass: "bg-violet-600 hover:bg-violet-700 text-white",
        activeBorder: "border-purple-500",
        iconColor: "text-purple-600 dark:text-purple-400",
      }
    : {
        badgeBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        deptBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        btnClass: "bg-teal-600 hover:bg-teal-700 text-white",
        activeBorder: "border-teal-500",
        iconColor: "text-teal-600 dark:text-teal-400",
      };

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "CSE",
    email: "",
    designation: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Sync form data with currentProfile whenever profile data loads or changes
  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || "",
        department: currentProfile.department || currentProfile.dept || "CSE",
        email: currentProfile.email && currentProfile.email !== "Not configured" ? currentProfile.email : "",
        designation: currentProfile.designation || (isHod ? "Head of Department" : "Assistant Professor"),
      });
    }
  }, [currentProfile, isHod]);

  const handleStartEdit = () => {
    setFormError("");
    setFormSuccess("");
    setFormData({
      name: currentProfile.name || "",
      department: currentProfile.department || currentProfile.dept || "CSE",
      email: currentProfile.email && currentProfile.email !== "Not configured" ? currentProfile.email : "",
      designation: currentProfile.designation || (isHod ? "Head of Department" : "Assistant Professor"),
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormError("");
    setFormSuccess("");
    setFormData({
      name: currentProfile.name || "",
      department: currentProfile.department || currentProfile.dept || "CSE",
      email: currentProfile.email && currentProfile.email !== "Not configured" ? currentProfile.email : "",
      designation: currentProfile.designation || (isHod ? "Head of Department" : "Assistant Professor"),
    });
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    // Required field validation
    if (!formData.name || formData.name.trim().length < 2) {
      setFormError("Full Name is required (minimum 2 characters).");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      setFormError("Please enter a valid institutional email address.");
      return;
    }

    if (!formData.designation || formData.designation.trim().length < 2) {
      setFormError("Designation is required.");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: currentProfile.id || loginId,
        name: formData.name.trim(),
        department: formData.department.trim(),
        email: formData.email.trim().toLowerCase(),
        designation: formData.designation.trim(),
      });

      setFormSuccess("Profile details updated and saved successfully!");
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      refetchProfile();
    } catch (err) {
      const msg = err.message || "Failed to save profile changes to database.";
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Page Header */}
      <PageHeader
        title="Account Profile"
        subtitle="Institutional identity, department assignment, and verified profile credentials"
      />

      {/* ── 1. Text-Based Profile Identity Card ── */}
      <Card className="p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Pure text-based profile identity: NO image, NO avatar, NO photo picker */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {name}
                </h2>
                <span
                  className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                    accentTheme.badgeBg
                  )}
                >
                  {roleDisplay}
                </span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                    accentTheme.deptBg
                  )}
                >
                  {department}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap font-medium">
                <span>Login ID:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {loginId}
                </span>
                <span>•</span>
                <span>Role:</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold capitalize">
                  {role}
                </span>
                <span>•</span>
                <span>Scope:</span>
                <span className="text-slate-700 dark:text-slate-200">{assignedScopeText}</span>
              </p>
            </div>

            {/* Active Account Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold self-start sm:self-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active Account</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── 2. Editable Profile Information Card ── */}
      <Card className="p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className={cn("w-4 h-4", accentTheme.iconColor)} />
              <span>Profile Information</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified institutional details stored directly in MySQL
            </p>
          </div>

          {!isLoading && (
            <div>
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEdit}
                  leftIcon={Edit3}
                  className="text-xs font-semibold"
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    leftIcon={X}
                    disabled={updateProfileMutation.isPending}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    isLoading={updateProfileMutation.isPending}
                    leftIcon={Save}
                    className={cn("text-xs font-semibold", accentTheme.btnClass)}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Banners */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isEditing ? (
          /* ── EDIT MODE FORM ── */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Editable: Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Read-Only Protected: Login ID */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between mb-1">
                  <span>Login ID / Username</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Read-only
                  </span>
                </label>
                <div className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center text-sm font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed">
                  {loginId}
                </div>
              </div>

              {/* Editable: Department */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {AVAILABLE_DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Read-Only Protected: Portal Role */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between mb-1">
                  <span>Portal Role</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Read-only
                  </span>
                </label>
                <div className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center text-sm font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed">
                  {roleDisplay}
                </div>
              </div>

              {/* Editable: Email Address */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@dmi.edu.in"
                  required
                />
              </div>

              {/* Editable: Designation */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Designation <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.designation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Assistant Professor"
                  required
                />
              </div>

              {/* Read-Only Contact Phone */}
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Contact Phone
                </span>
                <div className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed">
                  {phone}
                </div>
              </div>

              {/* Read-Only Scope */}
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Advisory Scope
                </span>
                <div className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed">
                  {assignedScopeText}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={updateProfileMutation.isPending}
                leftIcon={Save}
                className={cn("text-xs font-semibold", accentTheme.btnClass)}
              >
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE DISPLAY ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Full Name
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{name}</p>
            </div>

            {/* Login ID */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
                <span>Login ID / Username</span>
                <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Read-only
                </span>
              </span>
              <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                {loginId}
              </p>
            </div>

            {/* Department */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Department
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{department}</span>
              </p>
            </div>

            {/* Portal Role */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
                <span>Portal Role</span>
                <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Read-only
                </span>
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>{roleDisplay}</span>
              </p>
            </div>

            {/* Email Address */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <p
                className={cn(
                  "text-sm font-medium flex items-center gap-1.5 truncate",
                  email === "Not configured"
                    ? "text-slate-400 italic"
                    : "text-slate-800 dark:text-slate-100"
                )}
              >
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
            </div>

            {/* Designation */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Designation
              </span>
              <p
                className={cn(
                  "text-sm font-medium flex items-center gap-1.5",
                  designation === "Not configured"
                    ? "text-slate-400 italic"
                    : "text-slate-800 dark:text-slate-100"
                )}
              >
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{designation}</span>
              </p>
            </div>

            {/* Phone Number */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Contact Phone
              </span>
              <p
                className={cn(
                  "text-sm font-medium flex items-center gap-1.5",
                  phone === "Not configured"
                    ? "text-slate-400 italic"
                    : "text-slate-800 dark:text-slate-100"
                )}
              >
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{phone}</span>
              </p>
            </div>

            {/* Advisory Academic Scope */}
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Advisory Scope
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{assignedScopeText}</span>
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default DepartmentProfile;
