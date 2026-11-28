import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function GET() {
  try {
    // Ensure complaints table exists in MySQL
    await query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        status ENUM('pending', 'in_progress', 'resolved', 'closed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 1. Total registered active students (excluding deleted/inactive)
    const [totalRes] = await query("SELECT COUNT(DISTINCT student_id) AS c FROM students WHERE account_status = 'APPROVED'");
    const totalStudents = totalRes?.c || 0;

    // 2. Campus Out: Students who completed OUT movement and have not completed IN movement
    const [outRes] = await query(`
      SELECT COUNT(DISTINCT o.student_id) AS c
      FROM outpasses o
      JOIN students s ON (s.student_id = o.student_id OR s.id = o.student_id)
      WHERE (o.status IN ('out', 'overdue') OR (o.actual_exit_time IS NOT NULL AND o.actual_return_time IS NULL))
        AND o.status NOT IN ('returned', 'rejected', 'cancelled')
        AND s.account_status = 'APPROVED'
    `);
    const campusOut = outRes?.c || 0;

    // 3. Campus In: Active residents currently inside campus (not exited or returned)
    const campusIn = Math.max(0, totalStudents - campusOut);

    // 4. Complaints: Unresolved/active complaints in system
    let complaintsCount = 0;
    try {
      const [compRes] = await query("SELECT COUNT(*) AS c FROM complaints WHERE status IN ('pending', 'in_progress')");
      complaintsCount = compRes?.c || 0;
    } catch (e) {
      complaintsCount = 0;
    }

    // 5. Total registered accounts (all statuses)
    const [allRegRes] = await query("SELECT COUNT(*) AS c FROM students");
    const totalRegistered = allRegRes?.c || 0;

    // 6. Approved student accounts
    const [apprRes] = await query("SELECT COUNT(*) AS c FROM students WHERE account_status = 'APPROVED'");
    const approvedStudents = apprRes?.c || 0;

    // 7. Pending student registrations
    const [pendRes] = await query("SELECT COUNT(*) AS c FROM students WHERE account_status IN ('PENDING_WARDEN', 'PENDING')");
    const pendingStudents = pendRes?.c || 0;

    // 8. Rejected student registrations
    const [rejRes] = await query("SELECT COUNT(*) AS c FROM students WHERE account_status = 'REJECTED'");
    const rejectedStudents = rejRes?.c || 0;

    // 9. Allocated students
    const [allocRes] = await query("SELECT COUNT(*) AS c FROM students WHERE room_number IS NOT NULL AND room_number != '' AND allocation_status = 'accepted'");
    const allocatedStudents = allocRes?.c || 0;

    // 10. Pending Local passes
    const [locRes] = await query("SELECT COUNT(*) AS c FROM outpasses WHERE type = 'Local Pass' AND status = 'pending'");
    const pendingLocalPasses = locRes?.c || 0;

    // 11. Pending Home passes
    const [homeRes] = await query("SELECT COUNT(*) AS c FROM outpasses WHERE type = 'Home Pass' AND status = 'recommended'");
    const pendingHomePasses = homeRes?.c || 0;

    // 12. Overdue students
    const [overdueRes] = await query("SELECT COUNT(*) AS c FROM outpasses WHERE status = 'overdue' OR (status = 'out' AND expected_return_time < NOW())");
    const overdueStudents = overdueRes?.c || 0;

    // 13. Home Out: Students currently outside campus on an approved Home Outpass
    const [homeOutRes] = await query(`
      SELECT COUNT(DISTINCT o.student_id) AS c
      FROM outpasses o
      JOIN students s ON (s.student_id = o.student_id OR s.id = o.student_id)
      WHERE (o.status IN ('out', 'overdue') OR (o.actual_exit_time IS NOT NULL AND o.actual_return_time IS NULL))
        AND o.status NOT IN ('returned', 'rejected', 'cancelled')
        AND LOWER(o.type) LIKE '%home%'
        AND s.account_status = 'APPROVED'
    `);
    const homeOut = homeOutRes?.c || 0;

    // 14. Recent activity
    const recentPasses = await query(
      `SELECT
        o.id, o.pass_number, o.type, o.status, o.destination, o.created_at, o.updated_at,
        s.name AS student_name, s.student_id
       FROM outpasses o
       LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
       ORDER BY o.updated_at DESC
       LIMIT 6`
    );

    return NextResponse.json({
      ok: true,
      data: {
        totalStudents,
        campusIn,
        campusOut,
        complaints: complaintsCount,
        totalRegistered,
        approvedStudents,
        pendingStudents,
        rejectedStudents,
        allocatedStudents,
        pendingLocalPasses,
        pendingHomePasses,
        pendingPasses: pendingLocalPasses + pendingHomePasses,
        homeOut,
        studentsOutside: campusOut,
        overdueStudents,
        recentActivity: recentPasses || [],
      },
    });
  } catch (err) {
    console.error("[API warden stats] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to calculate warden statistics." },
      { status: 500 }
    );
  }
}
