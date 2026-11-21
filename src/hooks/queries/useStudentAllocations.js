"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/warden/student-allocations";

async function fetchAllocations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.dept)   params.set("dept",   filters.dept);
  if (filters.year)   params.set("year",   String(filters.year));
  if (filters.search) params.set("search", filters.search);
  const res = await fetch(`${BASE}?${params.toString()}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to load allocations");
  return json;
}

export function useStudentAllocations(filters = {}) {
  return useQuery({
    queryKey: ["student-allocations", filters],
    queryFn: () => fetchAllocations(filters),
    staleTime: 15_000,
  });
}

export function useAcceptStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, wardenId }) => {
      const res = await fetch(`${BASE}/${id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardenId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-allocations"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["department"] });
    },
  });
}

export function useRejectStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, wardenId, reason }) => {
      const res = await fetch(`${BASE}/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardenId, reason }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-allocations"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["department"] });
    },
  });
}

export function useBulkAccept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentIds, wardenId }) => {
      const res = await fetch(`${BASE}/bulk-accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds, wardenId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-allocations"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["department"] });
    },
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentIds, wardenId, reason }) => {
      const res = await fetch(`${BASE}/bulk-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds, wardenId, reason }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-allocations"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["department"] });
    },
  });
}
