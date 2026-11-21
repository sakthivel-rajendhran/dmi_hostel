import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { generateStudentId } from "@/lib/utils/student-id.js";
import { computeBatch, getFloorForRoom } from "@/lib/validators.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      dept = "CSE",
      year = 1,
      phone = "",
      regNo,
      programme = "B.Tech",
      section = "Section A",
      batch,
      guardianName = "",
      guardianPhone = "",
      guardianRelation = "Father",
      floor = null,
      roomNo = null,
      photoDataUrl = null,
    } = body || {};

    // 1. Basic validation
    if (!name || !email || !regNo) {
      return NextResponse.json(
        { ok: false, code: "MISSING_FIELDS", message: "Name, email, and register number are required." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRegNo = String(regNo).trim().toUpperCase();
    const cleanDept = String(dept).trim().toUpperCase();
    const cleanYear = Number(year) || 1;
    const cleanPhone = String(phone || "").trim();
    const cleanProgramme = programme ? String(programme).trim() : null;
    const cleanSection = section ? String(section).trim() : null;
    const cleanBatch = batch ? String(batch).trim() : null;
    const cleanGuardianName = String(guardianName || "").trim();
    const cleanGuardianPhone = String(guardianPhone || "").trim();
    const cleanGuardianRelation = String(guardianRelation || "Father").trim();
    const cleanRoomNo = roomNo ? String(roomNo).trim().toUpperCase() : null;
    const cleanFloor = floor || (cleanRoomNo ? getFloorForRoom(cleanRoomNo) : null);

    // 2. Check Duplicate Email in MySQL
    const existingUsers = await query(
      "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      [cleanEmail]
    );
    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { ok: false, code: "EMAIL_EXISTS", message: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // 3. Check Duplicate Reg Number in MySQL
    const existingStudents = await query(
      "SELECT id, student_id FROM students WHERE UPPER(reg_no) = ? LIMIT 1",
      [cleanRegNo]
    );
    if (existingStudents && existingStudents.length > 0) {
      return NextResponse.json(
        { ok: false, code: "REGNO_EXISTS", message: "This Register Number is already registered in the hostel system." },
        { status: 409 }
      );
    }

    // 4. Generate unique Student ID (e.g. CSE-1-001)
    const deptStudents = await query(
      "SELECT student_id, id FROM students WHERE department = ? AND year = ?",
      [cleanDept, cleanYear]
    );
    const deptUsers = await query(
      "SELECT id FROM users WHERE id LIKE ?",
      [`${cleanDept}-${cleanYear}-%`]
    );
    const existingIds = [
      ...(deptStudents || []).map((s) => s.student_id || s.id),
      ...(deptUsers || []).map((u) => u.id),
    ];
    const studentId = generateStudentId({
      dept: cleanDept,
      year: cleanYear,
      existingIds,
    });

    const defaultPassword = WORKFLOW_CONFIG.defaultPassword || "DmiCE@1202";

    // 5. Handle Resident Photo Storage in MySQL
    let photoUrl = null;
    let photoBuffer = null;
    let mimeType = "image/jpeg";
    let fileSize = 0;

    if (photoDataUrl && typeof photoDataUrl === "string" && photoDataUrl.startsWith("data:image/")) {
      try {
        const matches = photoDataUrl.match(/^data:([A-Za-z0-9+/]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          const base64Data = matches[2];
          photoBuffer = Buffer.from(base64Data, "base64");
          fileSize = photoBuffer.length;
          photoUrl = `/api/student/profile/photo?studentId=${studentId}`;
        }
      } catch (err) {
        console.warn("Could not decode photo for database storage:", err);
      }
    }

    // 6. Save permanent User Record into MySQL
    await query(
      `INSERT INTO users (
        id, email, password, role, name, phone, avatar_url, must_change_password, status
      ) VALUES (?, ?, ?, 'student', ?, ?, ?, 1, 'active')`,
      [
        studentId,
        cleanEmail,
        defaultPassword,
        cleanName,
        cleanPhone,
        photoUrl,
      ]
    );

    // 7. Save permanent Student Record into MySQL
    await query(
      `INSERT INTO students (
        id, student_id, reg_no, name, department, programme, section, year, batch,
        phone, floor, room_number, room_verified, guardian_name, guardian_phone,
        guardian_relation, photo_url, profile_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        studentId,
        studentId,
        cleanRegNo,
        cleanName,
        cleanDept,
        cleanProgramme,
        cleanSection,
        cleanYear,
        cleanBatch,
        cleanPhone,
        cleanFloor || null,
        cleanRoomNo || null,
        cleanGuardianName,
        cleanGuardianPhone,
        cleanGuardianRelation,
        photoUrl,
        photoUrl ? 1 : 0,
      ]
    );

    // 8. If photo buffer available, insert into MySQL student_photos
    if (photoBuffer && photoBuffer.length > 0) {
      try {
        await query(
          `INSERT INTO student_photos (
            student_id, photo_data, mime_type, file_name, file_size
          ) VALUES (?, ?, ?, 'resident-photo.jpg', ?)
          ON DUPLICATE KEY UPDATE
            photo_data = VALUES(photo_data),
            mime_type = VALUES(mime_type),
            file_name = VALUES(file_name),
            file_size = VALUES(file_size),
            updated_at = CURRENT_TIMESTAMP`,
          [studentId, photoBuffer, mimeType, fileSize]
        );
      } catch (photoErr) {
        console.error("Error inserting into student_photos in MySQL:", photoErr);
      }
    }

    // 9. Return success response with generated credentials
    return NextResponse.json({
      ok: true,
      message: "Resident Account Created Successfully in MySQL!",
      data: {
        id: studentId,
        studentId,
        name: cleanName,
        email: cleanEmail,
        department: cleanDept,
        programme: cleanProgramme,
        section: cleanSection,
        year: cleanYear,
        batch: cleanBatch,
        regNo: cleanRegNo,
        phone: cleanPhone,
        guardianName: cleanGuardianName,
        guardianPhone: cleanGuardianPhone,
        guardianRelation: cleanGuardianRelation,
        photo: photoUrl,
        photoUrl,
        defaultPassword,
        role: "student",
      },
    });
  } catch (err) {
    console.error("Registration API error:", err);
    return NextResponse.json(
      { ok: false, code: "DATABASE_ERROR", message: err.message || "Failed to create account in database." },
      { status: 500 }
    );
  }
}
