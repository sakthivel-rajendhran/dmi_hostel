"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth.js";
import { ROLES } from "@/config/roles.js";
import { StudentShell } from "./StudentShell.jsx";
import { DashboardShell } from "./DashboardShell.jsx";
import { RouteProgressBar } from "./RouteProgressBar.jsx";
import { OfflineBanner } from "./OfflineBanner.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

export function AppShell({ children, forcedRole }) {
  const { user, isLoading } = useAuth();

  const role = (forcedRole || user?.role || ROLES.STUDENT).toLowerCase();

  let shellComponent;
  if (role === ROLES.STUDENT) {
    shellComponent = <StudentShell>{children}</StudentShell>;
  } else {
    shellComponent = <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <ErrorBoundary>
      <RouteProgressBar />
      <OfflineBanner />
      {shellComponent}
    </ErrorBoundary>
  );
}

export default AppShell;
