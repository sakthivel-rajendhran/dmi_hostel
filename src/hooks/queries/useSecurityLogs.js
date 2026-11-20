"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { securityLogService } from "@/lib/services/securityLogService.js";

export function useSecurityLogs(filters = {}) {
  return useQuery({
    queryKey: queryKeys.securityLogs.list(filters),
    queryFn: async () => {
      const res = await securityLogService.listSecurityLogs(filters);
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}

export function useStudentsStillOut() {
  return useQuery({
    queryKey: queryKeys.securityLogs.stillOut,
    queryFn: async () => {
      const res = await securityLogService.getStillOut();
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}
