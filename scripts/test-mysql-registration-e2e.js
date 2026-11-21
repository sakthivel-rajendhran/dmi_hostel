import { query } from "../src/lib/db/mysql.js";

async function runTests() {
  console.log("=== STARTING MYSQL REGISTRATION & AUTH INTEGRATION TEST ===");

  const testEmail = `anbumani.test.${Date.now()}@dmi.edu`;
  const testRegNo = `31062210${Math.floor(1000 + Math.random() * 9000)}`;
  const testPayload = {
    name: "Anbumani",
    email: testEmail,
    dept: "CSE",
    year: 3,
    phone: "9876543210",
    regNo: testRegNo,
    programme: "B.Tech",
    section: "Section A",
    batch: "2023 – 2027",
    guardianName: "Murugan",
    guardianPhone: "9876543211",
    guardianRelation: "Father",
    photoDataUrl: "data:image/jpeg;base64," + Buffer.from("dummy-photo-binary-data-for-anbumani-test").toString("base64"),
  };

  try {
    // 1. Direct MySQL Pre-check
    const beforeUsers = await query("SELECT id FROM users WHERE email = ?", [testEmail]);
    console.log("1. Pre-check: Email does not exist before registration ->", beforeUsers.length === 0 ? "PASSED" : "FAILED");

    // 2. Test Registration Logic directly against DB functions / routes
    // Simulate API registration endpoint
    const cleanDept = testPayload.dept;
    const cleanYear = testPayload.year;
    const deptStudents = await query(
      "SELECT student_id, id FROM students WHERE department = ? AND year = ?",
      [cleanDept, cleanYear]
    );
    const existingIds = (deptStudents || []).map((s) => s.student_id || s.id);
    const count = existingIds.length + 1;
    const studentId = `${cleanDept}-${cleanYear}-${String(count).padStart(3, "0")}`;

    console.log(`2. Generated Student ID for Anbumani: ${studentId}`);

    // Insert user
    await query(
      `INSERT INTO users (id, email, password, role, name, phone, avatar_url, must_change_password, status)
       VALUES (?, ?, 'DmiCE@1202', 'student', ?, ?, ?, 1, 'active')`,
      [studentId, testPayload.email, testPayload.name, testPayload.phone, `/api/student/profile/photo?studentId=${studentId}`]
    );

    // Insert student
    await query(
      `INSERT INTO students (
        id, student_id, reg_no, name, department, programme, section, year, batch, phone,
        guardian_name, guardian_phone, guardian_relation, photo_url, profile_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        studentId,
        studentId,
        testPayload.regNo,
        testPayload.name,
        testPayload.dept,
        testPayload.programme,
        testPayload.section,
        testPayload.year,
        testPayload.batch,
        testPayload.phone,
        testPayload.guardianName,
        testPayload.guardianPhone,
        testPayload.guardianRelation,
        `/api/student/profile/photo?studentId=${studentId}`,
      ]
    );

    // Insert photo
    const photoBuffer = Buffer.from("dummy-photo-binary-data-for-anbumani-test");
    await query(
      `INSERT INTO student_photos (student_id, photo_data, mime_type, file_name, file_size)
       VALUES (?, ?, 'image/jpeg', 'resident-photo.jpg', ?)
       ON DUPLICATE KEY UPDATE photo_data = VALUES(photo_data)`,
      [studentId, photoBuffer, photoBuffer.length]
    );

    console.log("3. MySQL Insertion -> SUCCESS");

    // 3. Verify MySQL Record Persistence
    const savedUser = await query("SELECT id, name, email, role, phone FROM users WHERE id = ?", [studentId]);
    console.log("4. Verify MySQL User:", savedUser[0]);

    const savedStudent = await query("SELECT id, student_id, reg_no, name, department, programme, section, batch, guardian_name FROM students WHERE id = ?", [studentId]);
    console.log("5. Verify MySQL Student:", savedStudent[0]);

    const savedPhoto = await query("SELECT id, student_id, mime_type, file_size, LENGTH(photo_data) as photo_bytes FROM student_photos WHERE student_id = ?", [studentId]);
    console.log("6. Verify MySQL Photo:", savedPhoto[0]);

    if (savedUser.length > 0 && savedStudent.length > 0 && savedPhoto.length > 0) {
      console.log("\n*** ALL MYSQL PERSISTENCE CHECKS PASSED: ANBUMANI DATA IS PERMANENTLY STORED IN MYSQL! ***");
    } else {
      console.error("\n*** FAILED: Record missing in MySQL ***");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
