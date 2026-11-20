/**
 * Student ID generator & parser utility
 * Standard format: DEPT-YEAR-SEQ (e.g. CSE-3-001)
 */

import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Generate next non-colliding student ID for a given department and year
 * @param {object} params
 * @param {string} params.dept - Department code (e.g. "CSE", "IT")
 * @param {number|string} params.year - Year (1-4)
 * @param {string[]} [params.existingIds=[]] - Array of existing student IDs to prevent collisions
 * @returns {string} e.g. "CSE-3-001"
 */
export function generateStudentId({ dept = "CSE", year = 1, existingIds = [] }) {
  const cleanDept = (dept || "CSE").toUpperCase().trim();
  const cleanYear = parseInt(year, 10) || 1;
  const digits = WORKFLOW_CONFIG.seqDigits || 3;
  const prefix = `${cleanDept}-${cleanYear}-`;

  const existingSet = new Set(
    existingIds.map((id) => (typeof id === "string" ? id.toUpperCase().trim() : ""))
  );

  let seq = 1;
  while (true) {
    const candidate = `${prefix}${String(seq).padStart(digits, "0")}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    seq++;
  }
}

/**
 * Parse a student ID into its structural components
 * @param {string} id
 * @returns {{ dept: string|null, year: number|null, seq: number|null, isValid: boolean }}
 */
export function parseStudentId(id) {
  if (!id || typeof id !== "string") {
    return { dept: null, year: null, seq: null, isValid: false };
  }

  const parts = id.trim().toUpperCase().split("-");
  if (parts.length !== 3) {
    return { dept: null, year: null, seq: null, isValid: false };
  }

  const dept = parts[0];
  const year = parseInt(parts[1], 10);
  const seq = parseInt(parts[2], 10);

  const isValidDept = WORKFLOW_CONFIG.departments.some((d) => d.code === dept);
  const isValidYear = Number.isInteger(year) && year >= 1 && year <= 4;
  const isValidSeq = Number.isInteger(seq) && seq > 0;

  const isValid = isValidDept && isValidYear && isValidSeq;

  return {
    dept: isValid ? dept : null,
    year: isValid ? year : null,
    seq: isValid ? seq : null,
    isValid,
  };
}
