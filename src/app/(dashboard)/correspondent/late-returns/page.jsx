"use client";

import React, { Suspense } from "react";
import { LateReturnsAudit } from "@/components/oversight/LateReturnsAudit.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

export default function CorrespondentLateReturnsPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><Skeleton className="h-40 w-full" /></div>}>
      <LateReturnsAudit role="correspondent" />
    </Suspense>
  );
}
