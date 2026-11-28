/**
 * Production base service utilities and standardized envelope responses.
 */

/**
 * Production no-op for network latency simulation
 * @returns {Promise<void>}
 */
export async function simulateLatency() {
  return;
}

/**
 * Creates a success envelope
 * @param {any} data
 * @param {object} [meta]
 * @returns {{ ok: true, data: any, meta?: object }}
 */
export function successResponse(data, meta) {
  return meta !== undefined ? { ok: true, data, meta } : { ok: true, data };
}

/**
 * Creates an error envelope
 * @param {string} code
 * @param {string} message
 * @returns {{ ok: false, code: string, message: string }}
 */
export function errorResponse(code, message) {
  return { ok: false, code, message };
}

/**
 * Paginates an in-memory array
 * @param {any[]} items
 * @param {number} [page=1]
 * @param {number} [pageSize=10]
 * @returns {{ items: any[], total: number, page: number, pageSize: number, totalPages: number }}
 */
export function paginate(items = [], page = 1, pageSize = 10) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.max(1, parseInt(pageSize, 10) || 10);
  const total = items.length;
  const totalPages = Math.ceil(total / ps) || 1;
  const start = (p - 1) * ps;
  const sliced = items.slice(start, start + ps);

  return {
    items: sliced,
    total,
    page: p,
    pageSize: ps,
    totalPages,
  };
}
