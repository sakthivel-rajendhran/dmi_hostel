import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql.js";
import { verifyGateToken } from "@/lib/server/gateTokenEngine.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/gate/verify-scan
 * Unified direct scan route with full database transactions & row-level locking
 */
export async function POST(request) {
  let conn = null;

  try {
    const body = await request.json();
    const qrText = (body.qrText || body.token || body.manualCode || "").trim();

    if (!qrText) {
      return NextResponse.json(
        { ok: false, message: "QR scan data is required." },
        { status: 400 }
      );
    }

    // 1. Authenticate Student from Session
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    const studentId = sessionUser?.studentId || sessionUser?.id || body.studentId || body.student_id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHENTICATED", message: "Student authentication required." },
        { status: 401 }
      );
    }

    // 2. Verify Gate QR Token
    const expectedGate = (body.gateId || "MAIN").toUpperCase();
    const tokenCheck = await verifyGateToken(qrText, expectedGate, studentId);
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { ok: false, code: tokenCheck.code, message: tokenCheck.message },
        { status: 400 }
      );
    }

    const gateId = tokenCheck.gateId || expectedGate;
    const gateName = "Main Campus Gate";
    const verifiedBy = body.source || "student_camera_scanner";

    // 3. Begin MySQL Transaction
    const pool = getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 4. Anti-duplicate 10-second check
    const [recentScans] = await conn.execute(
      `SELECT id, action, timestamp 
       FROM security_logs 
       WHERE student_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 10 SECOND)
       LIMIT 1`,
      [studentId]
    );

    if (recentScans && recentScans.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          code: "DUPLICATE_SCAN",
          message: "Scan recorded recently. Please wait a few moments before scanning again.",
        },
        { status: 429 }
      );
    }

    // 5. Query active outpasses with row-level locking
    const [passRows] = await conn.execute(
      `SELECT o.*, s.name as student_full_name, s.reg_no
       FROM outpasses o
       LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
       WHERE o.student_id = ? OR o.student_id = (SELECT id FROM users WHERE id = ? LIMIT 1)
       ORDER BY o.created_at DESC
       FOR UPDATE`,
      [studentId, studentId]
    );

    if (!passRows || passRows.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          code: "NO_ACTIVE_PASS",
          message: "No outpass record found for your account. Please submit an application.",
        },
        { status: 404 }
      );
    }

    // Find the actionable pass
    let targetPass = passRows.find((r) => {
      const st = (r.status || "").toLowerCase();
      return ["out", "overdue", "approved", "gate_pass_issued"].includes(st);
    });

    if (!targetPass) {
      await conn.rollback();
      const pendingPass = passRows.find((r) => (r.status || "").toLowerCase() === "pending");
      if (pendingPass) {
        return NextResponse.json(
          {
            ok: false,
            code: "PENDING_PASS",
            message: "Your outpass is awaiting Chief Warden clearance. Gate scanning is locked until approved.",
          },
          { status: 403 }
        );
      }

      const rejectedPass = passRows.find((r) => (r.status || "").toLowerCase() === "rejected");
      if (rejectedPass) {
        return NextResponse.json(
          {
            ok: false,
            code: "REJECTED_PASS",
            message: `Your outpass was rejected: "${rejectedPass.warden_reason || 'Declined by hostel authority.'}".`,
          },
          { status: 403 }
        );
      }

      const returnedPass = passRows.find((r) => (r.status || "").toLowerCase() === "returned");
      if (returnedPass) {
        return NextResponse.json(
          {
            ok: false,
            code: "ALREADY_RETURNED",
            message: "Your previous outpass is already completed and closed. Please apply for a new pass.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: "NO_ACTIONABLE_PASS",
          message: "No approved active outpass authorized for gate scanning.",
        },
        { status: 400 }
      );
    }

    const currentStatus = (targetPass.status || "").toLowerCase();
    const passId = targetPass.id;
    const scanId = `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const tokenRef = tokenCheck.nonce || "NONCE_VERIFIED";

    let action = "EXIT";
    if (currentStatus === "out" || currentStatus === "overdue") {
      action = "ENTRY";
    } else if (currentStatus === "approved" || currentStatus === "gate_pass_issued") {
      action = "EXIT";
    }

    if (action === "EXIT") {
      if (targetPass.actual_exit_time) {
        await conn.rollback();
        return NextResponse.json(
          { ok: false, code: "ALREADY_EXITED", message: "This pass has already been recorded for campus exit." },
          { status: 409 }
        );
      }

      await conn.execute(
        `UPDATE outpasses
         SET status = 'out', overall_status = 'out', actual_exit_time = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [passId]
      );

      await conn.execute(
        `INSERT INTO security_logs (
          id, pass_id, student_id, action, gate_id, timestamp, verified_by, is_manual, 
          is_late, late_minutes, notes, scan_type, verification_status, qr_token_reference, created_at
        ) VALUES (?, ?, ?, 'EXIT', ?, NOW(), ?, 0, 0, 0, 'Gate exit confirmed via camera scan', 'EXIT', 'VERIFIED', ?, NOW())`,
        [scanId, passId, studentId, gateId, verifiedBy, tokenRef]
      );

      await conn.execute(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'out', 'Gate Exit Confirmed', 'Security Gate', ?, NOW())`,
        [passId, `Exited through ${gateName}`]
      );

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: {
          action: "EXIT",
          pass: {
            ...targetPass,
            status: "out",
            actual_exit_time: new Date().toISOString(),
            passNumber: targetPass.pass_number,
          },
          scannedAt: new Date().toISOString(),
          gate: { id: gateId, name: gateName },
          message: "Gate exit recorded successfully!",
        },
      });

    } else {
      // Re-entry (CRITICAL: Never blocked by overdue status)
      const expectedReturnTime = targetPass.expected_return_time ? new Date(targetPass.expected_return_time).getTime() : 0;
      const nowMs = Date.now();
      const isLate = expectedReturnTime > 0 && nowMs > expectedReturnTime;
      const lateByMinutes = isLate ? Math.max(1, Math.round((nowMs - expectedReturnTime) / 60000)) : 0;

      if (targetPass.actual_return_time) {
        await conn.rollback();
        return NextResponse.json(
          { ok: false, code: "ALREADY_RETURNED", message: "This pass has already been marked returned." },
          { status: 409 }
        );
      }

      await conn.execute(
        `UPDATE outpasses
         SET status = 'returned', overall_status = 'returned', actual_return_time = NOW(), 
             is_late = ?, late_minutes = ?, updated_at = NOW()
         WHERE id = ?`,
        [isLate ? 1 : 0, lateByMinutes, passId]
      );

      await conn.execute(
        `INSERT INTO security_logs (
          id, pass_id, student_id, action, gate_id, timestamp, verified_by, is_manual, 
          is_late, late_minutes, notes, scan_type, verification_status, qr_token_reference, created_at
        ) VALUES (?, ?, ?, 'ENTRY', ?, NOW(), ?, 0, ?, ?, ?, 'ENTRY', ?, ?, NOW())`,
        [
          scanId,
          passId,
          studentId,
          gateId,
          verifiedBy,
          isLate ? 1 : 0,
          lateByMinutes,
          isLate ? `Late return (${lateByMinutes}m overdue)` : "Safe return confirmed via camera scan",
          isLate ? "LATE_RETURN" : "VERIFIED",
          tokenRef
        ]
      );

      await conn.execute(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'returned', 'Gate Re-entry Confirmed', 'Security Gate', ?, NOW())`,
        [passId, isLate ? `Late return by ${lateByMinutes} minutes` : `Safe return through ${gateName}`]
      );

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: {
          action: "ENTRY",
          pass: {
            ...targetPass,
            status: "returned",
            actual_entry_time: new Date().toISOString(),
            is_late: isLate ? 1 : 0,
            late_minutes: lateByMinutes,
            passNumber: targetPass.pass_number,
          },
          scannedAt: new Date().toISOString(),
          isLate,
          lateByMinutes,
          gate: { id: gateId, name: gateName },
          message: isLate
            ? `Late entry recorded (${lateByMinutes} min past curfew). Welcome back!`
            : "Welcome back! Check-in confirmed.",
        },
      });
    }

  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (e) {}
    }
    console.error("[API gate verify-scan] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Gate scan processing failed." },
      { status: 500 }
    );
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (e) {}
    }
  }
}
