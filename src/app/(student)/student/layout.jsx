"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard.jsx";
import { StudentShell } from "@/components/layout/StudentShell.jsx";
import { ROLES } from "@/config/roles.js";

export default function StudentLayout({ children }) {
  return (
    <AuthGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentShell>{children}</StudentShell>
    </AuthGuard>
  );
}
