"use client";

import React, { Suspense } from "react";
import { DepartmentStudents } from "@/components/department/DepartmentStudents.jsx";
import { LoadingScreen } from "@/components/ui/LoadingScreen.jsx";

export default function StaffStudentsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading department students..." />}>
      <DepartmentStudents role="staff" />
    </Suspense>
  );
}
