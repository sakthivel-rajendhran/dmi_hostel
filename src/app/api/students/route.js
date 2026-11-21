import { query } from "@/lib/db/mysql.js";
import { NextResponse } from "next/server";

/**
 * GET /api/students
 * Fetches students from MySQL database.
 * Query params: status (default: 'accepted', or 'waiting_for_warden', 'rejected', 'all'), department, year, search, floor
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "accepted";
    const dept = searchParams.get("department") || searchParams.get("dept") || "all";
    const year = searchParams.get("year") || "all";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const floor = searchParams.get("floor") || "all";

    const whereClauses = ["u.role = 'student'"];
    const params = [];

    if (status !== "all") {
      whereClauses.push("s.allocation_status = ?");
      params.push(status);
    }

    if (dept !== "all") {
      whereClauses.push("s.department = ?");
      params.push(dept);
    }

    if (year !== "all") {
      whereClauses.push("s.year = ?");
      params.push(Number(year));
    }

    if (floor !== "all") {
      whereClauses.push("s.floor = ?");
      params.push(floor);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sql = `
      SELECT
        s.id,
        s.student_id,
        s.reg_no,
        s.name,
        s.department,
        s.programme,
        s.section,
        s.year,
        s.batch,
        s.phone AS student_phone,
        s.floor,
        s.room_number,
        s.room_verified,
        s.guardian_name,
        s.guardian_phone,
        s.guardian_relation,
        s.home_address,
        s.blood_group,
        s.photo_url,
        s.profile_completed,
        s.allocation_status,
        s.created_at,
        u.email,
        u.phone AS user_phone,
        u.avatar_url,
        u.status AS user_status
      FROM students s
      JOIN users u ON (u.id = s.id OR u.id = s.student_id)
      ${whereSQL}
      ORDER BY s.name ASC
    `;

    let rows = await query(sql, params);

    // In-memory text search filtering
    if (search) {
      rows = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(search) ||
        (r.student_id || "").toLowerCase().includes(search) ||
        (r.email || "").toLowerCase().includes(search) ||
        (r.reg_no || "").toLowerCase().includes(search) ||
        (r.room_number || "").toLowerCase().includes(search)
      );
    }

    const data = rows.map((s) => ({
      id: s.id,
      studentId: s.student_id || s.id,
      regNo: s.reg_no || "",
      regNumber: s.reg_no || "",
      name: s.name,
      email: s.email || "",
      phone: s.student_phone || s.user_phone || "",
      parentPhone: s.guardian_phone || s.student_phone || "",
      guardianPhone: s.guardian_phone || "",
      guardianName: s.guardian_name || "",
      guardianRelation: s.guardian_relation || "Father",
      dept: s.department,
      department: s.department,
      year: s.year,
      floor: s.floor || null,
      room: s.room_number || "—",
      roomNo: s.room_number || "—",
      roomNumber: s.room_number || "—",
      bedNumber: 1,
      allocationStatus: s.allocation_status || "waiting_for_warden",
      status: "In Campus",
      profileCompleted: Boolean(s.profile_completed),
      photoUrl: s.photo_url || s.avatar_url || null,
      avatar: s.photo_url || s.avatar_url || null,
      createdAt: s.created_at,
    }));

    return NextResponse.json({
      ok: true,
      data,
      meta: {
        total: data.length,
      },
    });
  } catch (err) {
    console.error("GET /api/students error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch students from database." },
      { status: 500 }
    );
  }
}
