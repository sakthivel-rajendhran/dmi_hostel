"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { DashboardShell } from "@/components/layout/DashboardShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function WardenLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.WARDEN]}>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
