"use client";

import React from "react";

/**
 * ThemeToggle
 * Dark mode has been permanently removed per specification.
 * This component safely renders null to prevent any dark mode toggles across portals.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return null;
}

export default ThemeToggle;
