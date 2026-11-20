"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

const CampusOverview = dynamic(
  () => import("@/components/oversight/CampusOverview.jsx").then((m) => m.CampusOverview),
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function CorrespondentOverviewPage() {
  return <CampusOverview role="correspondent" />;
}
