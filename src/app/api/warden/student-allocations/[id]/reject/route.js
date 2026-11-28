import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";

/** PATCH /api/warden/student-allocations/[id]/reject */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const wardenId = body.wardenId || "WARDEN-001";
    const callerRole = body.role || request.headers.get("x-user-role");

    // Only authorized Warden can reject registrations
    if (callerRole && callerRole !== "warden") {
      return NextResponse.json(
        { ok: false, message: "Unauthorized: Only an authorized Warden can reject registrations." },
        { status: 403 }
      );
    }
    const reason   = (body.reason || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, message: "Student ID required." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ ok: false, message: "Rejection reason is required." }, { status: 400 });
    }

    const rows = await query(
      `SELECT
        u.id, u.role,
        COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
        s.allocation_status
      FROM users u
      LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
      WHERE u.id = ? OR s.student_id = ?
      LIMIT 1`,
      [id, id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, message: "Student record not found." }, { status: 404 });
    }

    const current = rows[0];
    if (current.account_status === "REJECTED" && current.allocation_status === "rejected") {
      return NextResponse.json({ ok: false, message: "Student registration is already rejected." }, { status: 409 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update users table status to REJECTED & Disabled
      await conn.execute(
        `UPDATE users
         SET account_status = 'REJECTED', status = 'Disabled', disable_reason = ?, updated_at = NOW()
         WHERE id = ?`,
        [reason || "Registration rejected by Warden", current.id]
      );

      // 2. Update students table
      await conn.execute(
        `UPDATE students
         SET account_status = 'REJECTED', allocation_status = 'rejected', updated_at = NOW()
         WHERE id = ? OR student_id = ?`,
        [current.id, current.id]
      );

      // 3. Record in student_registration_approvals
      await conn.execute(
        `INSERT INTO student_registration_approvals (student_id, warden_id, decision, reason, decided_at)
         VALUES (?, ?, 'REJECTED', ?, NOW())`,
        [current.id, wardenId, reason || null]
      );

      // 4. Record in allocation_decisions for backwards compatibility
      await conn.execute(
        `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
         VALUES (?, ?, 'rejected', ?, NOW())`,
        [current.id, wardenId, reason || null]
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({ ok: true, message: "Student registration rejected successfully." });
  } catch (err) {
    console.error("PATCH reject error:", err);
    return NextResponse.json({ ok: false, message: "Failed to reject student." }, { status: 500 });
  }
}
