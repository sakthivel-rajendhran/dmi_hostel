import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db/mysql.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { allocateNextStudentId } from "@/lib/utils/student-id.js";
import { computeBatch, getFloorForRoom } from "@/lib/validators.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      gender,
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

    // Gender validation (Strictly "Male" or "Female")
    const cleanGender = typeof gender === "string" ? gender.trim() : "";
    if (!cleanGender || (cleanGender !== "Male" && cleanGender !== "Female")) {
      return NextResponse.json(
        { ok: false, code: "INVALID_GENDER", message: "Gender is required and must be either 'Male' or 'Female'." },
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

    const defaultPassword = WORKFLOW_CONFIG.defaultPassword || "DmiCE@1202";

    // 4. Handle Resident Photo Buffer
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
        }
      } catch (err) {
        console.warn("Could not decode photo for database storage:", err);
      }
    }

    // 5. Transaction-safe atomic student ID allocation and database insertion
    const pool = getPool();
    const conn = await pool.getConnection();
    let studentId = null;
    let photoUrl = null;

    try {
      await conn.beginTransaction();

      // Allocate unique student ID (e.g. CSE0401) atomically with row-level lock
      studentId = await allocateNextStudentId(conn, {
        dept: cleanDept,
        year: cleanYear,
      });

      if (photoBuffer) {
        photoUrl = `/api/student/profile/photo?studentId=${studentId}`;
      }

      // Save User Record into MySQL with PENDING_WARDEN status
      await conn.execute(
        `INSERT INTO users (
          id, email, password, role, name, phone, avatar_url, must_change_password, status, account_status
        ) VALUES (?, ?, ?, 'student', ?, ?, ?, 1, 'Active', 'PENDING_WARDEN')`,
        [
          studentId,
          cleanEmail,
          defaultPassword,
          cleanName,
          cleanPhone,
          photoUrl,
        ]
      );

      // Save Student Record into MySQL with PENDING_WARDEN status & Gender
      await conn.execute(
        `INSERT INTO students (
          id, student_id, reg_no, name, department, programme, section, year, batch,
          phone, gender, floor, room_number, room_verified, guardian_name, guardian_phone,
          guardian_relation, photo_url, profile_completed, allocation_status, account_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'waiting_for_warden', 'PENDING_WARDEN')`,
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
          cleanGender,
          cleanFloor || null,
          cleanRoomNo || null,
          cleanGuardianName,
          cleanGuardianPhone,
          cleanGuardianRelation,
          photoUrl,
          photoUrl ? 1 : 0,
        ]
      );

      // If photo buffer available, insert into MySQL student_photos
      if (photoBuffer && photoBuffer.length > 0) {
        await conn.execute(
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
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // 9. Return success response with registration details (Pending Warden Approval)
    return NextResponse.json({
      ok: true,
      message: "Registration Submitted Successfully. Your account is awaiting approval from the Hostel Warden.",
      data: {
        id: studentId,
        studentId,
        name: cleanName,
        email: cleanEmail,
        gender: cleanGender,
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
        role: "student",
        accountStatus: "PENDING_WARDEN",
        approvalStatus: "PENDING_WARDEN",
        allocationStatus: "waiting_for_warden",
        registeredAt: new Date().toISOString(),
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
