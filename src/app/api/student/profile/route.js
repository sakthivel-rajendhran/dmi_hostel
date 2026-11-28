import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { calculateProfileCompletion } from "@/lib/utils/profileCompletion.js";

/**
 * Helper to format student profile database record into API response format
 */
function formatStudentProfile(s) {
  const data = {
    id: s.id,
    studentId: s.student_id || s.id,
    regNo: s.reg_no,
    regNumber: s.reg_no,
    name: s.name,
    email: s.email || "",
    department: s.department,
    dept: s.department,
    programme: s.programme || "B.Tech",
    section: s.section || "Section A",
    year: s.year,
    batch: s.batch,
    gender: s.gender || "",
    phone: s.phone || s.user_phone || "",
    floor: s.floor || null,
    room: s.room_number || null,
    roomNo: s.room_number || null,
    roomNumber: s.room_number || null,
    roomVerified: Boolean(s.room_verified),
    fatherName: s.father_name || "",
    fatherPhone: s.father_phone || "",
    motherName: s.mother_name || "",
    motherPhone: s.mother_phone || "",
    guardianName: s.guardian_name || "",
    guardianPhone: s.guardian_phone || "",
    guardianRelation: s.guardian_relation || "Father",
    address: s.home_address || "",
    bloodGroup: s.blood_group || "O+ve",
    dob: s.dob || "",
    photo: s.photo_url || s.avatar_url || null,
    photoUrl: s.photo_url || s.avatar_url || null,
    photoDataUrl: s.photo_url || s.avatar_url || null,
    profileCompleted: Boolean(s.profile_completed),
    allocationStatus: s.allocation_status || "waiting_for_warden",
    hostelVerification: s.room_number ? "verified" : "unallocated",
    status: s.user_status || "Active",
    accountStatus: s.user_account_status || s.account_status || "APPROVED",
    role: "student",
  };

  const completion = calculateProfileCompletion(data);
  data.completion = completion;
  data.profileCompleteness = completion.percentage;

  return data;
}

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
        u.status as user_status,
        COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') as user_account_status
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

    // Backend Security: Block pending, rejected, or disabled accounts
    const accStatus = (s.user_account_status || s.account_status || "").toUpperCase();
    if (accStatus === "PENDING_WARDEN" || accStatus === "PENDING") {
      return NextResponse.json(
        { ok: false, code: "PENDING_APPROVAL", message: "Your registration is awaiting Warden approval." },
        { status: 403 }
      );
    }
    if (accStatus === "REJECTED") {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_REJECTED", message: "Your account registration has been rejected." },
        { status: 403 }
      );
    }
    if (s.user_status === "Disabled" || s.user_status === "disabled") {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_DISABLED", message: "This account has been disabled." },
        { status: 403 }
      );
    }

    const data = formatStudentProfile(s);

    // Sync profile_completed flag in database if needed
    if (Boolean(s.profile_completed) !== data.completion.is100Percent) {
      await query(
        "UPDATE students SET profile_completed = ? WHERE id = ? OR student_id = ?",
        [data.completion.is100Percent ? 1 : 0, s.id, s.student_id]
      ).catch(() => {});
      data.profileCompleted = data.completion.is100Percent;
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("GET /api/student/profile error:", err);
    return NextResponse.json({ ok: false, message: "Database query failed" }, { status: 500 });
  }
}

