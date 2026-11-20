"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { DashboardShell } from "@/components/layout/DashboardShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function CorrespondentLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.CORRESPONDENT]}>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
