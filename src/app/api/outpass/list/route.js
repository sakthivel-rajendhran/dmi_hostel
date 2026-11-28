import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { getMovementStatus } from "@/lib/utils/movementStatus.js";
import { normalizeDepartment } from "@/lib/services/reviewerAssignmentService.js";
import { resolveParentContact } from "@/lib/utils/contactResolution.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientStudentId = searchParams.get("studentId") || searchParams.get("student_id");
    const roleParam = (searchParams.get("role") || "").toLowerCase();
    const department = searchParams.get("department") || searchParams.get("dept");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = (searchParams.get("search") || "").toLowerCase().trim();

    // Check server session cookie
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    const effectiveRole = sessionUser?.role ? sessionUser.role.toLowerCase() : roleParam;
    const effectiveUserId = sessionUser?.id || "";

    const whereClauses = [];
    const params = [];

    // 1. Authenticated Student Scoping
    if (effectiveRole === "student") {
      const authStudentId = sessionUser?.studentId || sessionUser?.id || clientStudentId;
      if (authStudentId) {
        whereClauses.push("(o.student_id = ? OR s.id = ? OR s.student_id = ?)");
        params.push(authStudentId, authStudentId, authStudentId);
      }
    } else if (clientStudentId && !effectiveRole) {
      whereClauses.push("(o.student_id = ? OR s.id = ? OR s.student_id = ?)");
      params.push(clientStudentId, clientStudentId, clientStudentId);
    }

    // 2. Staff Scoping
    if (effectiveRole === "staff") {
      whereClauses.push("o.type = 'Home Pass'");

      if (effectiveUserId === "FY_STAFF") {
        whereClauses.push("(o.year = 1 OR o.assigned_staff_user_id = 'FY_STAFF')");
      } else if (effectiveUserId && effectiveUserId.endsWith("_STAFF")) {
        const deptCode = effectiveUserId.replace("_STAFF", "");
        const normCode = normalizeDepartment(deptCode);
        whereClauses.push(
          "(o.assigned_staff_user_id = ? OR (o.department = ? AND o.year IN (2, 3, 4))) AND o.year != 1"
        );
        params.push(effectiveUserId, normCode);
      } else if (department && department !== "all") {
        if (department === "FY" || department === "FIRST_YEAR") {
          whereClauses.push("o.year = 1");
        } else {
          const norm = normalizeDepartment(department);
          whereClauses.push("(s.department = ? OR o.department = ?) AND o.year > 1");
          params.push(norm, norm);
        }
      }
    }

    // 3. HOD Scoping
    if (effectiveRole === "hod") {
      whereClauses.push("o.type = 'Home Pass'");

      // Sequential Queue Requirement: HOD only sees passes recommended by Staff (or already acted on by HOD)
      if (status && status.toLowerCase() === "pending") {
        whereClauses.push("o.staff_approval_status = 'APPROVED' AND o.hod_approval_status = 'PENDING'");
      } else {
        whereClauses.push("(o.staff_approval_status = 'APPROVED' OR o.hod_approval_status IN ('APPROVED', 'REJECTED'))");
      }

      if (effectiveUserId === "FY_HOD") {
        whereClauses.push("(o.year = 1 OR o.assigned_hod_user_id = 'FY_HOD')");
      } else if (effectiveUserId && effectiveUserId.endsWith("_HOD")) {
        const deptCode = effectiveUserId.replace("_HOD", "");
        const normCode = normalizeDepartment(deptCode);
        whereClauses.push(
          "(o.assigned_hod_user_id = ? OR (o.department = ? AND o.year IN (2, 3, 4))) AND o.year != 1"
        );
        params.push(effectiveUserId, normCode);
      } else if (department && department !== "all") {
        if (department === "FY" || department === "FIRST_YEAR") {
          whereClauses.push("o.year = 1");
        } else {
          const norm = normalizeDepartment(department);
          whereClauses.push("(s.department = ? OR o.department = ?) AND o.year > 1");
          params.push(norm, norm);
        }
      }
    }

    // 4. Warden / Admin Scoping
    if (effectiveRole === "warden" || effectiveRole === "admin") {
      if (department && department !== "all") {
        const norm = normalizeDepartment(department);
        whereClauses.push("(s.department = ? OR o.department = ?)");
        params.push(norm, norm);
      }
    }

    // 5. Generic Status Filtering
    if (status && status !== "all") {
      const s = status.toLowerCase();
      if (effectiveRole !== "hod") {
        if (s === "pending") {
          if (effectiveRole === "warden" || effectiveRole === "admin") {
            // Warden pending list shows:
            // 1. Local passes pending
            // 2. Home passes forwarded by HOD (PENDING_WARDEN / recommended)
            whereClauses.push(
              "((o.type != 'Home Pass' AND o.status = 'pending') OR (o.type = 'Home Pass' AND (o.overall_status = 'PENDING_WARDEN' OR o.status = 'recommended')))"
            );
          } else {
            whereClauses.push("o.status IN ('pending', 'recommended')");
          }
        } else if (s === "approved") {
          whereClauses.push("o.status IN ('approved', 'gate_pass_issued')");
        } else if (s === "rejected") {
          whereClauses.push("o.status = 'rejected'");
        } else {
          whereClauses.push("o.status = ?");
          params.push(status);
        }
      }
    }

    // 6. Generic Type Filtering
    if (type && type !== "all") {
      whereClauses.push("o.type LIKE ?");
      params.push(`%${type}%`);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const sql = `
      SELECT
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
        s.photo_url AS student_photo,
        (SELECT sl.gate_id FROM security_logs sl WHERE (sl.pass_id = o.id OR sl.pass_id = o.pass_number) ORDER BY sl.timestamp DESC LIMIT 1) AS last_gate_id
      FROM outpasses o
      LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
      ${whereSQL}
      ORDER BY o.emergency DESC, o.created_at DESC
    `;

    let rows = await query(sql, params);

    // Search filter
    if (search) {
      rows = rows.filter((r) =>
        (r.id || "").toLowerCase().includes(search) ||
        (r.pass_number || "").toLowerCase().includes(search) ||
        (r.student_name || "").toLowerCase().includes(search) ||
        (r.student_id || "").toLowerCase().includes(search) ||
        (r.destination || "").toLowerCase().includes(search) ||
        (r.reason || "").toLowerCase().includes(search)
      );
    }

    const data = rows.map((r) => {
      const isHome = (r.type || "").toLowerCase().includes("home");
      const isOut = (r.status || "").toLowerCase() === "out";
      const isExpPast = r.expected_return_time && new Date(r.expected_return_time).getTime() < Date.now();
      const isOverdue = isOut && isExpPast;
      const effectiveStatus = isOverdue ? "overdue" : r.status;
      const parentContact = resolveParentContact(r);

      return {
        id: r.id,
        passNumber: r.pass_number,
        pass_number: r.pass_number,
        studentId: r.student_id,
        student_id: r.student_id,
        studentName: r.student_name || "Student",
        student_name: r.student_name || "Student",
        regNo: r.reg_no || "",
        reg_no: r.reg_no || "",
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
        departure_time: r.departure_time,
        toTime: r.expected_return_time,
        expectedReturnTime: r.expected_return_time,
        expected_return_time: r.expected_return_time,
        actualExitTime: r.actual_exit_time,
        actual_exit_time: r.actual_exit_time,
        actualReturnTime: r.actual_return_time || r.actual_entry_time,
        actualEntryTime: r.actual_return_time || r.actual_entry_time,
        actual_entry_time: r.actual_return_time || r.actual_entry_time,
        gateId: r.last_gate_id || "MAIN",
        gateCheckpoint: r.last_gate_id === "MAIN" ? "Main Campus Gate" : (r.last_gate_id || "Main Campus Gate"),
        movementStatus: getMovementStatus({
          status: effectiveStatus,
          actualExitTime: r.actual_exit_time,
          actualReturnTime: r.actual_return_time || r.actual_entry_time,
        }),
        movement_status: getMovementStatus({
          status: effectiveStatus,
          actualExitTime: r.actual_exit_time,
          actualReturnTime: r.actual_return_time || r.actual_entry_time,
        }),
        status: effectiveStatus,
        rawStatus: r.status,
        overallStatus: r.overall_status || effectiveStatus,
        overall_status: r.overall_status || effectiveStatus,
        isOverdue,
        isLate: Boolean(r.is_late) || isOverdue,
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
        qrToken: r.qr_token || null,
        qr_token: r.qr_token || null,

        // Reviewer Assignments
        assignedStaffUserId: r.assigned_staff_user_id || null,
        assigned_staff_user_id: r.assigned_staff_user_id || null,
        assignedHodUserId: r.assigned_hod_user_id || null,
        assigned_hod_user_id: r.assigned_hod_user_id || null,
        assignedAt: r.assigned_at || null,
        assigned_at: r.assigned_at || null,

        // Staff Review Snapshot
        staffApprovalStatus: r.staff_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        staff_approval_status: r.staff_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        staffApprovedBy: r.staff_approved_by || null,
        staff_approved_by: r.staff_approved_by || null,
        staffApprovedAt: r.staff_approved_at || null,
        staff_approved_at: r.staff_approved_at || null,
        staffRemarks: r.staff_remarks || null,
        staff_remarks: r.staff_remarks || null,

        // HOD Review Snapshot
        hodApprovalStatus: r.hod_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        hod_approval_status: r.hod_approval_status || (isHome ? "PENDING" : "NOT_REQUIRED"),
        hodApprovedBy: r.hod_approved_by || null,
        hod_approved_by: r.hod_approved_by || null,
        hodApprovedAt: r.hod_approved_at || null,
        hod_approved_at: r.hod_approved_at || null,
        hodRemarks: r.hod_remarks || null,
        hod_remarks: r.hod_remarks || null,

        // Warden Review Snapshot
        wardenApprovalStatus: r.warden_approval_status || "PENDING",
        warden_approval_status: r.warden_approval_status || "PENDING",
        wardenApprovedBy: r.warden_approved_by || null,
        warden_approved_by: r.warden_approved_by || null,
        wardenApprovedAt: r.warden_approved_at || null,
        warden_approved_at: r.warden_approved_at || null,
        wardenRemarks: r.warden_remarks || null,
        warden_remarks: r.warden_remarks || null,
        wardenReason: r.warden_reason || r.warden_remarks || null,
        warden_reason: r.warden_reason || r.warden_remarks || null,

        appliedAt: r.created_at,
        createdAt: r.created_at,
        created_at: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    return NextResponse.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (err) {
    console.error("[API outpass list] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to retrieve outpasses from database." },
      { status: 500 }
    );
  }
}
