/**
 * Student ID generator & parser utility
 * Required format: DEPARTMENT CODE + TWO-DIGIT ACADEMIC YEAR + TWO-DIGIT SEQUENCE NUMBER
 * Examples: CSE0401, IT0402, EEE0303, AI&DS0401, AI&ML0301
 */

import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Standardize department code
 * @param {string} dept
 * @returns {string}
 */
export function normalizeDepartment(dept = "") {
  if (!dept || typeof dept !== "string") return "CSE";
  const upper = dept.trim().toUpperCase();
  if (upper === "AIDS" || upper === "AI-DS" || upper === "AI & DS") return "AI&DS";
  if (upper === "AIML" || upper === "AI-ML" || upper === "AI & ML") return "AI&ML";
  return upper;
}

/**
 * Format department, academic year and sequence number into standard unique student ID.
 * @param {string} dept - e.g. "CSE", "IT", "AI&DS"
 * @param {number|string} year - 1 to 4
 * @param {number|string} seq - Sequence number, e.g. 1 -> "01", 100 -> "100"
 * @returns {string} e.g. "CSE0401"
 */
export function formatStudentId(dept, year, seq) {
  const normDept = normalizeDepartment(dept);
  const numYear = parseInt(year, 10) || 1;
  const numSeq = parseInt(seq, 10) || 1;
  const yearStr = String(numYear).padStart(2, "0");
  const seqStr = String(numSeq).padStart(2, "0");
  return `${normDept}${yearStr}${seqStr}`;
}

/**
 * Generate next non-colliding student ID for a given department and year (in-memory candidate)
 * @param {object} params
 * @param {string} params.dept - Department code (e.g. "CSE", "IT")
 * @param {number|string} params.year - Year (1-4)
 * @param {string[]} [params.existingIds=[]] - Array of existing student IDs to prevent collisions
 * @returns {string} e.g. "CSE0401"
 */
export function generateStudentId({ dept = "CSE", year = 1, existingIds = [] }) {
  const normDept = normalizeDepartment(dept);
  const numYear = parseInt(year, 10) || 1;
  const yearStr = String(numYear).padStart(2, "0");
  const prefix = `${normDept}${yearStr}`;

  const existingSet = new Set(
    existingIds.map((id) => (typeof id === "string" ? id.toUpperCase().trim() : ""))
  );

  let seq = 1;
  while (true) {
    const candidate = `${prefix}${String(seq).padStart(2, "0")}`;
    if (!existingSet.has(candidate.toUpperCase())) {
      return candidate;
    }
    seq++;
  }
}

/**
 * Transaction-safe sequence allocation directly within MySQL transaction connection
 * Uses student_id_sequences table with row-level locking (SELECT ... FOR UPDATE)
 * Guarantees zero duplicates during concurrent registrations.
 *
 * @param {object} conn - MySQL connection from transaction pool
 * @param {object} params
 * @param {string} params.dept - Department code
 * @param {number|string} params.year - Academic year (1-4)
 * @returns {Promise<string>} e.g. "CSE0401"
 */
export async function allocateNextStudentId(conn, { dept = "CSE", year = 1 }) {
  const normDept = normalizeDepartment(dept);
  const numYear = parseInt(year, 10) || 1;
  const yearStr = String(numYear).padStart(2, "0");
  const prefix = `${normDept}${yearStr}`;

  // 1. Ensure sequence row exists
  await conn.execute(
    `INSERT INTO student_id_sequences (department, academic_year, last_sequence)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE department = department`,
    [normDept, numYear]
  );

  // 2. Lock and retrieve current last_sequence using FOR UPDATE
  const [seqRows] = await conn.execute(
    `SELECT last_sequence 
     FROM student_id_sequences 
     WHERE department = ? AND academic_year = ? 
     FOR UPDATE`,
    [normDept, numYear]
  );

  let currentSeq = seqRows && seqRows.length > 0 ? seqRows[0].last_sequence : 0;

  // 3. Collect any existing IDs from students and users to prevent collision with previously imported data
  const [existingStudentRows] = await conn.execute(
    `SELECT student_id FROM students WHERE department = ? AND year = ?`,
    [normDept, numYear]
  );
  const [existingUserRows] = await conn.execute(
    `SELECT id FROM users WHERE id LIKE ?`,
    [`${prefix}%`]
  );

  const existingIds = new Set([
    ...(existingStudentRows || []).map((s) => (s.student_id || "").toUpperCase()),
    ...(existingUserRows || []).map((u) => (u.id || "").toUpperCase()),
  ]);

  let nextSeq = currentSeq + 1;
  let candidateId = `${prefix}${String(nextSeq).padStart(2, "0")}`;

  while (existingIds.has(candidateId.toUpperCase())) {
    nextSeq++;
    candidateId = `${prefix}${String(nextSeq).padStart(2, "0")}`;
  }

  // 4. Update student_id_sequences with the newly allocated sequence
  await conn.execute(
    `UPDATE student_id_sequences 
     SET last_sequence = ?, updated_at = NOW() 
     WHERE department = ? AND academic_year = ?`,
    [nextSeq, normDept, numYear]
  );

  return candidateId;
}

/**
 * Parse a student ID into its structural components (supports new and legacy formats)
 * Examples:
 *   CSE0401   -> { dept: "CSE", year: 4, seq: 1, isValid: true }
 *   AI&DS0401 -> { dept: "AI&DS", year: 4, seq: 1, isValid: true }
 *   CSE-4-001 -> { dept: "CSE", year: 4, seq: 1, isValid: true }
 * @param {string} id
 * @returns {{ dept: string|null, year: number|null, seq: number|null, isValid: boolean }}
 */
export function parseStudentId(id) {
  if (!id || typeof id !== "string") {
    return { dept: null, year: null, seq: null, isValid: false };
  }

  const clean = id.trim().toUpperCase();

  // Legacy dash format: DEPT-YEAR-SEQ (e.g. CSE-4-001)
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts.length === 3) {
      const dept = normalizeDepartment(parts[0]);
      const year = parseInt(parts[1], 10);
      const seq = parseInt(parts[2], 10);
      const isValid = Number.isInteger(year) && year >= 1 && year <= 4 && Number.isInteger(seq) && seq > 0;
      return { dept: isValid ? dept : null, year: isValid ? year : null, seq: isValid ? seq : null, isValid };
    }
  }

  // New format: DEPT + 2-digit Year + 2-digit (or more) Seq (e.g. CSE0401, AI&DS0401)
  const match = clean.match(/^(.*?)(\d{2})(\d{2,})$/);
  if (match) {
    const rawDept = match[1];
    const year = parseInt(match[2], 10);
    const seq = parseInt(match[3], 10);
    const dept = normalizeDepartment(rawDept);
    const isValidYear = Number.isInteger(year) && year >= 1 && year <= 4;
    const isValidSeq = Number.isInteger(seq) && seq > 0;
    const isValid = Boolean(dept) && isValidYear && isValidSeq;

    return {
      dept: isValid ? dept : null,
      year: isValid ? year : null,
      seq: isValid ? seq : null,
      isValid,
    };
  }

  return { dept: null, year: null, seq: null, isValid: false };
}
