"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys.js";
import { notificationService } from "@/lib/services/notificationService.js";

export function useNotifications(filters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const res = await notificationService.listNotifications(filters);
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}

export function useMyNotifications(studentId, filters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ studentId, ...filters }),
    queryFn: async () => {
      const res = await notificationService.listNotifications({ studentId, ...filters });
      if (!res.ok) throw new Error(res.message);
      return res.data || [];
    },
  });
}

/**
 * Optimistic mutation to mark a notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      queryClient.setQueriesData({ queryKey: queryKeys.notifications.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((n) => (n.id === id ? { ...n, read: true } : n));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Optimistic mutation to mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId) => notificationService.markAllNotificationsRead(studentId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      queryClient.setQueriesData({ queryKey: queryKeys.notifications.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((n) => ({ ...n, read: true }));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Optimistic mutation to dismiss a notification
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.dismissNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      queryClient.setQueriesData({ queryKey: queryKeys.notifications.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((n) => n.id !== id);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
