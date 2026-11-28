import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/mysql.js";
import { resolveHomeOutpassReviewers } from "@/lib/services/reviewerAssignmentService.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const stuId = body.studentId || body.student_id;
    if (!stuId) {
      return NextResponse.json(
        { ok: false, message: "student_id is required." },
        { status: 400 }
      );
    }

    // Check server session cookie for student identity verification
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }
    if (sessionUser && sessionUser.role === "student") {
      const authStudentId = sessionUser.studentId || sessionUser.id;
      if (stuId !== authStudentId) {
        return NextResponse.json(
          { ok: false, code: "FORBIDDEN", message: "Unauthorized: You cannot submit an outpass for another student." },
          { status: 403 }
        );
      }
    }

    if (!body.destination || !String(body.destination).trim()) {
      return NextResponse.json(
        { ok: false, code: "MISSING_DESTINATION", message: "Destination is required." },
        { status: 400 }
      );
    }

    const passType = (body.type || body.outpass_type || "").toLowerCase().includes("home") ? "Home Pass" : "Local Pass";

    // Validate exit and return date/time
    const rawDep = body.departureTime || body.departure_time || body.fromTime;
    const rawRet = body.expectedReturnTime || body.expected_return_time || body.toTime;
    if (!rawDep || !rawRet) {
      return NextResponse.json(
        { ok: false, code: "MISSING_DATES", message: "Departure time and expected return time are required." },
        { status: 400 }
      );
    }

    const depTime = new Date(rawDep);
    const retTime = new Date(rawRet);
    if (isNaN(depTime.getTime()) || isNaN(retTime.getTime())) {
      return NextResponse.json(
        { ok: false, code: "INVALID_DATES", message: "Invalid departure or return date/time format." },
        { status: 400 }
      );
    }

    if (retTime.getTime() <= depTime.getTime()) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INTERVAL", message: "Expected return time must be strictly later than departure time." },
        { status: 400 }
      );
    }

    if (passType === "Local Pass") {
      // Local pass must be on the same calendar day in Asia/Kolkata
      const depDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(depTime);
      const retDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(retTime);
      if (depDateStr !== retDateStr) {
        return NextResponse.json(
          { ok: false, code: "LOCAL_SAME_DAY", message: "Local Outpass departure and return must occur on the same calendar day." },
          { status: 400 }
        );
      }

      // Local pass return time must be <= 09:00 PM curfew in Asia/Kolkata
      const retHoursIST = parseInt(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(retTime),
        10
      );
      const retMinutesIST = parseInt(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", minute: "numeric" }).format(retTime),
        10
      );
      if (retHoursIST > 21 || (retHoursIST === 21 && retMinutesIST > 0)) {
        return NextResponse.json(
          { ok: false, code: "CURFEW_EXCEEDED", message: "Local Outpass curfew exceeded: Expected return time cannot be later than 09:00 PM." },
          { status: 400 }
        );
      }
    }

    // Backend Security Check: Verify student approval status directly from MySQL
    const studentRows = await query(
      `SELECT
         COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
         u.status
       FROM users u
       LEFT JOIN students s ON s.id = u.id OR s.student_id = u.id
       WHERE u.id = ? OR s.student_id = ?
       LIMIT 1`,
      [stuId, stuId]
    );

    if (studentRows && studentRows.length > 0) {
      const acc = (studentRows[0].account_status || "").toUpperCase();
      if (acc === "PENDING_WARDEN" || acc === "PENDING") {
        return NextResponse.json(
          { ok: false, code: "PENDING_APPROVAL", message: "Account is awaiting Warden approval. Outpasses cannot be applied." },
          { status: 403 }
        );
      }
      if (acc === "REJECTED") {
        return NextResponse.json(
          { ok: false, code: "ACCOUNT_REJECTED", message: "Account has been rejected. Outpasses cannot be applied." },
          { status: 403 }
        );
      }
      if (studentRows[0].status === "Disabled" || studentRows[0].status === "disabled") {
        return NextResponse.json(
          { ok: false, code: "ACCOUNT_DISABLED", message: "Account is disabled." },
          { status: 403 }
        );
      }
    }

    // Idempotency: Prevent duplicate records from network retries or rapid double-clicks
    const idempotencyKey = body.idempotencyKey || body.requestId || body.clientSubmissionId || null;

    if (idempotencyKey) {
      const existingIdemRows = await query(
        `SELECT id, pass_number, status, overall_status, departure_time, expected_return_time, destination, type
         FROM outpasses
         WHERE (student_id = ? OR student_id = (SELECT id FROM users WHERE id = ? LIMIT 1))
           AND idempotency_key = ?
         LIMIT 1`,
        [stuId, stuId, idempotencyKey]
      );

      if (existingIdemRows && existingIdemRows.length > 0) {
        return NextResponse.json({
          ok: true,
          data: existingIdemRows[0],
          isRetry: true,
          message: `${passType} application already submitted.`,
        });
      }
    } else {
      // Rapid double-click protection (exact same payload within 5 seconds)
      const duplicateCheck = await query(
        `SELECT id, pass_number, status, overall_status, departure_time, expected_return_time, destination, type
         FROM outpasses
         WHERE (student_id = ? OR student_id = (SELECT id FROM users WHERE id = ? LIMIT 1))
           AND type = ?
           AND destination = ?
           AND departure_time = ?
           AND expected_return_time = ?
           AND created_at >= NOW() - INTERVAL 5 SECOND
         LIMIT 1`,
        [stuId, stuId, passType, body.destination, depTime, retTime]
      );

      if (duplicateCheck && duplicateCheck.length > 0) {
        return NextResponse.json({
          ok: true,
          data: duplicateCheck[0],
          isRetry: true,
          message: `${passType} application already submitted.`,
        });
      }
    }

    // Retrieve student profile from MySQL
    const studentProfileRows = await query(
      "SELECT name, department, year, room_number, floor, phone, guardian_phone FROM students WHERE student_id = ? OR id = ? LIMIT 1",
      [stuId, stuId]
    );
    const studentInfo = (studentProfileRows && studentProfileRows[0]) || {};

    const passId = `OP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const passNumber = `PASS-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const isHome = passType === "Home Pass";
    const studentName = studentInfo.name || body.studentName || "Student";
    const department = studentInfo.department || body.department || "CSE";
    const year = studentInfo.year || body.year || 1;
    const roomNumber = studentInfo.room_number || body.roomNo || body.roomNumber || null;
    const floor = studentInfo.floor || body.floor || null;
    const studentContact = body.studentPhone || studentInfo.phone || null;
    const guardianContact = body.guardianPhone || studentInfo.guardian_phone || null;

    const workflowType = isHome ? "HOME" : "LOCAL";
    let overallStatus = "PENDING_WARDEN";
    let staffApprovalStatus = "NOT_REQUIRED";
    let hodApprovalStatus = "NOT_REQUIRED";
    let assignedStaffUserId = null;
    let assignedHodUserId = null;
    let assignedAt = null;

    if (isHome) {
      const reviewers = await resolveHomeOutpassReviewers({ year, department });
      assignedStaffUserId = reviewers.staffUserId;
      assignedHodUserId = reviewers.hodUserId;
      assignedAt = new Date();
      staffApprovalStatus = "PENDING";
      hodApprovalStatus = "PENDING";
      overallStatus = "PENDING_STAFF";
    }

    const wardenApprovalStatus = "PENDING";

    // Authoritative MySQL persistence
    await query(
      `INSERT INTO outpasses (
         id, pass_number, student_id, type, destination, reason,
         departure_time, expected_return_time, status, emergency, guardian_consent, guardian_phone,
         student_name, department, year, room_number, floor,
         outpass_type, workflow_type, overall_status, staff_approval_status, hod_approval_status, warden_approval_status,
         assigned_staff_user_id, assigned_hod_user_id, assigned_at,
         student_contact, guardian_contact, idempotency_key
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [
        passId,
        passNumber,
        stuId,
        passType,
        body.destination,
        body.reason || "General outpass",
        depTime,
        retTime,
        "pending",
        Boolean(body.emergency),
        Boolean(body.guardianConsent !== false),
        guardianContact,
        studentName,
        department,
        year,
        roomNumber,
        floor,
        passType,
        workflowType,
        overallStatus,
        staffApprovalStatus,
        hodApprovalStatus,
        wardenApprovalStatus,
        assignedStaffUserId,
        assignedHodUserId,
        assignedAt,
        studentContact,
        guardianContact,
        idempotencyKey,
      ]
    );

    // Record in MySQL pass_timeline
    const isEmergencyPass = Boolean(body.emergency);
    await query(
      `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
       VALUES (?, 'submitted', ?, ?, ?, NOW())`,
      [
        passId,
        isEmergencyPass ? "Emergency Medical Pass Submitted" : "Outpass Request Submitted",
        studentInfo.name || "Student",
        isEmergencyPass
          ? `URGENT MEDICAL: ${body.reason || "Medical Appointment / Hospital Emergency"}`
          : (body.reason || "Standard student request"),
      ]
    ).catch(() => {});

    // Add Student Notification in MySQL
    const studentNotifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        studentNotifId,
        stuId,
        isEmergencyPass ? "Urgent Emergency Pass Submitted" : `${passType} Submitted`,
        isEmergencyPass
          ? `Your emergency medical pass to ${body.destination} has been submitted with high priority for urgent Warden review.`
          : isHome
          ? `Your Home Pass to ${body.destination} has been submitted and routed to your Staff Advisor for academic review.`
          : `Your ${passType} to ${body.destination} has been submitted and is awaiting approval.`,
        isEmergencyPass ? "emergency_pass" : "pass_submitted",
        passId,
      ]
    ).catch(() => {});

    // Notify Assigned Staff Reviewer for Home Outpass
    if (isHome && assignedStaffUserId) {
      const staffNotifId = `NOTIF-STAFF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, ?, ?, 'pass_submitted', 0, ?, NOW())`,
        [
          staffNotifId,
          assignedStaffUserId,
          `New Home Outpass: ${studentName}`,
          `Resident ${studentName} (${department} - Year ${year}) has submitted a Home Outpass to ${body.destination} awaiting your review.`,
          passId,
        ]
      ).catch(() => {});
    }

    // Flag Urgent Notification for Hostel Authorities
    if (isEmergencyPass) {
      const wardenNotifId = `NOTIF-URGENT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, 'all', ?, ?, 'emergency_pass', 0, ?, NOW())`,
        [
          wardenNotifId,
          `URGENT: Emergency Medical Pass - ${studentInfo.name || "Student"}`,
          `Urgent Medical / Hospital pass requested to ${body.destination}. Requires immediate clearance.`,
          passId,
        ]
      ).catch(() => {});
    }

    const createdRecord = {
      id: passId,
      pass_number: passNumber,
      student_id: stuId,
      student_name: studentName,
      department: department,
      year: year,
      room_number: roomNumber || "305",
      outpass_type: passType,
      destination: body.destination,
      departure_time: depTime,
      expected_return_time: retTime,
      overall_status: overallStatus,
      assigned_staff_user_id: assignedStaffUserId,
      assigned_hod_user_id: assignedHodUserId,
    };

    return NextResponse.json({
      ok: true,
      data: createdRecord,
      message: `${passType} application submitted successfully!`,
    });
  } catch (err) {
    console.error("[API apply] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to submit outpass request." },
      { status: 500 }
    );
  }
}
