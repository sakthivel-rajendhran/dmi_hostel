"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { DashboardShell } from "@/components/layout/DashboardShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function HodLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.HOD]}>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
