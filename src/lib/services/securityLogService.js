/**
 * Security Log Service
 * Manages gate movement auditing, security exports, and active out-of-campus tracking.
 */

import { MOCK_SECURITY_LOGS, STORAGE_KEYS, getPersistentMock } from "@/lib/mock/index.js";
import { simulateLatency, successResponse, paginate } from "./base.js";

/**
 * List gate security logs with filtering and pagination
 * @param {object} [params]
 */
export async function listSecurityLogs({ page = 1, pageSize = 15, search = "", type = "", isLate } = {}) {
  await simulateLatency(300, 500);
  // TODO(BACKEND): replace with Supabase call `supabase.from('security_logs').select('*', { count: 'exact' })...`
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);

  let filtered = [...logs];

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.studentName.toLowerCase().includes(q) ||
        l.studentId.toLowerCase().includes(q) ||
        l.passId.toLowerCase().includes(q) ||
        l.gate.toLowerCase().includes(q)
    );
  }

  if (type) {
    filtered = filtered.filter((l) => l.type === type);
  }

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

/**
 * Returns complete dataset rows ready for Excel/CSV export
 */
export async function exportSecurityLogs() {
  await simulateLatency(400, 700);
  // TODO(BACKEND): replace with Supabase call `supabase.from('security_logs').select('*').csv()`
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);
  return successResponse(logs);
}

/**
 * Retrieves list of students currently verified outside campus
 */
export async function getStillOut() {
  await simulateLatency(300, 500);
  // TODO(BACKEND): replace with Supabase RPC `supabase.rpc('get_students_currently_outside')`
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);
  const exits = logs.filter((l) => l.type === "EXIT");
  return successResponse(exits.slice(0, 12));
}

export const securityLogService = {
  listSecurityLogs,
  exportSecurityLogs,
  getStillOut,
};

export default securityLogService;
