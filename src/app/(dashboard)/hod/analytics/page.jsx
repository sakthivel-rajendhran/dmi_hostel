"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

const DepartmentAnalytics = dynamic(
  () => import("@/components/department/DepartmentAnalytics.jsx").then((m) => m.DepartmentAnalytics),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse p-4">
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    ),
    ssr: false,
  }
);

export default function HodAnalyticsPage() {
  return <DepartmentAnalytics />;
}
