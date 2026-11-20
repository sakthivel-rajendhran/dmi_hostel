"use client";

import React, { Suspense } from "react";
import { DepartmentRequests } from "@/components/department/DepartmentRequests.jsx";
import { LoadingScreen } from "@/components/ui/LoadingScreen.jsx";

export default function HodRequestsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading pass recommendation queue..." />}>
      <DepartmentRequests role="hod" />
    </Suspense>
  );
}
