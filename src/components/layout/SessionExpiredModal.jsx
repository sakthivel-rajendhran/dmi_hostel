"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { LogIn, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/authService.js";

export function SessionExpiredModal({ isOpen, onClose }) {
  const router = useRouter();

  const handleLoginRedirect = () => {
    authService.logout();
    if (onClose) onClose();
    router.push("/");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Session Expired"
      description="Your session has expired for security purposes. Please sign in again."
      size="sm"
    >
      <div className="py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-warning/10 text-warning mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm text-text-muted dark:text-slate-400">
          To ensure the safety of your student records and pass approvals, sessions auto-expire after inactivity.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleLoginRedirect} className="w-full" leftIcon={LogIn}>
          Return to Sign In
        </Button>
      </div>
    </Modal>
  );
}

export default SessionExpiredModal;
