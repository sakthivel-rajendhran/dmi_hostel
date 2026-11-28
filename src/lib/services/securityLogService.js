/**
 * Security Log Service
 * Manages gate movement auditing, security exports, and active out-of-campus tracking.
 */

import { simulateLatency, successResponse, paginate } from "./base.js";

/**
 * List gate security logs with filtering and pagination
 * @param {object} [params]
 */
export async function listSecurityLogs({ page = 1, pageSize = 100, search = "", type = "", isLate } = {}) {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams();
      if (type && type !== "all") params.set("type", type);
      if (search) params.set("search", search);

      const res = await fetch(`/api/security-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          let filtered = [...json.data];
          if (typeof isLate === "boolean") {
            filtered = filtered.filter((l) => l.isLate === isLate);
          }
          const paginationMeta = paginate(filtered, page, pageSize);
          return successResponse(paginationMeta.items, {
            total: paginationMeta.total,
            page: paginationMeta.page,
            pageSize: paginationMeta.pageSize,
            totalPages: paginationMeta.totalPages,
          });
        }
      }
    } catch (e) {
      console.warn("Could not fetch security logs from API:", e);
    }
  }

  await simulateLatency(100, 200);
  const paginationMeta = paginate([], page, pageSize);
  return successResponse(paginationMeta.items, {
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  });
}

/**
 * Returns complete dataset rows ready for Excel/CSV export
 */
export async function exportSecurityLogs() {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/security-logs");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          return successResponse(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not export security logs:", e);
    }
  }
  return successResponse([]);
}

/**
 * Retrieves list of students currently verified outside campus (status === 'out')
 */
export async function getStillOut() {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/outpass/list?status=out");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          return successResponse(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch still out students from API:", e);
    }
  }
  return successResponse([]);
}

export const securityLogService = {
  listSecurityLogs,
  exportSecurityLogs,
  getStillOut,
};

export default securityLogService;
