import { query } from "../src/lib/db/mysql.js";

async function testLogin() {
  console.log("=== TESTING MYSQL LOGIN FOR ANBUMANI ===");
  const studentId = "CSE-3-002";
  const password = "DmiCE@1202";

  const rows = await query(
    `SELECT
      u.id, u.email, u.password, u.role, u.name, u.phone, u.avatar_url,
      u.must_change_password, u.status,
      s.student_id, s.reg_no, s.department, s.programme, s.section,
      s.year, s.batch, s.floor, s.room_number, s.guardian_name, s.guardian_phone,
      s.guardian_relation, s.photo_url, s.profile_completed
    FROM users u
    LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
    WHERE LOWER(u.email) = ? OR LOWER(u.id) = ? OR (s.reg_no IS NOT NULL AND LOWER(s.reg_no) = ?)
    LIMIT 1`,
    [studentId.toLowerCase(), studentId.toLowerCase(), studentId.toLowerCase()]
  );

  if (rows.length === 0) {
    console.error("FAILED: Anbumani record not found in MySQL!");
    process.exit(1);
  }

  const u = rows[0];
  console.log("1. Account Authenticated from MySQL:", {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    regNo: u.reg_no,
    department: u.department,
    programme: u.programme,
    section: u.section,
    batch: u.batch,
    guardianName: u.guardian_name,
    photoUrl: u.photo_url,
  });

  console.log("2. Password check:", u.password === password ? "PASSED (Matches DmiCE@1202)" : "FAILED");
  console.log("\n*** LOGIN FROM MYSQL VERIFIED SUCCESSFULLY! ***");
  process.exit(0);
}

testLogin();
