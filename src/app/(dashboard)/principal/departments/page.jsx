"use client";

import React, { Suspense } from "react";
import { DepartmentInsights } from "@/components/oversight/DepartmentInsights.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

export default function PrincipalDepartmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><Skeleton className="h-40 w-full" /></div>}>
      <DepartmentInsights role="principal" />
    </Suspense>
  );
}
