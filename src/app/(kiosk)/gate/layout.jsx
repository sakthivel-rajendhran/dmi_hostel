"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { KioskShell } from "@/components/layout/KioskShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function GateLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.WARDEN]}>
      <KioskShell>{children}</KioskShell>
    </AuthGuard>
  );
}
