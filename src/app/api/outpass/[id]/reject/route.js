import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { normalizeDepartment } from "@/lib/services/reviewerAssignmentService.js";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json();

    const role = (body.role || body.actorRole || "").toLowerCase();
    const actorUserId = body.actorUserId || body.userId;
    const actorName = body.actorName || body.name || "Hostel Authority";
    const rawRemarks = body.remarks || body.reason || body.note || "";
    const remarks = String(rawRemarks).trim();

    // 0. Check server session cookie for authentication & role enforcement
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    if (sessionUser && sessionUser.role === "student") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Unauthorized: Students cannot reject outpasses." },
        { status: 403 }
      );
    }

    const effectiveRole = sessionUser?.role || role || "warden";
    const effectiveUserId = sessionUser?.id || actorUserId || "SYSTEM";
    const effectiveName = sessionUser?.name || actorName;

    // MANDATORY REMARKS ENFORCEMENT
    if (!remarks) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_REMARKS",
          message: "Rejection reason / remarks are mandatory.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch outpass from MySQL
    const passRows = await query(
      "SELECT * FROM outpasses WHERE id = ? OR pass_number = ? LIMIT 1",
      [id, id]
    );

    if (!passRows || passRows.length === 0) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Outpass request not found." },
        { status: 404 }
      );
    }

    const currentPass = passRows[0];
    const currentStatus = (currentPass.status || "").toLowerCase();
    const isHome = (currentPass.type || "").toLowerCase().includes("home");
    const passYear = parseInt(currentPass.year || 1, 10);
    const passDept = normalizeDepartment(currentPass.department);

    // 2. Validate current pass state before allowing rejection
    if (currentStatus === "out" || currentStatus === "returned") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATE",
          message: `Cannot reject pass #${currentPass.pass_number || currentPass.id}: Resident has already exited/returned (${currentStatus}).`,
        },
        { status: 400 }
      );
    }

    if (currentStatus === "rejected") {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_REJECTED",
          message: `Pass #${currentPass.pass_number || currentPass.id} has already been rejected.`,
        },
        { status: 400 }
      );
    }

    // 3. STAFF REJECTION
    if (effectiveRole === "staff") {
      if (!isHome) {
        return NextResponse.json(
          { ok: false, code: "INVALID_ACTION", message: "Staff rejection is only applicable for Home Outpasses." },
          { status: 400 }
        );
      }

      // RBAC check
      const isFYReviewer = effectiveUserId === "FY_STAFF";
      const isAssigned = currentPass.assigned_staff_user_id === effectiveUserId;
      let isDeptMatch = false;
      if (sessionUser?.department) {
        const userDept = normalizeDepartment(sessionUser.department);
        isDeptMatch = userDept === passDept && passYear > 1;
      }

      if (!isAssigned && !isFYReviewer && !isDeptMatch && effectiveUserId !== "SYSTEM") {
        return NextResponse.json(
          {
            ok: false,
            code: "FORBIDDEN",
            message: `Forbidden: You are not authorized to reject this pass (${currentPass.department} Year ${currentPass.year}).`,
          },
          { status: 403 }
        );
      }

      await query(
        `UPDATE outpasses
         SET status = 'rejected',
             overall_status = 'STAFF_REJECTED',
             staff_approval_status = 'REJECTED',
             staff_approved_by = ?,
             staff_approved_at = NOW(),
             staff_remarks = ?,
             warden_reason = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [effectiveName, remarks, remarks, currentPass.id]
      );

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'rejected', 'Staff Recommendation Declined', ?, ?, NOW())`,
        [currentPass.id, effectiveName, remarks]
      );

      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Pass Declined by Staff', ?, 'pass_rejected', 0, ?, NOW())`,
        [notifId, currentPass.student_id, `Your ${currentPass.type} request was declined by staff: ${remarks}`, currentPass.id]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        data: { id: currentPass.id, status: "rejected", overall_status: "STAFF_REJECTED" },
        message: "Pass rejected by staff.",
      });
    }

    // 4. HOD REJECTION
    if (effectiveRole === "hod") {
      if (!isHome) {
        return NextResponse.json(
          { ok: false, code: "INVALID_ACTION", message: "HOD rejection is only applicable for Home Outpasses." },
          { status: 400 }
        );
      }

      // RBAC check
      const isFYReviewer = effectiveUserId === "FY_HOD";
      const isAssigned = currentPass.assigned_hod_user_id === effectiveUserId;
      let isDeptMatch = false;
      if (sessionUser?.department) {
        const userDept = normalizeDepartment(sessionUser.department);
        isDeptMatch = userDept === passDept && passYear > 1;
      }

      if (!isAssigned && !isFYReviewer && !isDeptMatch && effectiveUserId !== "SYSTEM") {
        return NextResponse.json(
          {
            ok: false,
            code: "FORBIDDEN",
            message: `Forbidden: You are not authorized to reject this pass (${currentPass.department} Year ${currentPass.year}).`,
          },
          { status: 403 }
        );
      }

      await query(
        `UPDATE outpasses
         SET status = 'rejected',
             overall_status = 'HOD_REJECTED',
             hod_approval_status = 'REJECTED',
             hod_approved_by = ?,
             hod_approved_at = NOW(),
             hod_remarks = ?,
             warden_reason = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [effectiveName, remarks, remarks, currentPass.id]
      );

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'rejected', 'HOD Endorsement Declined', ?, ?, NOW())`,
        [currentPass.id, effectiveName, remarks]
      );

      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Pass Declined by HOD', ?, 'pass_rejected', 0, ?, NOW())`,
        [notifId, currentPass.student_id, `Your ${currentPass.type} request was declined by HOD: ${remarks}`, currentPass.id]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        data: { id: currentPass.id, status: "rejected", overall_status: "HOD_REJECTED" },
        message: "Pass rejected by HOD.",
      });
    }

    // 5. WARDEN REJECTION
    if (effectiveRole === "warden" || effectiveRole === "admin") {
      const updateResult = await query(
        `UPDATE outpasses
         SET status = 'rejected',
             overall_status = 'WARDEN_REJECTED',
             warden_approval_status = 'REJECTED',
             warden_approved_by = ?,
             warden_approved_at = NOW(),
             warden_remarks = ?,
             warden_reason = ?,
             updated_at = NOW()
         WHERE id = ? AND status != 'rejected'`,
        [effectiveName, remarks, remarks, currentPass.id]
      );

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { ok: false, code: "CONCURRENT_MODIFICATION", message: "Pass has already been rejected or modified concurrently." },
          { status: 409 }
        );
      }

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'rejected', 'Application Rejected by Warden', ?, ?, NOW())`,
        [currentPass.id, effectiveName, remarks]
      );

      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Pass Application Declined', ?, 'pass_rejected', 0, ?, NOW())`,
        [
          notifId,
          currentPass.student_id,
          `Your ${currentPass.type} request was rejected by Chief Warden: ${remarks}`,
          currentPass.id,
        ]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        data: { id: currentPass.id, status: "rejected", overall_status: "WARDEN_REJECTED" },
        message: "Outpass application rejected by Chief Warden.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        code: "FORBIDDEN",
        message: "Unauthorized role for rejecting passes.",
      },
      { status: 403 }
    );
  } catch (err) {
    console.error("[API reject] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process rejection." },
      { status: 500 }
    );
  }
}
