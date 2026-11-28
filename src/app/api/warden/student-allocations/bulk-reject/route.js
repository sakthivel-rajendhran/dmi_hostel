import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql.js";

/** POST /api/warden/student-allocations/bulk-reject */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { studentIds = [], wardenId = "WARDEN-001", reason = "" } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ ok: false, message: "No student IDs provided." }, { status: 400 });
    }
    if (!reason.trim()) {
      return NextResponse.json({ ok: false, message: "Rejection reason is required for bulk reject." }, { status: 400 });
    }

    const results = { success: [], failed: [] };
    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      for (const id of studentIds) {
        try {
          await conn.execute(
            "UPDATE users SET account_status = 'REJECTED', status = 'Disabled', disable_reason = ?, updated_at = NOW() WHERE id = ?",
            [reason.trim(), id]
          );
          await conn.execute(
            "UPDATE students SET account_status = 'REJECTED', allocation_status = 'rejected', updated_at = NOW() WHERE id = ? OR student_id = ?",
            [id, id]
          );
          await conn.execute(
            `INSERT INTO student_registration_approvals (student_id, warden_id, decision, reason, decided_at)
             VALUES (?, ?, 'REJECTED', ?, NOW())`,
            [id, wardenId, reason.trim()]
          );
          await conn.execute(
            `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
             VALUES (?, ?, 'rejected', ?, NOW())`,
            [id, wardenId, reason.trim()]
          );
          results.success.push(id);
        } catch (e) {
          results.failed.push({ id, error: e.message });
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      ok: true,
      message: `${results.success.length} student(s) rejected.`,
      results,
    });
  } catch (err) {
    console.error("Bulk reject error:", err);
    return NextResponse.json({ ok: false, message: "Bulk reject failed." }, { status: 500 });
  }
}
