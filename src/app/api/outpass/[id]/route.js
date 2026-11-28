import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { getMovementStatus } from "@/lib/utils/movementStatus.js";
import { resolveParentContact } from "@/lib/utils/contactResolution.js";

export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    // Query MySQL outpasses table
    const rows = await query(
      `SELECT
        o.*,
        COALESCE(s.name, o.student_name) AS student_name,
        COALESCE(s.reg_no, '') AS reg_no,
        COALESCE(s.department, o.department) AS department,
        COALESCE(s.year, o.year) AS year,
        COALESCE(s.room_number, o.room_number) AS room_number,
        COALESCE(s.floor, o.floor) AS floor,
        COALESCE(s.phone, o.student_contact) AS student_phone,
        COALESCE(s.guardian_phone, o.guardian_contact, o.guardian_phone) AS student_guardian_phone,
        COALESCE(s.guardian_name, '') AS guardian_name,
        COALESCE(s.guardian_relation, '') AS guardian_relation,
        s.father_name,
        s.father_phone,
        s.mother_name,
        s.mother_phone,
        s.photo_url AS student_photo
      FROM outpasses o
      LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
      WHERE o.id = ? OR o.pass_number = ?
      LIMIT 1`,
      [id, id]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      const isHome = (r.type || "").toLowerCase().includes("home");

      // Retrieve dynamic timeline directly from MySQL pass_timeline table
      const timelineRows = await query(
        "SELECT id, status, label, actor, note, timestamp FROM pass_timeline WHERE pass_id = ? ORDER BY timestamp ASC, id ASC",
        [r.id]
      ).catch(() => []);

      let timeline = [];
      if (timelineRows && timelineRows.length > 0) {
        timeline = timelineRows.map((t) => ({
          id: t.id,
          status: t.status,
          title: t.label,
          label: t.label,
          timestamp: t.timestamp,
          actor: t.actor,
          description: t.note,
          note: t.note,
        }));
      } else {
        timeline = [
          {
            title: isHome ? "Submitted (Awaiting Staff Recommendation)" : "Submitted (Awaiting Warden Clearance)",
            label: isHome ? "Submitted (Awaiting Staff Recommendation)" : "Submitted (Awaiting Warden Clearance)",
            status: "submitted",
            timestamp: r.created_at,
            actor: r.student_name || "Student",
            description: "Outpass request created in system.",
            note: "Outpass request created in system.",
          },
          ...(r.status === "approved" || r.status === "gate_pass_issued"
            ? [
                {
                  title: "Approved by Hostel Authority",
                  label: "Approved by Hostel Authority",
                  status: r.status,
                  timestamp: r.updated_at,
                  actor: "Hostel Authority",
                  description: r.warden_reason || "Approved for gate pass issuance.",
                  note: r.warden_reason || "Approved for gate pass issuance.",
                },
              ]
            : []),
          ...(r.status === "rejected"
            ? [
                {
                  title: "Application Rejected",
                  label: "Application Rejected",
                  status: "rejected",
                  timestamp: r.updated_at,
                  actor: "Hostel Authority",
                  description: r.warden_reason || "Application rejected.",
                  note: r.warden_reason || "Application rejected.",
                },
              ]
            : []),
        ];
      }

      const parentContact = resolveParentContact(r);

      const passData = {
        id: r.id,
        passNumber: r.pass_number,
        pass_number: r.pass_number,
        studentId: r.student_id,
        student_id: r.student_id,
        studentName: r.student_name || "Student",
        student_name: r.student_name || "Student",
        department: r.department || "CSE",
        dept: r.department || "CSE",
        year: r.year || 1,
        room: r.room_number || "—",
        roomNo: r.room_number || "—",
        roomNumber: r.room_number || "—",
        floor: r.floor || null,
        type: r.type,
        outpass_type: r.type,
        workflowType: isHome ? "HOME" : "LOCAL",
        workflow_type: isHome ? "HOME" : "LOCAL",
        destination: r.destination,
        reason: r.reason,
        fromTime: r.departure_time,
        departureTime: r.departure_time,
        toTime: r.expected_return_time,
        expectedReturnTime: r.expected_return_time,
        actualExitTime: r.actual_exit_time,
        actualReturnTime: r.actual_return_time,
        movementStatus: getMovementStatus({
          status: r.status,
          actualExitTime: r.actual_exit_time,
          actualReturnTime: r.actual_return_time,
        }),
        movement_status: getMovementStatus({
          status: r.status,
          actualExitTime: r.actual_exit_time,
          actualReturnTime: r.actual_return_time,
        }),
        status: r.status,
        overallStatus: r.overall_status || r.status,
        overall_status: r.overall_status || r.status,
        isLate: Boolean(r.is_late),
        lateMinutes: r.late_minutes || 0,
        emergency: Boolean(r.emergency),
        guardianConsent: Boolean(r.guardian_consent),
        parentPhone: parentContact.parentPhone,
        parent_phone: parentContact.parentPhone,
        parentName: parentContact.parentName,
        parent_name: parentContact.parentName,
        parentRelation: parentContact.parentRelation,
        parent_relation: parentContact.parentRelation,
        hasParentPhone: parentContact.hasParentPhone,
        fatherPhone: r.father_phone || "",
        motherPhone: r.mother_phone || "",
        guardianPhone: parentContact.parentPhone || "",
        guardianName: parentContact.parentName || "",
        guardian_name: parentContact.parentName || "",
        guardianRelation: parentContact.parentRelation || "",
        guardian_relation: parentContact.parentRelation || "",
        studentPhone: r.student_phone || "",
        photoUrl: r.student_photo || (r.student_id ? `/api/student/profile/photo?studentId=${encodeURIComponent(r.student_id)}` : null),
        studentPhoto: r.student_photo || (r.student_id ? `/api/student/profile/photo?studentId=${encodeURIComponent(r.student_id)}` : null),
        photo_url: r.student_photo || (r.student_id ? `/api/student/profile/photo?studentId=${encodeURIComponent(r.student_id)}` : null),
        regNo: r.reg_no || "",
        reg_no: r.reg_no || "",
        wardenReason: r.warden_reason || r.warden_remarks || null,
        warden_reason: r.warden_reason || r.warden_remarks || null,
        assignedStaffUserId: r.assigned_staff_user_id || null,
        assigned_staff_user_id: r.assigned_staff_user_id || null,
        assignedHodUserId: r.assigned_hod_user_id || null,
        assigned_hod_user_id: r.assigned_hod_user_id || null,
        assignedAt: r.assigned_at || null,
        assigned_at: r.assigned_at || null,
        staffRemarks: r.staff_remarks || null,
        staff_remarks: r.staff_remarks || null,
        staffApprovedBy: r.staff_approved_by || null,
        staff_approved_by: r.staff_approved_by || null,
        staffApprovedAt: r.staff_approved_at || null,
        staff_approved_at: r.staff_approved_at || null,
        staffApprovalStatus: r.staff_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        staff_approval_status: r.staff_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        hodRemarks: r.hod_remarks || null,
        hod_remarks: r.hod_remarks || null,
        hodApprovedBy: r.hod_approved_by || null,
        hod_approved_by: r.hod_approved_by || null,
        hodApprovedAt: r.hod_approved_at || null,
        hod_approved_at: r.hod_approved_at || null,
        hodApprovalStatus: r.hod_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        hod_approval_status: r.hod_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        wardenRemarks: r.warden_remarks || null,
        warden_remarks: r.warden_remarks || null,
        wardenApprovedBy: r.warden_approved_by || null,
        warden_approved_by: r.warden_approved_by || null,
        wardenApprovedAt: r.warden_approved_at || null,
        warden_approved_at: r.warden_approved_at || null,
        wardenApprovalStatus: r.warden_approval_status || "PENDING",
        warden_approval_status: r.warden_approval_status || "PENDING",
        appliedAt: r.created_at,
        createdAt: r.created_at,
        timeline,
      };
      return NextResponse.json({ ok: true, data: passData });
    }

    // Pass not found in authoritative MySQL database
    return NextResponse.json({ ok: false, message: "Outpass request not found." }, { status: 404 });
  } catch (err) {
    console.error("[API pass details] Error:", err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json().catch(() => ({}));

    // Check if pass exists in MySQL
    const passRows = await query(
      "SELECT * FROM outpasses WHERE id = ? OR pass_number = ? LIMIT 1",
      [id, id]
    );

    if (!passRows || passRows.length === 0) {
      return NextResponse.json({ ok: false, message: "Outpass not found." }, { status: 404 });
    }

    const currentPass = passRows[0];
    const currentStatus = (currentPass.status || "").toLowerCase();

    // Check server session cookie
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    const callerRole = sessionUser?.role || body.role || "student";
    const authStudentId = sessionUser?.studentId || sessionUser?.id || body.studentId || body.student_id;

    // Student cancelling a pending outpass
    const isCancelAction = body.action === "cancel" || body.status === "cancelled";
    if (isCancelAction) {
      if (callerRole === "student" && authStudentId && currentPass.student_id.toLowerCase() !== authStudentId.toLowerCase()) {
        return NextResponse.json(
          { ok: false, code: "UNAUTHORIZED", message: "You cannot cancel another student's pass." },
          { status: 403 }
        );
      }

      if (currentStatus !== "pending" && currentStatus !== "recommended") {
        return NextResponse.json(
          {
            ok: false,
            code: "CANNOT_CANCEL",
            message: `Only pending outpass applications can be cancelled. Pass is currently '${currentStatus}'.`,
          },
          { status: 403 }
        );
      }

      await query(
        "UPDATE outpasses SET status = 'cancelled', updated_at = NOW() WHERE id = ? OR pass_number = ?",
        [id, id]
      );

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'cancelled', 'Application Cancelled by Student', ?, ?, NOW())`,
        [
          currentPass.id,
          sessionUser?.name || body.actor || "Student",
          body.reason || "Cancelled by student from pass list",
        ]
      ).catch(() => {});

      // Cancellation recorded directly in MySQL outpasses and pass_timeline tables

      return NextResponse.json({
        ok: true,
        status: "cancelled",
        message: "Outpass application cancelled successfully.",
        data: { id: currentPass.id, status: "cancelled" },
      });
    }

    // Student editing pending or rejected pass
    const isEditAction = body.action === "edit" || body.destination || body.reason || body.departureTime || body.departure_time;

    if (isEditAction) {
      // Security Check: Only Pending or Rejected passes can be edited
      if (currentStatus !== "pending" && currentStatus !== "rejected") {
        return NextResponse.json(
          {
            ok: false,
            code: "CANNOT_EDIT",
            message: "Only Pending or Rejected outpasses can be edited. Approved or active passes cannot be modified.",
          },
          { status: 403 }
        );
      }

      const destination = body.destination || currentPass.destination;
      const reason = body.reason || currentPass.reason;
      const depTime = body.departureTime || body.departure_time || body.fromTime
        ? new Date(body.departureTime || body.departure_time || body.fromTime)
        : currentPass.departure_time;
      const retTime = body.expectedReturnTime || body.expected_return_time || body.toTime
        ? new Date(body.expectedReturnTime || body.expected_return_time || body.toTime)
        : currentPass.expected_return_time;
      const guardianPhone = body.guardianPhone || body.guardian_phone || currentPass.guardian_phone;
      const emergency = body.emergency !== undefined ? Boolean(body.emergency) : Boolean(currentPass.emergency);

      // Resubmit pass: Status resets to 'pending' for fresh Warden clearance
      await query(
        `UPDATE outpasses
         SET destination = ?, reason = ?, departure_time = ?, expected_return_time = ?,
             guardian_phone = ?, emergency = ?, status = 'pending', updated_at = NOW()
         WHERE id = ? OR pass_number = ?`,
        [destination, reason, depTime, retTime, guardianPhone, emergency, id, id]
      );

      // Record in pass_timeline
      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'submitted', 'Pass Resubmitted for Approval', ?, ?, NOW())`,
        [
          currentPass.id,
          body.studentName || body.student_name || "Student",
          `Outpass details updated by student. Resubmitted for Warden review.`,
        ]
      ).catch(() => {});

      // Add student notification
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Outpass Resubmitted', ?, 'pass_resubmitted', 0, ?, NOW())`,
        [
          notifId,
          currentPass.student_id,
          `Your updated outpass to ${destination} has been resubmitted and is awaiting Warden approval.`,
          currentPass.id,
        ]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        message: "Outpass updated and resubmitted for approval successfully.",
        data: { id: currentPass.id, status: "pending" },
      });
    }

    // Default status update (e.g. issuing digital gate pass)
    const newStatus = body.status || "gate_pass_issued";
    const note = body.note || body.remarks || "Digital Gate Pass issued for scanner.";
    const actor = body.actor || "Hostel Gate Pass Authority";

    await query(
      "UPDATE outpasses SET status = ?, updated_at = NOW() WHERE id = ? OR pass_number = ?",
      [newStatus, id, id]
    );

    await query(
      "INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp) VALUES (?, ?, ?, ?, ?, NOW())",
      [id, newStatus, `Status: ${newStatus.replace(/_/g, " ").toUpperCase()}`, actor, note]
    ).catch(() => {});

    return NextResponse.json({ ok: true, status: newStatus, message: `Pass updated to ${newStatus}.` });
  } catch (err) {
    console.error("[API update pass status] Error:", err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json().catch(() => ({}));
    const studentId = body.studentId || body.student_id;

    // Check server session cookie
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    // Check pass in MySQL
    const passRows = await query(
      "SELECT * FROM outpasses WHERE id = ? OR pass_number = ? LIMIT 1",
      [id, id]
    );

    if (!passRows || passRows.length === 0) {
      return NextResponse.json({ ok: false, message: "Outpass not found." }, { status: 404 });
    }

    const currentPass = passRows[0];
    const currentStatus = (currentPass.status || "").toLowerCase();
    const callerRole = sessionUser?.role || body.role || "student";
    const authStudentId = sessionUser?.studentId || sessionUser?.id || studentId;

    // Security Verification: Student ownership
    if (callerRole === "student") {
      if (authStudentId && currentPass.student_id.toLowerCase() !== authStudentId.toLowerCase()) {
        return NextResponse.json(
          {
            ok: false,
            code: "UNAUTHORIZED",
            message: "Unauthorized: You cannot delete another student's pass record.",
          },
          { status: 403 }
        );
      }

      // Security Verification: Only Rejected passes can be deleted by students
      if (currentStatus !== "rejected") {
        return NextResponse.json(
          {
            ok: false,
            code: "CANNOT_DELETE",
            message: `Only rejected passes can be deleted. Pass #${currentPass.pass_number || currentPass.id} is '${currentStatus}'.`,
          },
          { status: 403 }
        );
      }
    } else if (callerRole !== "warden" && callerRole !== "admin") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Unauthorized operation." },
        { status: 403 }
      );
    }

    const passId = currentPass.id;

    // Clean up dependent child records in MySQL safely
    await query("DELETE FROM outpass_approval_history WHERE outpass_id = ?", [passId]).catch(() => {});
    await query("DELETE FROM notifications WHERE pass_id = ?", [passId]).catch(() => {});
    await query("DELETE FROM pass_timeline WHERE pass_id = ?", [passId]).catch(() => {});
    await query("DELETE FROM security_logs WHERE pass_id = ?", [passId]).catch(() => {});
    await query("DELETE FROM outpasses WHERE id = ?", [passId]);

    // Authoritative deletion complete in MySQL database

    return NextResponse.json({
      ok: true,
      message: `Rejected Local Outpass #${currentPass.pass_number || passId} deleted successfully.`,
      deletedId: passId,
    });
  } catch (err) {
    console.error("[API delete pass] Error:", err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
