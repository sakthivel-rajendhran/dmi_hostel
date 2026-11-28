import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql.js";

/** POST /api/warden/student-allocations/bulk-accept */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { studentIds = [], wardenId = "WARDEN-001" } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ ok: false, message: "No student IDs provided." }, { status: 400 });
    }

    const results = { success: [], failed: [] };
    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      for (const id of studentIds) {
        try {
          await conn.execute(
            "UPDATE users SET account_status = 'APPROVED', status = 'Active', updated_at = NOW() WHERE id = ?",
            [id]
          );
          await conn.execute(
            "UPDATE students SET account_status = 'APPROVED', allocation_status = 'accepted', updated_at = NOW() WHERE id = ? OR student_id = ?",
            [id, id]
          );
          await conn.execute(
            `INSERT INTO student_registration_approvals (student_id, warden_id, decision, reason, decided_at)
             VALUES (?, ?, 'APPROVED', NULL, NOW())`,
            [id, wardenId]
          );
          await conn.execute(
            `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
             VALUES (?, ?, 'accepted', NULL, NOW())`,
            [id, wardenId]
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
      message: `${results.success.length} student(s) accepted.`,
      results,
    });
  } catch (err) {
    console.error("Bulk accept error:", err);
    return NextResponse.json({ ok: false, message: "Bulk accept failed." }, { status: 500 });
  }
}
