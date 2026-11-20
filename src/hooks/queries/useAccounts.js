"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { accountService } from "@/lib/services/accountService.js";
import { toast } from "sonner";

/**
 * Hook to fetch paginated staff & executive accounts
 */
export function useStaffAccounts(params = {}) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: async () => {
      const res = await accountService.list(params);
      if (!res.ok) throw new Error(res.error || "Failed to load staff accounts");
      return res.data;
    },
    staleTime: 30000,
  });
}

/**
 * Hook to fetch recent staff account audit logs
 */
export function useAccountAudit(limit = 20) {
  return useQuery({
    queryKey: queryKeys.accounts.audit,
    queryFn: async () => {
      const res = await accountService.getAuditLog(limit);
      if (!res.ok) throw new Error(res.error || "Failed to load audit trail");
      return res.data;
    },
    staleTime: 15000,
  });
}

/**
 * Hook to create a new staff account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await accountService.create(payload);
      if (!res.ok) throw new Error(res.error || "Failed to create account");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success("Account created successfully with temporary credentials!");
    },
    onError: (err) => {
      toast.error(err.message || "Account creation failed");
    },
  });
}

/**
 * Hook to update an existing staff account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const res = await accountService.update(id, patch);
      if (!res.ok) throw new Error(res.error || "Failed to update account");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success("Account details updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update account");
    },
  });
}

/**
 * Hook to reset password and generate a new temporary password
 */
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await accountService.resetPassword(id);
      if (!res.ok) throw new Error(res.error || "Failed to reset password");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password");
    },
  });
}

/**
 * Hook to disable an account
 */
export function useDisableAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await accountService.disable(id, reason);
      if (!res.ok) throw new Error(res.error || "Failed to disable account");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success("Account has been disabled");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to disable account");
    },
  });
}

/**
 * Hook to re-enable an account
 */
export function useEnableAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await accountService.enable(id);
      if (!res.ok) throw new Error(res.error || "Failed to enable account");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success("Account has been re-enabled");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to enable account");
    },
  });
}

/**
 * Hook to soft delete an account
 */
export function useRemoveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await accountService.remove(id);
      if (!res.ok) throw new Error(res.error || "Failed to remove account");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success("Account removed successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove account");
    },
  });
}

/**
 * Hook to reassign pending recommendations
 */
export function useReassignPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromUserId, toUserId }) => {
      const res = await accountService.reassignPending(fromUserId, toUserId);
      if (!res.ok) throw new Error(res.error || "Failed to reassign pending requests");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.passes.all });
      toast.success(`Successfully reassigned ${data.reassignedCount} pending request(s)`);
    },
    onError: (err) => {
      toast.error(err.message || "Reassignment failed");
    },
  });
}
