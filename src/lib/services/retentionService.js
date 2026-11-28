/**
 * Outpass 3-Month Automated Data Retention Service
 *
 * Implements strict 3-month data retention rule:
 * - Age calculated strictly from original outpass `created_at` timestamp.
 * - Uses Asia/Kolkata (+05:30) calendar date boundaries.
 * - Outpasses older than 3 full calendar months are safely archived/purged.
 * - Safely cleans up linked child records (pass_timeline, notifications, security_logs with pass_id).
 * - Preserves student accounts, user profiles, room allocations, warden records, and unrelated logs.
 * - Records execution metrics into `retention_logs` table (sanitized, zero sensitive student data).
 */

import { query } from "../db/mysql.js";

/**
 * Ensures the retention_logs audit table exists
 */
export async function ensureRetentionLogsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS retention_logs (
        id VARCHAR(64) PRIMARY KEY,
        execution_time DATETIME NOT NULL,
        retention_rule VARCHAR(100) NOT NULL,
        cutoff_timestamp DATETIME NOT NULL,
        eligible_records INT NOT NULL DEFAULT 0,
        cleared_records INT NOT NULL DEFAULT 0,
        failure_count INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL,
        error_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.warn("[RetentionService] Table check error:", err?.message);
  }
}

/**
 * Execute 3-Month Data Retention Cleanup
 * @returns {Promise<{ ok: boolean, eligibleRecords: number, clearedRecords: number, failureCount: number, executionTime: string, cutoff: string }>}
 */
export async function runRetentionCleanup() {
  await ensureRetentionLogsTable();

  const executionTime = new Date().toISOString();
  const logId = `RET-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let eligibleCount = 0;
  let clearedCount = 0;
  let failureCount = 0;
  let errorDetails = null;

  try {
    // 1. Determine exact 3-calendar-months cutoff in Asia/Kolkata timezone
    const cutoffRows = await query(
      `SELECT
        DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+05:30'), INTERVAL 3 MONTH) AS cutoff_ist,
        DATE_SUB(NOW(), INTERVAL 3 MONTH) AS cutoff_utc`
    );

    const cutoffIst = cutoffRows?.[0]?.cutoff_ist || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    // 2. Query eligible old outpasses created > 3 calendar months ago
    const eligibleRows = await query(
      `SELECT id, pass_number, student_id, created_at
       FROM outpasses
       WHERE created_at < DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+05:30'), INTERVAL 3 MONTH)
       ORDER BY created_at ASC`
    );

    eligibleCount = eligibleRows ? eligibleRows.length : 0;

    if (eligibleCount === 0) {
      // Record clean zero-record audit log
      await query(
        `INSERT INTO retention_logs (
          id, execution_time, retention_rule, cutoff_timestamp, eligible_records, cleared_records, failure_count, status, error_details
        ) VALUES (?, NOW(), '3_CALENDAR_MONTHS_IST', ?, 0, 0, 0, 'COMPLETED', NULL)`,
        [logId, cutoffIst]
      );

      return {
        ok: true,
        eligibleRecords: 0,
        clearedRecords: 0,
        failureCount: 0,
        executionTime,
        cutoff: cutoffIst,
        message: "No outpasses older than 3 calendar months found. Operational database is clean.",
      };
    }

    const passIds = eligibleRows.map((r) => r.id);

    // 3. Delete linked records and parent outpass in batches of 50
    const batchSize = 50;
    for (let i = 0; i < passIds.length; i += batchSize) {
      const batch = passIds.slice(i, i + batchSize);
      const placeholders = batch.map(() => "?").join(",");

      try {
        // Child tables deletion
        await query(`DELETE FROM pass_timeline WHERE pass_id IN (${placeholders})`, batch);
        await query(`DELETE FROM notifications WHERE pass_id IN (${placeholders})`, batch);
        await query(`DELETE FROM security_logs WHERE pass_id IN (${placeholders})`, batch);

        // Parent outpasses deletion
        const res = await query(`DELETE FROM outpasses WHERE id IN (${placeholders})`, batch);
        clearedCount += res?.affectedRows || batch.length;
      } catch (batchErr) {
        console.error("[RetentionService] Batch deletion error:", batchErr);
        failureCount += batch.length;
        errorDetails = (errorDetails ? errorDetails + "; " : "") + (batchErr?.message || "Batch failure");
      }
    }

    // 4. Record execution log in retention_logs table
    await query(
      `INSERT INTO retention_logs (
        id, execution_time, retention_rule, cutoff_timestamp, eligible_records, cleared_records, failure_count, status, error_details
      ) VALUES (?, NOW(), '3_CALENDAR_MONTHS_IST', ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        cutoffIst,
        eligibleCount,
        clearedCount,
        failureCount,
        failureCount === 0 ? "COMPLETED" : "PARTIAL_SUCCESS",
        errorDetails ? errorDetails.substring(0, 1000) : null,
      ]
    );

    return {
      ok: failureCount === 0,
      eligibleRecords: eligibleCount,
      clearedRecords: clearedCount,
      failureCount,
      executionTime,
      cutoff: cutoffIst,
      message: `Cleaned up ${clearedCount} outpass record(s) older than 3 months.`,
    };
  } catch (fatalErr) {
    console.error("[RetentionService] Fatal error:", fatalErr);
    try {
      await query(
        `INSERT INTO retention_logs (
          id, execution_time, retention_rule, cutoff_timestamp, eligible_records, cleared_records, failure_count, status, error_details
        ) VALUES (?, NOW(), '3_CALENDAR_MONTHS_IST', NOW(), ?, ?, ?, 'FAILED', ?)`,
        [logId, eligibleCount, clearedCount, eligibleCount - clearedCount, fatalErr?.message?.substring(0, 1000)]
      );
    } catch (e) {}

    return {
      ok: false,
      eligibleRecords: eligibleCount,
      clearedRecords: clearedCount,
      failureCount: eligibleCount - clearedCount,
      executionTime,
      error: fatalErr?.message || "Retention execution failed",
    };
  }
}
