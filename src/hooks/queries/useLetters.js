"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { letterService } from "@/lib/services/letterService.js";
import { toast } from "sonner";

/**
 * Hook to fetch letters list with filters and tabs
 */
export function useLetters(filters = {}, page = 1, pageSize = 15) {
  return useQuery({
    queryKey: queryKeys.letters.list({ ...filters, page, pageSize }),
    queryFn: async () => {
      const res = await letterService.list({ ...filters, page, pageSize });
      if (!res.ok) throw new Error(res.message || "Failed to load letters");
      return res;
    },
    staleTime: 15000,
  });
}

/**
 * Hook to fetch single letter detail
 */
export function useLetterDetail(id) {
  return useQuery({
    queryKey: queryKeys.letters.detail(id),
    queryFn: async () => {
      const res = await letterService.getById(id);
      if (!res.ok) throw new Error(res.message || "Failed to load letter");
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 15000,
  });
}

/**
 * Hook for letters queue statistics
 */
export function useLetterStats() {
  return useQuery({
    queryKey: queryKeys.letters.stats,
    queryFn: async () => {
      const res = await letterService.getStats();
      if (!res.ok) throw new Error(res.message || "Failed to load letter stats");
      return res.data;
    },
    staleTime: 15000,
  });
}

/**
 * Mutation for student submitting a new permission letter
 */
export function useSubmitLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await letterService.submit(payload);
      if (!res.ok) throw new Error(res.message || "Failed to submit letter");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.all });
      toast.success("Special permission letter submitted for institutional review.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not submit letter");
    },
  });
}

/**
 * Mutation for student withdrawing a submitted letter
 */
export function useWithdrawLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (letterId) => {
      const res = await letterService.withdraw(letterId);
      if (!res.ok) throw new Error(res.message || "Failed to withdraw letter");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.all });
      toast.success("Letter application withdrawn.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not withdraw letter");
    },
  });
}

/**
 * Mutation for Principal/Correspondent decision (Endorse / Decline)
 * With optimistic update and rollback
 */
export function useLetterDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ letterId, verdict, note }) => {
      const res = await letterService.decide({ letterId, verdict, note });
      if (!res.ok) throw new Error(res.message || "Failed to submit decision");
      return res.data;
    },
    onMutate: async ({ letterId, verdict }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.letters.all });
      const previousLetters = queryClient.getQueryData(queryKeys.letters.all);
      return { previousLetters };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.detail(variables.letterId) });

      const isApprove = variables.verdict === "approve";
      toast(isApprove ? "Letter Endorsed" : "Letter Declined", {
        description: isApprove
          ? "Special permission cleared. Student and Warden notified."
          : "Declined letter notification dispatched.",
        action: {
          label: "Undo (10s)",
          onClick: async () => {
            const undoRes = await letterService.undoDecision({ letterId: variables.letterId });
            if (undoRes.ok) {
              queryClient.invalidateQueries({ queryKey: queryKeys.letters.all });
              toast.success("Decision reverted.");
            } else {
              toast.error(undoRes.message || "Cannot revert decision.");
            }
          },
        },
        duration: 10000,
      });
    },
    onError: (err, variables, context) => {
      if (context?.previousLetters) {
        queryClient.setQueryData(queryKeys.letters.all, context.previousLetters);
      }
      toast.error(err.message || "Decision submission failed");
    },
  });
}

/**
 * Mutation for undoing a decision explicitly
 */
export function useUndoLetterDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ letterId }) => {
      const res = await letterService.undoDecision({ letterId });
      if (!res.ok) throw new Error(res.message || "Failed to undo decision");
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.detail(variables.letterId) });
      toast.success("Decision successfully reverted.");
    },
    onError: (err) => {
      toast.error(err.message || "Could not undo decision");
    },
  });
}
