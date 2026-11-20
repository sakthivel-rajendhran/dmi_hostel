"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { reportService } from "@/lib/services/reportService.js";
import { studentService } from "@/lib/services/studentService.js";
import { securityLogService } from "@/lib/services/securityLogService.js";

/**
 * Hook for live institutional campus overview KPIs and charts
 * Refetches every 15s for live gate movements and curfew alerts
 */
export function useCampusOverview(range = "this_month") {
  return useQuery({
    queryKey: queryKeys.oversight.overview(range),
    queryFn: async () => {
      const res = await reportService.campusOverview({ range });
      if (!res.ok) throw new Error(res.message || "Failed to load campus overview");
      return res.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/**
 * Hook for 7-department comparison table, threshold highlights and heatmap
 */
export function useDeptComparison(range = "this_month") {
  return useQuery({
    queryKey: queryKeys.oversight.deptComparison(range),
    queryFn: async () => {
      const res = await reportService.departmentComparison({ range });
      if (!res.ok) throw new Error(res.message || "Failed to load department comparison");
      return res.data;
    },
    staleTime: 30000,
  });
}

/**
 * Hook for department drill-down drawer/view
 */
export function useDeptDrilldown(dept = "CSE", range = "this_month") {
  return useQuery({
    queryKey: queryKeys.oversight.deptDrilldown(dept, range),
    queryFn: async () => {
      const res = await reportService.departmentDrilldown({ dept, range });
      if (!res.ok) throw new Error(res.message || "Failed to load department drilldown");
      return res.data;
    },
    enabled: Boolean(dept),
    staleTime: 30000,
  });
}

/**
 * Hook for Late Returns summary KPIs and trends
 */
export function useLateSummary(range = "this_month") {
  return useQuery({
    queryKey: queryKeys.oversight.lateSummary(range),
    queryFn: async () => {
      const res = await reportService.lateSummary({ range });
      if (!res.ok) throw new Error(res.message || "Failed to load late summary");
      return res.data;
    },
    staleTime: 15000,
  });
}

/**
 * Hook for Late Returns 3-tab audit table
 */
export function useLateReturns(filters = {}, page = 1, pageSize = 15) {
  return useQuery({
    queryKey: queryKeys.oversight.lateReturns({ ...filters, page, pageSize }),
    queryFn: async () => {
      const res = await reportService.lateReturnsReport({ filters, page, pageSize });
      if (!res.ok) throw new Error(res.message || "Failed to load late returns report");
      return res;
    },
    staleTime: 15000,
    keepPreviousData: true,
  });
}

/**
 * Hook for campus-wide read-only student details (drawer)
 */
export function useOversightStudent(studentId) {
  return useQuery({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: async () => {
      const res = await studentService.getByIdScoped(studentId);
      if (!res.ok) throw new Error(res.message || "Failed to load student record");
      return res.data;
    },
    enabled: Boolean(studentId),
    staleTime: 60000,
  });
}

/**
 * Hook for Oversight read-only security log
 */
export function useOversightSecurityLog(filters = {}) {
  return useQuery({
    queryKey: queryKeys.oversight.securityLog(filters),
    queryFn: async () => {
      const res = await securityLogService.listSecurityLogs(filters);
      if (!res.ok) throw new Error(res.message || "Failed to load security log");
      return res;
    },
    staleTime: 15000,
  });
}
