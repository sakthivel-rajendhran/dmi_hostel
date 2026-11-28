import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

/**
 * DELETE /api/warden/student-allocations/[id]
 * Exclusively deletes rejected student accounts.
 * Safely removes student records from MySQL without breaking foreign key constraints.
 */
export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const studentId = params?.id;

    if (!studentId) {
      return NextResponse.json(
        { ok: false, message: "Student ID is required." },
        { status: 400 }
      );
    }

    // 1. Verify student exists and check current account and allocation status
    const rows = await query(
      `SELECT
         u.id,
         u.email,
         COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
         s.allocation_status
       FROM users u
       LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
       WHERE u.id = ? OR s.student_id = ?
       LIMIT 1`,
      [studentId, studentId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Student record not found." },
        { status: 404 }
      );
    }

    const student = rows[0];
    const accStatus = (student.account_status || "").toUpperCase();
    const allocStatus = (student.allocation_status || "").toLowerCase();

    // Security check: ONLY REJECTED student accounts can be deleted
    const isRejected = accStatus === "REJECTED" || allocStatus === "rejected";
    if (!isRejected) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_REJECTED",
          message: "Only rejected student registrations can be deleted. Pending or Approved students cannot be removed.",
        },
        { status: 403 }
      );
    }

    const userId = student.id;

    // 2. Cascade delete in safe sequence
    // First, remove allocations and approvals
    await query("DELETE FROM allocation_decisions WHERE student_id = ? OR student_id = ?", [userId, studentId]).catch(() => {});
    await query("DELETE FROM student_registration_approvals WHERE student_id = ? OR student_id = ?", [userId, studentId]).catch(() => {});
    await query("DELETE FROM student_photos WHERE student_id = ? OR user_id = ?", [userId, userId]).catch(() => {});
    await query("DELETE FROM notifications WHERE user_id = ?", [userId]).catch(() => {});
    
    // Delete any dependent outpasses and their timeline
    const passRows = await query("SELECT id FROM outpasses WHERE student_id = ? OR student_id = ?", [userId, studentId]).catch(() => []);
    if (passRows && passRows.length > 0) {
      for (const p of passRows) {
        await query("DELETE FROM pass_timeline WHERE pass_id = ?", [p.id]).catch(() => {});
        await query("DELETE FROM security_logs WHERE pass_id = ?", [p.id]).catch(() => {});
      }
      await query("DELETE FROM outpasses WHERE student_id = ? OR student_id = ?", [userId, studentId]).catch(() => {});
    }

    // Delete student record
    await query("DELETE FROM students WHERE id = ? OR student_id = ?", [userId, studentId]).catch(() => {});

    // Delete user record (if user table still has it)
    await query("DELETE FROM users WHERE id = ?", [userId]);

    return NextResponse.json({
      ok: true,
      message: "Rejected student record and registration data deleted successfully.",
    });
  } catch (err) {
    console.error("[API delete rejected student] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to delete student record." },
      { status: 500 }
    );
  }
}
