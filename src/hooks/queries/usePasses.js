"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { passService } from "@/lib/services/passService.js";
import { PASS_STATUSES } from "@/config/status.js";

/**
 * Direct API Hook for listing outpass applications (Hostel / Warden / Admin)
 * Authoritative: Fetches directly from MySQL-backed /api/outpass/list with zero client-side caching.
 */
export function usePasses(filters = {}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refetch = useCallback(async () => {
    try {
      const res = await passService.listPasses(filtersRef.current);
      if (res.ok) {
        setData(res.data || []);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(new Error(res.message || "Failed to load passes from MySQL database."));
      }
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    refetch();

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleFocus);
    }

    const interval = setInterval(() => {
      if (isMounted) refetch();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleFocus);
      }
    };
  }, [refetch]);

  return { data, isLoading, isError, error, refetch };
}

/**
 * Direct API Hook for single outpass details
 */
export function usePass(passId) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(passId));
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!passId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await passService.getPassById(passId);
      if (res.ok) {
        setData(res.data || null);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(new Error(res.message || "Failed to retrieve pass."));
      }
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [passId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(Boolean(passId));
    refetch();

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleFocus);
    }

    const interval = setInterval(() => {
      if (isMounted) refetch();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleFocus);
      }
    };
  }, [refetch, passId]);

  return { data, isLoading, isError, error, refetch };
}

export const usePassDetails = usePass;

/**
 * Direct API Hook for Student outpass list
 * Authoritative: Fetches strictly the authenticated student's passes from MySQL.
 */
export function useStudentPasses(studentId, filters = {}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(studentId));
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refetch = useCallback(async () => {
    if (!studentId) {
      setData([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await passService.listPasses({ studentId, ...filtersRef.current });
      if (res.ok) {
        setData(res.data || []);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(new Error(res.message || "Failed to load student passes from MySQL."));
      }
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(Boolean(studentId));
    refetch();

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleFocus);
    }

    const interval = setInterval(() => {
      if (isMounted) refetch();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleFocus);
      }
    };
  }, [refetch, studentId]);

  return { data, isLoading, isError, error, refetch };
}

export const useMyPasses = useStudentPasses;

/**
 * Direct API Hook to retrieve active pass for a student (for Greeting Card / Scanner)
 */
export function useMyActivePass(studentId) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(studentId));
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await passService.listPasses({ studentId, pageSize: 50 });
      if (res.ok) {
        const passes = res.data || [];
        const sorted = [...passes].sort((a, b) => {
          const tA = new Date(a.appliedAt || a.departureTime || a.fromTime || 0).getTime();
          const tB = new Date(b.appliedAt || b.departureTime || b.fromTime || 0).getTime();
          return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        });

        const priorityOrder = [
          PASS_STATUSES.OVERDUE,
          PASS_STATUSES.OUT,
          PASS_STATUSES.GATE_PASS_ISSUED,
          PASS_STATUSES.APPROVED,
        ];

        let foundPass = null;
        for (const status of priorityOrder) {
          const match = sorted.find(
            (p) => (p.status || "").toLowerCase() === status.toLowerCase()
          );
          if (match) {
            foundPass = match;
            break;
          }
        }
        setData(foundPass);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(new Error(res.message || "Failed to load active pass."));
      }
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(Boolean(studentId));
    refetch();

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleFocus);
    }

    const interval = setInterval(() => {
      if (isMounted) refetch();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleFocus);
      }
    };
  }, [refetch, studentId]);

  return { data, isLoading, isError, error, refetch };
}

/**
 * Check pass eligibility before submitting
 */
export function usePassEligibility({ studentId, type, from, to } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(studentId && from && to));

  const check = useCallback(async () => {
    if (!studentId || !from || !to) return;
    setIsLoading(true);
    try {
      const res = await passService.checkEligibility({ studentId, type, from, to });
      if (res.ok) {
        setData(res.data);
      }
    } catch (e) {
      console.warn("Eligibility check error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, type, from, to]);

  useEffect(() => {
    check();
  }, [check]);

  return { data, isLoading, refetch: check };
}

/**
 * Direct aggregate pass stats
 */
export function usePassStats() {
  const [data, setData] = useState({
    total: 0,
    pending: 0,
    recommended: 0,
    approved: 0,
    gatePassIssued: 0,
    currentlyOut: 0,
    overdue: 0,
    returned: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await passService.getPassStats();
      if (res.ok) {
        setData(res.data);
      }
    } catch (e) {
      console.warn("Stats error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    refetch();
    const interval = setInterval(() => {
      if (isMounted) refetch();
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refetch]);

  return { data, isLoading, refetch };
}

/**
 * Direct async operation hooks (replacing useMutation)
 */
export function useApplyPass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async (data) => {
    setIsPending(true);
    try {
      return await passService.applyPass(data);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useApprovePass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async ({ passId, actorName, note }) => {
    setIsPending(true);
    try {
      return await passService.approvePass(passId, actorName, note);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useRejectPass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async ({ passId, actorName, reason }) => {
    setIsPending(true);
    try {
      return await passService.rejectPass(passId, actorName, reason);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useRecommendPass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async ({ passId, actorName, note }) => {
    setIsPending(true);
    try {
      return await passService.recommendPass(passId, actorName, note);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useIssueGatePass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async (passId) => {
    setIsPending(true);
    try {
      return await passService.issueGatePass(passId);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useCancelPass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async ({ passId, reason }) => {
    setIsPending(true);
    try {
      return await passService.cancelPass(passId, reason);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useDeletePass() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async (passId) => {
    setIsPending(true);
    try {
      return await passService.deletePass(passId);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}

export function useAdvancePassStatus() {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async ({ passId, targetStatus }) => {
    setIsPending(true);
    try {
      return await passService.advancePassStatus(passId, targetStatus);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { mutateAsync, isPending };
}
