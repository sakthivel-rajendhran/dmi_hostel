import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";

/** PATCH /api/warden/student-allocations/[id]/accept */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const wardenId = body.wardenId || "WARDEN-001";
    const callerRole = body.role || request.headers.get("x-user-role");

    // Only authorized Warden can approve registrations
    if (callerRole && callerRole !== "warden") {
      return NextResponse.json(
        { ok: false, message: "Unauthorized: Only an authorized Warden can approve registrations." },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ ok: false, message: "Student ID required." }, { status: 400 });
    }

    // Verify student exists and registration is still pending
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
    if (current.account_status === "APPROVED" && current.allocation_status === "accepted") {
      return NextResponse.json({ ok: false, message: "Student registration is already approved." }, { status: 409 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Activate and approve user account in users table
      await conn.execute(
        `UPDATE users
         SET account_status = 'APPROVED', status = 'Active', updated_at = NOW()
         WHERE id = ?`,
        [current.id]
      );

      // 2. Update student account_status and allocation_status in students table
      await conn.execute(
        `UPDATE students
         SET account_status = 'APPROVED', allocation_status = 'accepted', updated_at = NOW()
         WHERE id = ? OR student_id = ?`,
        [current.id, current.id]
      );

      // 3. Record Warden's approval decision in student_registration_approvals table
      await conn.execute(
        `INSERT INTO student_registration_approvals (student_id, warden_id, decision, reason, decided_at)
         VALUES (?, ?, 'APPROVED', NULL, NOW())`,
        [current.id, wardenId]
      );

      // 4. Record in allocation_decisions for backwards compatibility
      await conn.execute(
        `INSERT INTO allocation_decisions (student_id, warden_id, decision, rejection_reason, decided_at)
         VALUES (?, ?, 'accepted', NULL, NOW())`,
        [current.id, wardenId]
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      ok: true,
      message: "Student registration approved and account activated successfully.",
    });
  } catch (err) {
    console.error("PATCH accept error:", err);
    return NextResponse.json({ ok: false, message: "Failed to accept student." }, { status: 500 });
  }
}
