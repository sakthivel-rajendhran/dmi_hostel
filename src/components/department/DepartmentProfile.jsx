"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Bell,
  Save,
  RotateCcw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { PasswordInput } from "@/components/ui/PasswordInput.jsx";
import { PhotoPicker } from "@/components/ui/PhotoPicker.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import {
  useStaffProfile,
  useUpdateStaffProfile,
  useStaffPreferences,
  useUpdateStaffPreferences,
} from "@/hooks/queries/useDepartment.js";
import { authService } from "@/lib/services/authService.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

export function DepartmentProfile({ role = "staff" }) {
  const { user } = useAuth();
  const isHod = role === "hod";

  const { data: profile, isLoading: isProfileLoading } = useStaffProfile();
  const updateProfileMutation = useUpdateStaffProfile();

  const { data: prefs, isLoading: isPrefsLoading } = useStaffPreferences();
  const updatePrefsMutation = useUpdateStaffPreferences();

  // Form states
  const [formData, setFormData] = useState({
    phone: "",
    designation: "",
    bio: "",
    photo: null,
  });

  const [initialData, setInitialData] = useState({
    phone: "",
    designation: "",
    bio: "",
    photo: null,
  });

  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    smsAlerts: true,
    emergencyPush: true,
    dailyDigest: true,
  });

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync initial profile
  useEffect(() => {
    if (profile) {
      const data = {
        phone: profile.phone || "+91 98765 00003",
        designation: profile.designation || (isHod ? "Head of Department" : "Faculty Advisor"),
        bio: profile.bio || "Academic mentor and student outpass advisor.",
        photo: profile.photoDataUrl || profile.photo || null,
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [profile, isHod]);

  // Sync preferences
  useEffect(() => {
    if (prefs) {
      setPreferences(prefs);
    }
  }, [prefs]);

  // Dirty check
  const isDirty =
    formData.phone !== initialData.phone ||
    formData.designation !== initialData.designation ||
    formData.bio !== initialData.bio ||
    formData.photo !== initialData.photo;

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        phone: formData.phone,
        designation: formData.designation,
        bio: formData.bio,
        photoDataUrl: formData.photo,
      });
      setInitialData(formData);
      toast.success("Profile changes saved successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleDiscard = () => {
    setFormData(initialData);
    toast.info("Changes discarded");
  };

  const handleTogglePref = async (key, val) => {
    const updated = { ...preferences, [key]: val };
    setPreferences(updated);
    try {
      await updatePrefsMutation.mutateAsync({ [key]: val });
      toast.success("Notification preferences updated");
    } catch (e) {
      toast.error("Failed to update preferences");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwordFields.newPassword || passwordFields.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(
        passwordFields.currentPassword,
        passwordFields.newPassword
      );
      if (res.ok) {
        toast.success("Password changed successfully!");
        setIsPasswordModalOpen(false);
        setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(res.message || "Password update failed.");
      }
    } catch (err) {
      setPasswordError("An unexpected error occurred.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const assignedYears = profile?.assignedYears || user?.assignedYears || [];
  const deptCode = profile?.dept || user?.dept || "CSE";
  const deptName = profile?.departmentName || "Computer Science & Engineering";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title={`${isHod ? "HOD" : "Staff"} Profile & Department Role`}
        subtitle="Manage contact coordinates, academic cohort scopes and security credentials"
      />

      {/* Floating / Sticky Dirty Save Bar */}
      {isDirty && (
        <div className="sticky top-20 z-20 p-3.5 rounded-2xl bg-amber-500 text-white shadow-lg flex items-center justify-between gap-4 animate-scale-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You have unsaved profile changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDiscard}
              className="h-7 text-xs bg-white text-slate-800 border-none hover:bg-slate-100"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSaveProfile}
              isLoading={updateProfileMutation.isPending}
              className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Profile Header & Photo Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Photo Picker */}
          <div className="w-full md:w-48 shrink-0 flex flex-col items-center">
            <PhotoPicker
              value={formData.photo}
              onChange={(dataUrl) => setFormData((prev) => ({ ...prev, photo: dataUrl }))}
              label="Staff Photo"
              required={false}
              className="w-36 h-36 mx-auto"
            />
          </div>

          {/* Core Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {profile?.name || user?.name || "Faculty Member"}
                </h2>
                <RoleBadge role={role} />
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  {deptCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {deptName} • DMI College of Engineering
              </p>
            </div>

            {/* Read-Only Assigned Years Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned Academic Cohort Oversight</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isHod || assignedYears.length === 0 ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    All Department Cohorts (Years 1 – 4)
                  </span>
                ) : (
                  assignedYears.map((yr) => (
                    <span
                      key={yr}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                    >
                      Year {yr} Residents
                    </span>
                  ))
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                {isHod
                  ? "As Head of the Department, you have advisory oversight across all academic years in your department."
                  : "Assigned by the Chief Warden. Contact the hostel administration office to request reassignment of academic batches."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Editable Details Form */}
      <Card className="p-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Editable Contact Coordinates
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Official Email (Locked)
            </label>
            <Input
              value={profile?.email || profile?.gmail || "staff@dmice.ac.in"}
              disabled
              leftIcon={Mail}
              className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Official Phone / WhatsApp
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              leftIcon={Phone}
              placeholder="+91 98765 00000"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Designation Display Title
            </label>
            <Input
              value={formData.designation}
              onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="e.g. Assistant Professor & Faculty Advisor"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Academic Bio & Office Coordinates
            </label>
            <Textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Cabin location, counseling hours, or academic specialization..."
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={!isDirty}
            isLoading={updateProfileMutation.isPending}
            leftIcon={Save}
            className={cn(
              "text-xs font-semibold text-white",
              isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"
            )}
          >
            Save Profile Details
          </Button>
        </div>
      </Card>

      {/* Security & Password */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Account Security & Password
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Change your login credentials or manage temporary password status
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            leftIcon={KeyRound}
            className="text-xs"
          >
            Change Password
          </Button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Department Notification Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure how you receive alerts regarding pass applications and curfew breaches
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
          <div className="py-3 flex items-center justify-between">
            <Switch
              checked={preferences.emailAlerts}
              onChange={(val) => handleTogglePref("emailAlerts", val)}
              label="Email Notifications"
              description="Receive email alerts whenever a resident applies for a pass"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <Switch
              checked={preferences.smsAlerts}
              onChange={(val) => handleTogglePref("smsAlerts", val)}
              label="Curfew Overdue SMS Alerts"
              description="Get instant SMS notification when an assigned student exceeds their curfew"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <Switch
              checked={preferences.emergencyPush}
              onChange={(val) => handleTogglePref("emergencyPush", val)}
              label="Emergency Outpass Priority Alerts"
              description="Instant high-priority notification for medical or emergency passes"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <Switch
              checked={preferences.dailyDigest}
              onChange={(val) => handleTogglePref("dailyDigest", val)}
              label="Daily Morning Digest"
              description="Receive an 08:00 AM summary of students currently outside campus"
            />
          </div>
        </div>
      </Card>

      {/* Modal: Change Password */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Account Password"
        description="Ensure your new password contains at least 6 characters."
      >
        <form onSubmit={handleChangePassword} className="space-y-4 pt-2 text-xs">
          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300">
              {passwordError}
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Current Password
            </label>
            <PasswordInput
              value={passwordFields.currentPassword}
              onChange={(e) =>
                setPasswordFields((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              New Password
            </label>
            <PasswordInput
              value={passwordFields.newPassword}
              onChange={(e) =>
                setPasswordFields((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              placeholder="Enter new password (min. 6 chars)"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Confirm New Password
            </label>
            <PasswordInput
              value={passwordFields.confirmPassword}
              onChange={(e) =>
                setPasswordFields((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              placeholder="Confirm new password"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isChangingPassword}
              className={cn("text-xs text-white", isHod ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700")}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DepartmentProfile;
