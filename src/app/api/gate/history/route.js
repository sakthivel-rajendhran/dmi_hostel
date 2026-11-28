import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/gate/history
 * Returns actual gate movement logs from MySQL security_logs table
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const passId = searchParams.get("passId") || searchParams.get("pass_id");
    const gateId = searchParams.get("gateId");
    const action = searchParams.get("action");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    let sql = `
      SELECT sl.id, sl.pass_id, sl.student_id, sl.action, sl.gate_id, sl.timestamp, 
             sl.verified_by, sl.is_late, sl.late_minutes, sl.notes, sl.scan_type, 
             sl.verification_status, sl.qr_token_reference, sl.created_at,
             s.name as student_name, s.reg_no, s.department, s.room_number,
             o.pass_number, o.destination, o.reason, o.status as pass_status,
             o.expected_return_time, o.actual_exit_time, o.actual_return_time
      FROM security_logs sl
      LEFT JOIN students s ON s.id = sl.student_id OR s.student_id = sl.student_id
      LEFT JOIN outpasses o ON o.id = sl.pass_id OR o.pass_number = sl.pass_id
      WHERE 1=1
    `;
    const params = [];

    if (studentId) {
      sql += ` AND (sl.student_id = ? OR s.id = ? OR s.student_id = ?)`;
      params.push(studentId, studentId, studentId);
    }

    if (passId) {
      sql += ` AND (sl.pass_id = ? OR o.id = ? OR o.pass_number = ?)`;
      params.push(passId, passId, passId);
    }

    if (gateId) {
      sql += ` AND sl.gate_id = ?`;
      params.push(gateId);
    }

    if (action) {
      sql += ` AND sl.action = ?`;
      params.push(action.toUpperCase());
    }

    sql += ` ORDER BY sl.timestamp DESC LIMIT ?`;
    params.push(limit);

    const logs = await query(sql, params);

    return NextResponse.json({
      ok: true,
      data: logs || [],
      count: logs?.length || 0,
    });
  } catch (err) {
    console.error("[API gate history] Error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch gate history." },
      { status: 500 }
    );
  }
}
