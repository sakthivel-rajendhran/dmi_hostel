import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";

/** GET /api/warden/student-allocations
 *  Returns all students with their latest allocation decision info.
 *  Query params: status (waiting_for_warden|accepted|rejected|all), dept, year, search
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const dept   = searchParams.get("dept") || "all";
    const year   = searchParams.get("year") || "all";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    let whereClauses = ["u.role = 'student'"];
    const params = [];

    if (status !== "all") {
      const s = status.toLowerCase();
      if (s === "pending" || s === "waiting_for_warden" || s === "pending_warden") {
        whereClauses.push("(COALESCE(u.account_status, 'PENDING_WARDEN') IN ('PENDING_WARDEN', 'PENDING') OR s.allocation_status = 'waiting_for_warden')");
      } else if (s === "accepted" || s === "approved") {
        whereClauses.push("(COALESCE(u.account_status, '') = 'APPROVED' AND s.allocation_status != 'rejected')");
      } else if (s === "rejected") {
        whereClauses.push("(COALESCE(u.account_status, '') = 'REJECTED' OR s.allocation_status = 'rejected')");
      } else {
        whereClauses.push("s.allocation_status = ?");
        params.push(status);
      }
    }
    if (dept !== "all") {
      whereClauses.push("s.department = ?");
      params.push(dept);
    }
    if (year !== "all") {
      whereClauses.push("s.year = ?");
      params.push(Number(year));
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sql = `
      SELECT
        u.id,
        s.student_id,
        s.reg_no,
        u.name,
        u.email,
        COALESCE(u.phone, s.phone) AS phone,
        s.gender,
        s.department,
        s.year,
        s.programme,
        s.section,
        s.batch,
        s.floor,
        s.room_number,
        s.guardian_name,
        s.guardian_phone,
        s.guardian_relation,
        s.photo_url,
        s.allocation_status,
        COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
        u.created_at AS registered_at,
        COALESCE(sra.decided_at, ad.decided_at) AS decided_at,
        COALESCE(sra.reason, ad.rejection_reason) AS rejection_reason,
        COALESCE(sra.warden_id, ad.warden_id) AS warden_id
      FROM users u
      LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
      LEFT JOIN student_registration_approvals sra
        ON sra.student_id = u.id
        AND sra.id = (
          SELECT MAX(id) FROM student_registration_approvals WHERE student_id = u.id
        )
      LEFT JOIN allocation_decisions ad
        ON ad.student_id = u.id
        AND ad.id = (
          SELECT MAX(id) FROM allocation_decisions WHERE student_id = u.id
        )
      ${whereSQL}
      ORDER BY u.created_at DESC
    `;

    let rows = await query(sql, params);

    // Apply text search in JS (simpler cross-column)
    if (search) {
      rows = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(search) ||
        (r.student_id || "").toLowerCase().includes(search) ||
        (r.reg_no || "").toLowerCase().includes(search) ||
        (r.email || "").toLowerCase().includes(search) ||
        (r.room_number || "").toLowerCase().includes(search) ||
        (r.phone || "").toLowerCase().includes(search)
      );
    }

    // Summary counters (always over all students, ignoring filters)
    const [counts] = await getPool().query(`
      SELECT
        COUNT(*) AS total,
        SUM(COALESCE(u.account_status, 'PENDING_WARDEN') IN ('PENDING_WARDEN', 'PENDING') OR s.allocation_status = 'waiting_for_warden') AS pending,
        SUM(COALESCE(u.account_status, '') = 'APPROVED' OR s.allocation_status = 'accepted') AS accepted,
        SUM(COALESCE(u.account_status, '') = 'REJECTED' OR s.allocation_status = 'rejected') AS rejected
      FROM users u
      LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
      WHERE u.role = 'student'
    `);

    return NextResponse.json({
      ok: true,
      data: rows,
      meta: counts[0] || { total: 0, pending: 0, accepted: 0, rejected: 0 },
    });
  } catch (err) {
    console.error("GET /api/warden/student-allocations error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch student allocations." },
      { status: 500 }
    );
  }
}
