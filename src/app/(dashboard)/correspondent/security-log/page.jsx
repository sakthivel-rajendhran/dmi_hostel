"use client";

import React, { Suspense } from "react";
import { OversightSecurityLog } from "@/components/oversight/OversightSecurityLog.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

export default function CorrespondentSecurityLogPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><Skeleton className="h-40 w-full" /></div>}>
      <OversightSecurityLog role="correspondent" />
    </Suspense>
  );
}
