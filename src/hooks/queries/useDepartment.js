"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { reportService } from "@/lib/services/reportService.js";
import { studentService } from "@/lib/services/studentService.js";
import { passService } from "@/lib/services/passService.js";
import { staffService } from "@/lib/services/staffService.js";

/**
 * Hook for Department Dashboard overview with 15-second movement polling
 */
export function useDeptDashboard() {
  return useQuery({
    queryKey: queryKeys.department.dashboard,
    queryFn: async () => {
      const res = await reportService.departmentDashboard();
      if (!res.ok) throw new Error(res.message || "Failed to load department dashboard");
      return res.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/**
 * Hook for 15s polling movements feed
 */
export function useDeptMovements() {
  return useQuery({
    queryKey: queryKeys.department.movements,
    queryFn: async () => {
      const res = await reportService.departmentMovements();
      if (!res.ok) throw new Error(res.message || "Failed to load movements");
      return res.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/**
 * Hook for Department Students directory
 */
export function useDeptStudents(filters = {}) {
  return useQuery({
    queryKey: queryKeys.department.students(filters),
    queryFn: async () => {
      const res = await studentService.listForDepartment({ filters, page: 1, pageSize: 100 });
      if (!res.ok) throw new Error(res.message || "Failed to load students");
      return res.data;
    },
    staleTime: 15000,
  });
}

/**
 * Hook for single student detail with scoped permission check
 */
export function useDeptStudent(studentId) {
  return useQuery({
    queryKey: queryKeys.department.studentDetail(studentId),
    queryFn: async () => {
      const res = await studentService.getByIdScoped(studentId);
      if (!res.ok) {
        const err = new Error(res.message || "Failed to fetch student");
        err.code = res.code;
        throw err;
      }
      return res.data;
    },
    enabled: Boolean(studentId),
    retry: false,
  });
}

/**
 * Hook for Department Pass Recommendation Queue
 */
export function useRecommendQueue(filters = {}) {
  return useQuery({
    queryKey: queryKeys.department.recommendQueue(filters),
    queryFn: async () => {
      const res = await passService.listForDepartment({ filters, page: 1, pageSize: 100 });
      if (!res.ok) throw new Error(res.message || "Failed to load pass requests");
      return res.data;
    },
    staleTime: 10000,
  });
}

/**
 * Hook for recommendation badge counters
 */
export function useRecommendStats() {
  return useQuery({
    queryKey: queryKeys.department.recommendStats,
    queryFn: async () => {
      const res = await passService.getRecommendationStats();
      if (!res.ok) throw new Error(res.message || "Failed to fetch recommendation stats");
      return res.data;
    },
    staleTime: 10000,
  });
}

/**
 * Mutation to submit an advisory recommendation (with optimistic update)
 */
export function useRecommendPass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId, verdict, note }) => {
      const res = await passService.recommend({ passId, verdict, note });
      if (!res.ok) {
        const err = new Error(res.message || "Failed to submit recommendation");
        err.code = res.code;
        throw err;
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

/**
 * Mutation to bulk recommend multiple passes
 */
export function useBulkRecommend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passIds, note }) => {
      const res = await passService.bulkRecommend({ passIds, note });
      if (!res.ok) throw new Error(res.message || "Failed to execute bulk recommendation");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

/**
 * Mutation to undo recommendation within grace period
 */
export function useUndoRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ passId }) => {
      const res = await passService.undoRecommendation({ passId });
      if (!res.ok) throw new Error(res.message || "Failed to undo recommendation");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

/**
 * Hook for HOD Analytics
 */
export function useDeptAnalytics(range = "this_month") {
  return useQuery({
    queryKey: queryKeys.department.analytics(range),
    queryFn: async () => {
      const res = await reportService.departmentAnalytics({ range });
      if (!res.ok) throw new Error(res.message || "Failed to load analytics");
      return res.data;
    },
    staleTime: 30000,
  });
}

/**
 * Hook for Staff / HOD profile
 */
export function useStaffProfile() {
  return useQuery({
    queryKey: queryKeys.department.profile,
    queryFn: async () => {
      const res = await staffService.getProfile();
      if (!res.ok) throw new Error(res.message || "Failed to load profile");
      return res.data;
    },
    staleTime: 30000,
  });
}

/**
 * Mutation to update Staff / HOD profile
 */
export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch) => {
      const res = await staffService.updateProfile(patch);
      if (!res.ok) throw new Error(res.message || "Failed to update profile");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.department.profile });
    },
  });
}

/**
 * Hook for Staff communication preferences
 */
export function useStaffPreferences() {
  return useQuery({
    queryKey: queryKeys.department.preferences,
    queryFn: async () => {
      const res = await staffService.getPreferences();
      if (!res.ok) throw new Error(res.message || "Failed to load preferences");
      return res.data;
    },
  });
}

/**
 * Mutation for Staff communication preferences
 */
export function useUpdateStaffPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch) => {
      const res = await staffService.updatePreferences(patch);
      if (!res.ok) throw new Error(res.message || "Failed to update preferences");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.department.preferences });
    },
  });
}
