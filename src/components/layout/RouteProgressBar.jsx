"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden bg-transparent">
      <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-accent-lavender-start animate-progress-indeterminate" />
    </div>
  );
}

export default RouteProgressBar;
