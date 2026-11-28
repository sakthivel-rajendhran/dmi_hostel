"use client";

import { useQuery } from "@tanstack/react-query";

export function useWardenStats() {
  return useQuery({
    queryKey: ["warden", "dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/warden/stats");
      if (!res.ok) throw new Error("Failed to fetch warden dashboard stats");
      const json = await res.json();
      return json.data || {};
    },
    refetchInterval: 15000,
  });
}
