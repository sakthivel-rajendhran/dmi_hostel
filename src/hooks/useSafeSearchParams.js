"use client";

import { useState, useEffect } from "react";

/**
 * useSafeSearchParams
 * Non-suspending client-side search params reader for Next.js App Router & React 19.
 * Provides the same API as next/navigation's useSearchParams (returns URLSearchParams instance)
 * but eliminates conditional use() suspension errors and CSR bailout during transitions.
 */
export function useSafeSearchParams() {
  const [params, setParams] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncParams = () => {
      setParams(new URLSearchParams(window.location.search));
    };

    syncParams();
    window.addEventListener("popstate", syncParams);
    return () => window.removeEventListener("popstate", syncParams);
  }, []);

  return params;
}

export default useSafeSearchParams;
