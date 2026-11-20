"use client";

import React, { Suspense } from "react";
import { StudentLettersReview } from "@/components/oversight/StudentLettersReview.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";

export default function PrincipalLettersPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><Skeleton className="h-40 w-full" /></div>}>
      <StudentLettersReview role="principal" />
    </Suspense>
  );
}
