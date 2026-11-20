"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { DashboardShell } from "@/components/layout/DashboardShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function StaffLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.STAFF]}>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
