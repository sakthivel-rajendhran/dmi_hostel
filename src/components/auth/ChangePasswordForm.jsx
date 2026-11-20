"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Check, ShieldCheck, KeyRound } from "lucide-react";
import { authService } from "@/lib/services/authService.js";
import { getPasswordStrength } from "@/lib/validators.js";
import { Button } from "@/components/ui/Button.jsx";
import { PasswordInput } from "@/components/ui/PasswordInput.jsx";

export function ChangePasswordForm({ onSuccess, onCancel }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.ok) {
        toast.success("Password changed successfully!");
        if (typeof window !== "undefined") {
          localStorage.setItem("dmi_last_pwd_change", new Date().toISOString());
        }
        if (onSuccess) onSuccess();
      } else {
        setError(res.message || "Failed to change password.");
      }
    } catch (err) {
      setError(err.message || "Error changing password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-left">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-semibold">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Current Password
        </label>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          New Password
        </label>
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 8 chars, 1 uppercase & symbol"
          required
        />
        {/* Strength Bar */}
        {newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Strength:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {strength.label}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Confirm New Password
        </label>
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full text-xs font-semibold"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSubmitting}
          className="w-full text-xs font-bold"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </form>
  );
}

export default ChangePasswordForm;
