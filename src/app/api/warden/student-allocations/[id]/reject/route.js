import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";

/** PATCH /api/warden/student-allocations/[id]/reject */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const wardenId = body.wardenId || "WARDEN-001";
    const reason   = (body.reason || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, message: "Student ID required." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ ok: false, message: "Rejection reason is required." }, { status: 400 });
    }

    const rows = await query(
      "SELECT allocation_status FROM students WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Student not found." }, { status: 404 });
    }
    if (rows[0].allocation_status === "rejected") {
      return NextResponse.json({ ok: false, message: "Student is already rejected." }, { status: 409 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE students SET allocation_status = 'rejected', updated_at = NOW() WHERE id = ?",
        [id]
      );
      await conn.execute(
        `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
         VALUES (?, ?, 'rejected', ?, NOW())`,
        [id, wardenId, reason]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({ ok: true, message: "Student rejected." });
  } catch (err) {
    console.error("PATCH reject error:", err);
    return NextResponse.json({ ok: false, message: "Failed to reject student." }, { status: 500 });
  }
}
