"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { passService } from "@/lib/services/passService.js";
import { PASS_STATUSES } from "@/config/status.js";

export function usePasses(filters = {}) {
  return useQuery({
    queryKey: queryKeys.passes.list(filters),
    queryFn: async () => {
      const res = await passService.listPasses(filters);
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}

export function usePass(passId) {
  return useQuery({
    queryKey: queryKeys.passes.detail(passId),
    queryFn: async () => {
      const res = await passService.getPassById(passId);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: !!passId,
  });
}

export const usePassDetails = usePass;

export function useStudentPasses(studentId, filters = {}) {
  return useQuery({
    queryKey: queryKeys.passes.list({ studentId, ...filters }),
    queryFn: async () => {
      const res = await passService.listPasses({ studentId, ...filters });
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
    enabled: !!studentId,
  });
}

export const useMyPasses = useStudentPasses;

/**
 * Hook to retrieve the current active pass for a student
 * Looks for passes in status: approved, gate_pass_issued, out, overdue
 */
export function useMyActivePass(studentId) {
  return useQuery({
    queryKey: queryKeys.passes.active(studentId),
    queryFn: async () => {
      const res = await passService.listPasses({ studentId, pageSize: 50 });
      if (!res.ok) throw new Error(res.message);
      const passes = res.data || [];

      // Sort newest first by appliedAt / departureTime
      const sorted = [...passes].sort((a, b) => {
        const tA = new Date(a.appliedAt || a.departureTime || a.fromTime || 0).getTime();
        const tB = new Date(b.appliedAt || b.departureTime || b.fromTime || 0).getTime();
        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
      });

      // Prioritize overdue -> out -> gate_pass_issued -> approved
      const priorityOrder = [
        PASS_STATUSES.OVERDUE,
        PASS_STATUSES.OUT,
        PASS_STATUSES.GATE_PASS_ISSUED,
        PASS_STATUSES.APPROVED,
      ];

      for (const status of priorityOrder) {
        const found = sorted.find((p) => p.status === status);
        if (found) return found;
      }

      return null;
    },
    enabled: !!studentId,
    refetchInterval: 10000, // refresh every 10s for active pass updates
  });
}

/**
 * Check pass eligibility before submitting
 */
export function usePassEligibility({ studentId, type, from, to } = {}) {
  return useQuery({
    queryKey: queryKeys.passes.eligibility({ studentId, type, from, to }),
    queryFn: async () => {
      const res = await passService.checkEligibility({ studentId, type, from, to });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: !!studentId && !!from && !!to,
  });
}

export function usePassStats() {
  return useQuery({
    queryKey: queryKeys.passes.stats,
    queryFn: async () => {
      const res = await passService.getPassStats();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

export function useApplyPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => passService.applyPass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

export function useApprovePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, actorName, note }) => passService.approvePass(passId, actorName, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

export function useRejectPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, actorName, reason }) => passService.rejectPass(passId, actorName, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

export function useRecommendPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, actorName, note }) => passService.recommendPass(passId, actorName, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

export function useIssueGatePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passId) => passService.issueGatePass(passId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

/**
 * Optimistic cancel pass mutation
 */
export function useCancelPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, reason }) => passService.cancelPass(passId, reason),
    onMutate: async ({ passId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.passes.all });
      const previousPasses = queryClient.getQueryData(queryKeys.passes.all);

      queryClient.setQueriesData({ queryKey: queryKeys.passes.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((p) => (p.id === passId ? { ...p, status: PASS_STATUSES.CANCELLED } : p));
      });

      return { previousPasses };
    },
    onError: (err, variables, context) => {
      if (context?.previousPasses) {
        queryClient.setQueryData(queryKeys.passes.all, context.previousPasses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
    },
  });
}

/**
 * Advance pass status (for DevPanel testing)
 */
export function useAdvancePassStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ passId, targetStatus }) => passService.advancePassStatus(passId, targetStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
