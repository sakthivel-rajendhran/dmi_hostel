import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

/**
 * GET /api/student/profile?studentId=...
 * Fetch student profile directly from MySQL
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || request.headers.get("x-student-id");

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "Student ID required" }, { status: 400 });
    }

    const cleanId = String(studentId).trim();
    const rows = await query(
      `SELECT
        s.*,
        u.email,
        u.phone as user_phone,
        u.avatar_url,
        u.role,
        u.status as user_status
      FROM students s
      LEFT JOIN users u ON u.id = s.id OR u.id = s.student_id
      WHERE s.id = ? OR s.student_id = ? OR s.reg_no = ?
      LIMIT 1`,
      [cleanId, cleanId, cleanId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Student record not found in MySQL" }, { status: 404 });
    }

    const s = rows[0];
    const data = {
      id: s.id,
      studentId: s.student_id || s.id,
      regNo: s.reg_no,
      name: s.name,
      email: s.email || "",
      department: s.department,
      programme: s.programme || "B.Tech",
      section: s.section || "Section A",
      year: s.year,
      batch: s.batch,
      phone: s.phone || s.user_phone || "",
      floor: s.floor || null,
      room: s.room_number || null,
      roomNo: s.room_number || null,
      roomNumber: s.room_number || null,
      roomVerified: Boolean(s.room_verified),
      guardianName: s.guardian_name || "",
      guardianPhone: s.guardian_phone || "",
      guardianRelation: s.guardian_relation || "Father",
      address: s.home_address || "",
      bloodGroup: s.blood_group || "O+ve",
      photo: s.photo_url || s.avatar_url || null,
      photoUrl: s.photo_url || s.avatar_url || null,
      profileCompleted: Boolean(s.profile_completed),
      allocationStatus: s.allocation_status || "waiting_for_warden",
      hostelVerification: s.room_number ? "verified" : "unallocated",
      status: s.user_status || "Active",
      role: "student",
    };

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("GET /api/student/profile error:", err);
    return NextResponse.json({ ok: false, message: "Database query failed" }, { status: 500 });
  }
}

/**
 * PUT /api/student/profile
 * Updates student profile in MySQL
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const studentId = body.studentId || body.id || request.headers.get("x-student-id");

    if (!studentId) {
      return NextResponse.json({ ok: false, message: "Student ID required" }, { status: 400 });
    }

    const cleanId = String(studentId).trim();
    const {
      name,
      phone,
      bloodGroup,
      address,
      guardianName,
      guardianPhone,
      guardianRelation,
      photoUrl,
    } = body;

    // Update students table
    await query(
      `UPDATE students
       SET
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         blood_group = COALESCE(?, blood_group),
         home_address = COALESCE(?, home_address),
         guardian_name = COALESCE(?, guardian_name),
         guardian_phone = COALESCE(?, guardian_phone),
         guardian_relation = COALESCE(?, guardian_relation),
         photo_url = COALESCE(?, photo_url),
         profile_completed = 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? OR student_id = ?`,
      [
        name || null,
        phone || null,
        bloodGroup || null,
        address || null,
        guardianName || null,
        guardianPhone || null,
        guardianRelation || null,
        photoUrl || null,
        cleanId,
        cleanId,
      ]
    );

    // Update users table
    await query(
      `UPDATE users
       SET
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         avatar_url = COALESCE(?, avatar_url),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || null,
        phone || null,
        photoUrl || null,
        cleanId,
      ]
    );

    return NextResponse.json({ ok: true, message: "Profile updated successfully in MySQL" });
  } catch (err) {
    console.error("PUT /api/student/profile error:", err);
    return NextResponse.json({ ok: false, message: "Failed to update profile in database" }, { status: 500 });
  }
}
