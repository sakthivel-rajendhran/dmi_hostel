"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  LogOut,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { PasswordInput } from "@/components/ui/PasswordInput.jsx";
import { PhotoPicker } from "@/components/ui/PhotoPicker.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { usePolicy } from "@/hooks/usePolicy.js";
import {
  useStaffProfile,
  useUpdateStaffProfile,
  useStaffPreferences,
  useUpdateStaffPreferences,
} from "@/hooks/queries/useDepartment.js";
import { authService } from "@/lib/services/authService.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

export function OversightProfile({ role = "principal" }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { policy } = usePolicy();
  const isPrincipal = role === "principal";

  const { data: profile, isLoading: isProfileLoading } = useStaffProfile();
  const updateProfileMutation = useUpdateStaffProfile();

  const { data: prefs, isLoading: isPrefsLoading } = useStaffPreferences();
  const updatePrefsMutation = useUpdateStaffPreferences();

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    photoDataUrl: null,
  });
  const [initialData, setInitialData] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Logout Dialog
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Sync profile data
  useEffect(() => {
    if (profile) {
      const initial = {
        name: profile.name || (isPrincipal ? "Dr. Joseph Lawrence" : "Rev. Fr. Mary Antony"),
        phone: profile.phone || (isPrincipal ? "+91 98765 00008" : "+91 98765 00009"),
        bio: profile.bio || (isPrincipal ? "Principal & Academic Director leading engineering excellence and campus safety." : "Correspondent & Managing Trustee ensuring student welfare and trust administration."),
        photoDataUrl: profile.photoDataUrl || null,
      };
      setFormData(initial);
      setInitialData(initial);
      setIsDirty(false);
    }
  }, [profile, isPrincipal]);

  const handleChange = (field, value) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    setIsDirty(
      next.name !== initialData.name ||
      next.phone !== initialData.phone ||
      next.bio !== initialData.bio ||
      next.photoDataUrl !== initialData.photoDataUrl
    );
  };

  const handleReset = () => {
    setFormData(initialData);
    setIsDirty(false);
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    await updateProfileMutation.mutateAsync(formData);
    setInitialData(formData);
    setIsDirty(false);
  };

  const handleTogglePref = async (key) => {
    const currentVal = prefs ? prefs[key] : true;
    await updatePrefsMutation.mutateAsync({ [key]: !currentVal });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.ok) {
        toast.success("Password changed successfully!");
        setIsPasswordModalOpen(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(res.message || "Failed to update password.");
      }
    } catch (err) {
      setPasswordError(err.message || "An error occurred.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-dark dark:text-white tracking-tight">
          Executive Profile & Security Preferences
        </h1>
        <p className="text-xs text-text-muted dark:text-slate-400">
          Personal contact coordinates, password credentials, and institutional oversight alerts
        </p>
      </div>

      {isProfileLoading ? (
        <Card className="p-8 space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 bg-gradient-to-r from-amber-500/10 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-amber-500/20">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <PhotoPicker
                  value={formData.photoDataUrl}
                  onChange={(dataUrl) => handleChange("photoDataUrl", dataUrl)}
                  className="mx-auto sm:mx-0"
                />
                <span className="text-[11px] text-text-muted dark:text-slate-400 block">
                  Click to upload official photo
                </span>
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-text-dark dark:text-white">
                    {formData.name || (isPrincipal ? "Dr. Joseph Lawrence" : "Rev. Fr. Mary Antony")}
                  </h2>
                  <RoleBadge role={role} />
                </div>

                <p className="text-xs text-text-muted dark:text-slate-400 font-medium">
                  {isPrincipal ? "Principal & Academic Director" : "Correspondent & Managing Trustee"} · DMI College of Engineering
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>{profile?.gmail || (isPrincipal ? "principal.dmi@gmail.com" : "correspondent.dmi@gmail.com")}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Verified Google Workspace
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Coordinates Card */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-dark dark:text-white uppercase tracking-wider text-[11px]">
              Executive Coordinates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Display Name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                leftIcon={User}
              />
              <Input
                label="Direct Phone Number"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                leftIcon={Phone}
                placeholder="+91 98765 00000"
              />
            </div>

            <Textarea
              label="Institutional Bio / Note"
              rows={3}
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="Brief professional profile or campus advisory note..."
            />
          </Card>

          {/* Security & Password Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-text-dark dark:text-white">
                  Security Credentials
                </h3>
                <p className="text-xs text-text-muted dark:text-slate-400">
                  Last password update: 14 days ago · Session encrypted
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={KeyRound}
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Change Password
              </Button>
            </div>
          </Card>

          {/* Institutional Notification Preferences */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-text-dark dark:text-white uppercase tracking-wider text-[11px]">
              Notification & Oversight Preferences
            </h3>

            <div className="space-y-4 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="font-semibold text-text-dark dark:text-white">Daily Campus Census Summary</h4>
                  <p className="text-text-muted dark:text-slate-400 text-[11px]">
                    Receive 21:00 curfew closure digest and active hosteller headcount
                  </p>
                </div>
                <Switch
                  checked={prefs?.dailySummary ?? true}
                  onChange={() => handleTogglePref("dailySummary")}
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <h4 className="font-semibold text-text-dark dark:text-white">Curfew Overdue Emergency Alerts</h4>
                  <p className="text-text-muted dark:text-slate-400 text-[11px]">
                    Immediate in-app push notification when any resident exceeds curfew grace period
                  </p>
                </div>
                <Switch
                  checked={prefs?.overdueAlerts ?? true}
                  onChange={() => handleTogglePref("overdueAlerts")}
                />
              </div>

              {policy?.studentLetters?.enabled && (
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <h4 className="font-semibold text-text-dark dark:text-white">Special Letter Approval Alerts</h4>
                    <p className="text-text-muted dark:text-slate-400 text-[11px]">
                      Alert when a student submits an extended absence or medical endorsement letter
                    </p>
                  </div>
                  <Switch
                    checked={prefs?.letterAlerts ?? true}
                    onChange={() => handleTogglePref("letterAlerts")}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Sign Out Card */}
          <Card className="p-6 flex items-center justify-between border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10">
            <div>
              <h4 className="font-bold text-sm text-red-700 dark:text-red-300">Sign Out of Session</h4>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                End current administrative session on this workstation
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={LogOut}
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              Sign Out
            </Button>
          </Card>

          {/* Floating Dirty Save Bar */}
          {isDirty && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-bottom-3 duration-300">
              <div className="p-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-300">
                  Unsaved changes to your profile.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleReset}
                    className="text-slate-300 hover:text-white"
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    leftIcon={Save}
                    disabled={updateProfileMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Security Password"
        description="Update your credentials. You will need to log in with this new password on your next session."
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordError && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200">
              {passwordError}
            </div>
          )}

          <PasswordInput
            label="Current Password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="Enter current password"
          />

          <PasswordInput
            label="New Password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="At least 8 characters"
          />

          <PasswordInput
            label="Confirm New Password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Re-enter new password"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={isChangingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Sign Out"
        description="Are you sure you want to end your executive session and sign out of the DMI College oversight portal?"
        confirmText="Sign Out"
        variant="danger"
      />
    </div>
  );
}

export default OversightProfile;