/**
 * PUT /api/student/profile
 * Updates student profile in MySQL with independent section persistence
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const studentId = body.studentId || body.id || request.headers.get("x-student-id");

    if (!studentId) {
      return NextResponse.json({ ok: false, message: "Student ID required" }, { status: 400 });
    }

    // Role Guard: Wardens and correspondents have read-only access to student profiles
    let callerRole = (request.headers.get("x-user-role") || body.callerRole || "").toLowerCase();
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        const sessionUser = JSON.parse(sessionCookie);
        if (sessionUser?.role) {
          callerRole = sessionUser.role.toLowerCase();
        }
      } catch (e) {}
    }

    if (callerRole === "warden" || callerRole === "correspondent") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Wardens have read-only access to resident profiles." },
        { status: 403 }
      );
    }

    const cleanId = String(studentId).trim();

    // Verify student exists and account is approved
    const checkRows = await query(
      `SELECT
         s.id, s.student_id,
         COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
         u.status
       FROM students s
       LEFT JOIN users u ON u.id = s.id OR u.id = s.student_id
       WHERE s.id = ? OR s.student_id = ? OR u.id = ? LIMIT 1`,
      [cleanId, cleanId, cleanId]
    );

    if (!checkRows || checkRows.length === 0) {
      return NextResponse.json({ ok: false, message: "Student record not found." }, { status: 404 });
    }

    const matchedStudent = checkRows[0];
    const accStatus = (matchedStudent.account_status || "").toUpperCase();
    if (accStatus !== "APPROVED" || matchedStudent.status === "Disabled") {
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Account not approved or disabled." }, { status: 403 });
    }

    // Validate Student Name if provided
    if (body.name !== undefined) {
      const cleanName = typeof body.name === "string" ? body.name.trim() : "";
      if (!cleanName || cleanName.length < 2) {
        return NextResponse.json(
          { ok: false, code: "INVALID_NAME", message: "Student name cannot be empty and must be at least 2 characters." },
          { status: 400 }
        );
      }
      if (cleanName.length > 50) {
        return NextResponse.json(
          { ok: false, code: "INVALID_NAME", message: "Student name cannot exceed 50 characters." },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z\s.']+$/.test(cleanName)) {
        return NextResponse.json(
          { ok: false, code: "INVALID_NAME", message: "Student name may only contain letters, spaces, dots, and apostrophes." },
          { status: 400 }
        );
      }
    }

    // Dynamic field building: Only update fields that were explicitly passed in the request body
    // This guarantees independent section saves (e.g. updating Parent details preserves Guardian and Student info).
    const studentUpdates = [];
    const studentParams = [];

    const fieldMap = {
      name: "name",
      gender: "gender",
      phone: "phone",
      bloodGroup: "blood_group",
      address: "home_address",
      dob: "dob",
      fatherName: "father_name",
      fatherPhone: "father_phone",
      motherName: "mother_name",
      motherPhone: "mother_phone",
      guardianName: "guardian_name",
      guardianPhone: "guardian_phone",
      guardianRelation: "guardian_relation",
      photoUrl: "photo_url",
      photo: "photo_url",
    };

    for (const [prop, col] of Object.entries(fieldMap)) {
      if (body[prop] !== undefined) {
        // Avoid duplicate push if both photo and photoUrl were sent
        if (studentUpdates.some((u) => u.startsWith(`${col} =`))) {
          continue;
        }
        const val = typeof body[prop] === "string" ? body[prop].trim() : body[prop];
        studentUpdates.push(`${col} = ?`);
        studentParams.push(val === "" ? null : val);
      }
    }

    if (studentUpdates.length > 0) {
      studentUpdates.push("updated_at = CURRENT_TIMESTAMP");
      studentParams.push(matchedStudent.id, matchedStudent.student_id);

      await query(
        `UPDATE students SET ${studentUpdates.join(", ")} WHERE id = ? OR student_id = ?`,
        studentParams
      );
    }

    // Update users table for synchronized fields
    const userUpdates = [];
    const userParams = [];
    if (body.name !== undefined) {
      userUpdates.push("name = ?");
      userParams.push(body.name?.trim() || null);
    }
    if (body.phone !== undefined) {
      userUpdates.push("phone = ?");
      userParams.push(body.phone?.trim() || null);
    }
    const finalPhoto = body.photoUrl || body.photo;
    if (finalPhoto !== undefined) {
      userUpdates.push("avatar_url = ?");
      userParams.push(finalPhoto || null);
    }

    if (userUpdates.length > 0) {
      userUpdates.push("updated_at = CURRENT_TIMESTAMP");
      userParams.push(matchedStudent.id, matchedStudent.student_id);
      await query(
        `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ? OR id = ?`,
        userParams
      );
    }

    // Fetch the updated record from MySQL to calculate fresh score & status
    const refreshedRows = await query(
      `SELECT
        s.*,
        u.email,
        u.phone as user_phone,
        u.avatar_url,
        u.role,
        u.status as user_status,
        COALESCE(u.account_status, s.account_status, 'APPROVED') as user_account_status
      FROM students s
      LEFT JOIN users u ON u.id = s.id OR u.id = s.student_id
      WHERE s.id = ? OR s.student_id = ?
      LIMIT 1`,
      [matchedStudent.id, matchedStudent.student_id]
    );

    const refreshed = refreshedRows[0];
    const formatted = formatStudentProfile(refreshed);

    // Update profile_completed in database
    await query(
      "UPDATE students SET profile_completed = ? WHERE id = ? OR student_id = ?",
      [formatted.completion.is100Percent ? 1 : 0, matchedStudent.id, matchedStudent.student_id]
    ).catch(() => {});

    formatted.profileCompleted = formatted.completion.is100Percent;

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully in MySQL",
      data: formatted,
      completion: formatted.completion,
    });
  } catch (err) {
    console.error("PUT /api/student/profile error:", err);
    return NextResponse.json({ ok: false, message: "Failed to update profile in database: " + err.message }, { status: 500 });
  }
}
