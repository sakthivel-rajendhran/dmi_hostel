import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";

/** PATCH /api/warden/student-allocations/[id]/accept */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const wardenId = body.wardenId || "WARDEN-001";

    if (!id) {
      return NextResponse.json({ ok: false, message: "Student ID required." }, { status: 400 });
    }

    // Verify student exists and is waiting
    const rows = await query(
      "SELECT allocation_status FROM students WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Student not found." }, { status: 404 });
    }
    if (rows[0].allocation_status === "accepted") {
      return NextResponse.json({ ok: false, message: "Student is already accepted." }, { status: 409 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE students SET allocation_status = 'accepted', updated_at = NOW() WHERE id = ?",
        [id]
      );
      await conn.execute(
        `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
         VALUES (?, ?, 'accepted', NULL, NOW())`,
        [id, wardenId]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({ ok: true, message: "Student accepted successfully." });
  } catch (err) {
    console.error("PATCH accept error:", err);
    return NextResponse.json({ ok: false, message: "Failed to accept student." }, { status: 500 });
  }
}
