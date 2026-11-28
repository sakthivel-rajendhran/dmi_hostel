import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import crypto from "crypto";
import { normalizeDepartment } from "@/lib/services/reviewerAssignmentService.js";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json();

    const role = (body.role || body.actorRole || "").toLowerCase();
    const actorUserId = body.actorUserId || body.userId;
    const actorName = body.actorName || body.name || "Hostel Authority";
    const remarks = body.remarks || body.note || "";

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
        { ok: false, code: "FORBIDDEN", message: "Unauthorized: Students cannot approve outpasses." },
        { status: 403 }
      );
    }

    const effectiveRole = sessionUser?.role || role || "warden";
    const effectiveUserId = sessionUser?.id || actorUserId || "SYSTEM";
    const effectiveName = sessionUser?.name || actorName;

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

    // 2. Validate current pass state before allowing approval
    if (currentStatus === "out" || currentStatus === "returned") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATE",
          message: `Cannot approve pass #${currentPass.pass_number || currentPass.id}: Resident has already exited/returned (${currentStatus}).`,
        },
        { status: 400 }
      );
    }

    if (currentStatus === "rejected") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATE",
          message: `Cannot approve pass #${currentPass.pass_number || currentPass.id}: Pass has already been rejected.`,
        },
        { status: 400 }
      );
    }

    // 3. STAFF ACTION
    if (effectiveRole === "staff") {
      if (!isHome) {
        return NextResponse.json(
          { ok: false, code: "INVALID_ACTION", message: "Staff recommendation is only applicable for Home Outpasses." },
          { status: 400 }
        );
      }

      // RBAC check first
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
            message: `Forbidden: You are not authorized to review this pass (${currentPass.department} Year ${currentPass.year}).`,
          },
          { status: 403 }
        );
      }

      if (currentPass.staff_approval_status === "APPROVED") {
        return NextResponse.json(
          { ok: false, code: "ALREADY_APPROVED", message: "This pass has already been recommended by staff." },
          { status: 400 }
        );
      }

      const staffNote = remarks || "Recommended by Staff / Class In-charge";

      await query(
        `UPDATE outpasses
         SET overall_status = 'PENDING_HOD',
             staff_approval_status = 'APPROVED',
             staff_approved_by = ?,
             staff_approved_at = NOW(),
             staff_remarks = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [effectiveName, staffNote, currentPass.id]
      );

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'pending', 'Recommended by Staff', ?, ?, NOW())`,
        [currentPass.id, effectiveName, staffNote]
      );

      // Student notification
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Pass Recommended by Staff', 'Your Home Pass has been recommended by staff and forwarded to the Head of Department (HOD).', 'pass_recommended', 0, ?, NOW())`,
        [notifId, currentPass.student_id, currentPass.id]
      ).catch(() => {});

      // HOD notification
      if (currentPass.assigned_hod_user_id) {
        const hodNotifId = `NOTIF-HOD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
           VALUES (?, ?, 'Home Pass Pending HOD Review', ?, 'pass_submitted', 0, ?, NOW())`,
          [
            hodNotifId,
            currentPass.assigned_hod_user_id,
            `Home Pass for ${currentPass.student_name} (${currentPass.department} - Year ${currentPass.year}) has been recommended by staff and is awaiting your review.`,
            currentPass.id,
          ]
        ).catch(() => {});
      }

      return NextResponse.json({
        ok: true,
        data: { id: currentPass.id, status: "pending", overall_status: "PENDING_HOD" },
        message: "Home Pass recommended by staff successfully and forwarded to HOD.",
      });
    }

    // 4. HOD ACTION
    if (effectiveRole === "hod") {
      if (!isHome) {
        return NextResponse.json(
          { ok: false, code: "INVALID_ACTION", message: "HOD endorsement is only applicable for Home Outpasses." },
          { status: 400 }
        );
      }

      // RBAC check first
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
            message: `Forbidden: You are not authorized to review this pass (${currentPass.department} Year ${currentPass.year}).`,
          },
          { status: 403 }
        );
      }

      // Sequential workflow check: Staff must have approved first!
      if (currentPass.staff_approval_status !== "APPROVED") {
        return NextResponse.json(
          {
            ok: false,
            code: "WORKFLOW_SEQUENCE_ERROR",
            message: "Workflow violation: Home Pass must be recommended by Staff before HOD endorsement.",
          },
          { status: 400 }
        );
      }

      if (currentPass.hod_approval_status === "APPROVED") {
        return NextResponse.json(
          { ok: false, code: "ALREADY_APPROVED", message: "This pass has already been endorsed by HOD." },
          { status: 400 }
        );
      }

      const hodNote = remarks || "Endorsed and forwarded to Chief Warden";

      await query(
        `UPDATE outpasses
         SET status = 'recommended',
             overall_status = 'PENDING_WARDEN',
             hod_approval_status = 'APPROVED',
             hod_approved_by = ?,
             hod_approved_at = NOW(),
             hod_remarks = ?,
             warden_reason = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [effectiveName, hodNote, hodNote, currentPass.id]
      );

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'recommended', 'Forwarded by HOD', ?, ?, NOW())`,
        [currentPass.id, effectiveName, hodNote]
      );

      // Student notification
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Pass Forwarded by HOD', 'Your Home Pass has been endorsed by your Head of Department and forwarded to the Chief Warden.', 'pass_recommended', 0, ?, NOW())`,
        [notifId, currentPass.student_id, currentPass.id]
      ).catch(() => {});

      // Warden notification
      const wardenNotifId = `NOTIF-WARDEN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, 'all', 'Home Pass Awaiting Final Approval', ?, 'pass_submitted', 0, ?, NOW())`,
        [
          wardenNotifId,
          `Home Pass for ${currentPass.student_name} (${currentPass.department} - Year ${currentPass.year}) cleared by Staff & HOD, awaiting final clearance.`,
          currentPass.id,
        ]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        data: { id: currentPass.id, status: "recommended", overall_status: "PENDING_WARDEN" },
        message: "Home Pass endorsed by HOD successfully and forwarded to Chief Warden.",
      });
    }

    // 5. WARDEN ACTION
    if (effectiveRole === "warden" || effectiveRole === "admin") {
      // For Home Pass, verify that HOD has endorsed it (unless explicit emergency pass)
      if (isHome && !Boolean(currentPass.emergency)) {
        if (currentPass.hod_approval_status !== "APPROVED" && currentPass.overall_status !== "PENDING_WARDEN") {
          return NextResponse.json(
            {
              ok: false,
              code: "WORKFLOW_SEQUENCE_ERROR",
              message: "Cannot issue gate pass: Home Outpass must be endorsed by both Staff and HOD before Warden approval.",
            },
            { status: 400 }
          );
        }
      }

      // Generate unique QR verification token
      const qrSignature = crypto.randomBytes(8).toString("hex").toUpperCase();
      const qrToken = `DMI-PASS-${currentPass.id}-${qrSignature}`;
      const wardenNote = remarks || "Approved for campus exit";

      const updateResult = await query(
        `UPDATE outpasses
         SET status = 'approved',
             overall_status = 'APPROVED',
             warden_approval_status = 'APPROVED',
             warden_approved_by = ?,
             warden_approved_at = NOW(),
             warden_remarks = ?,
             warden_reason = ?,
             qr_token = ?,
             qr_generated_at = NOW(),
             updated_at = NOW()
         WHERE id = ? AND status IN ('pending', 'recommended')`,
        [effectiveName, wardenNote, wardenNote, qrToken, currentPass.id]
      );

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { ok: false, code: "CONCURRENT_MODIFICATION", message: "Outpass status was already changed concurrently." },
          { status: 409 }
        );
      }

      await query(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'approved', 'Gate Pass Issued & QR Generated', ?, ?, NOW())`,
        [currentPass.id, effectiveName, wardenNote]
      );

      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Gate Pass Issued', ?, 'pass_approved', 0, ?, NOW())`,
        [
          notifId,
          currentPass.student_id,
          `Your ${currentPass.type} has been officially approved. Your digital Gate QR is now ready for scanning at the Main Gate.`,
          currentPass.id,
        ]
      ).catch(() => {});

      return NextResponse.json({
        ok: true,
        data: {
          id: currentPass.id,
          status: "approved",
          overall_status: "APPROVED",
          qrToken,
        },
        message: "Outpass approved and gate pass issued successfully.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        code: "FORBIDDEN",
        message: "Unauthorized role for approving outpasses.",
      },
      { status: 403 }
    );
  } catch (err) {
    console.error("[API approve] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to approve outpass." },
      { status: 500 }
    );
  }
}
