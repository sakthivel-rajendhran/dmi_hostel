"use client";

import React from "react";
import { usePolicy } from "@/hooks/usePolicy.js";

/**
 * Conditionally renders children based on operational policy modes
 *
 * Example:
 * <PolicyGate allocationMode="student_enters">
 *   <RoomSelector />
 * </PolicyGate>
 */
export function PolicyGate({
  allocationMode,
  photoPolicy,
  children,
  fallback = null,
}) {
  const { policy } = usePolicy();

  if (allocationMode && policy.roomAllocationMode !== allocationMode) {
    return fallback;
  }

  if (photoPolicy && policy.photoPolicy !== photoPolicy) {
    return fallback;
  }

  return <>{children}</>;
}

export default PolicyGate;
