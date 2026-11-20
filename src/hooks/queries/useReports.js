"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import * as reportService from "@/lib/services/reportService.js";

export function useDeptSummary(dept = "CSE") {
  return useQuery({
    queryKey: queryKeys.reports.dept(dept),
    queryFn: async () => {
      const res = await reportService.deptSummary(dept);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useCampusSummary() {
  return useQuery({
    queryKey: queryKeys.reports.campus,
    queryFn: async () => {
      const res = await reportService.campusSummary();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useLateReturns() {
  return useQuery({
    queryKey: queryKeys.reports.lateReturns,
    queryFn: async () => {
      const res = await reportService.lateReturns();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}
