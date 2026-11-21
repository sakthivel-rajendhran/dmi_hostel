import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { regNo, email, excludeStudentId } = body || {};

    if (regNo) {
      const cleanReg = String(regNo).trim().toUpperCase();
      let sql = "SELECT id, student_id FROM students WHERE UPPER(reg_no) = ?";
      const params = [cleanReg];
      if (excludeStudentId) {
        sql += " AND student_id != ? AND id != ?";
        params.push(excludeStudentId, excludeStudentId);
      }
      sql += " LIMIT 1";

      const rows = await query(sql, params);
      if (rows && rows.length > 0) {
        return NextResponse.json({
          available: false,
          field: "regNo",
          error: "REGNO_EXISTS",
          message: "Register Number is already registered in the hostel system.",
        });
      }
    }

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      let sql = "SELECT id FROM users WHERE LOWER(email) = ?";
      const params = [cleanEmail];
      if (excludeStudentId) {
        sql += " AND id != ?";
        params.push(excludeStudentId);
      }
      sql += " LIMIT 1";

      const rows = await query(sql, params);
      if (rows && rows.length > 0) {
        return NextResponse.json({
          available: false,
          field: "email",
          error: "EMAIL_EXISTS",
          message: "An account with this email address already exists.",
        });
      }
    }

    return NextResponse.json({ available: true });
  } catch (err) {
    console.error("check-reg error:", err);
    return NextResponse.json(
      { available: true, warning: "Could not query database directly" },
      { status: 200 }
    );
  }
}
