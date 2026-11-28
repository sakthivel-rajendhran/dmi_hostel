import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/mysql.js";
import { verifyGateToken } from "@/lib/server/gateTokenEngine.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/gate/movement
 * Step 2 of Option B: Execute Confirmed OUT or IN Movement with Full Database Transactions & Row-Level Locking
 */
export async function POST(request) {
  let conn = null;

  try {
    const body = await request.json();
    const { passId, action, qrText, source = "student_camera" } = body;

    const normalizedAction = (action || "").toUpperCase();
    if (!["OUT", "IN"].includes(normalizedAction)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_ACTION", message: "Movement action must be either 'OUT' or 'IN'." },
        { status: 400 }
      );
    }

    if (!passId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_PASS_ID", message: "passId is required to record movement." },
        { status: 400 }
      );
    }

    if (!qrText) {
      return NextResponse.json(
        { ok: false, code: "MISSING_QR", message: "Gate QR token is required to authorize movement." },
        { status: 400 }
      );
    }

    // 1. Authenticate Student from Session Cookie
    let sessionUser = null;
    const sessionCookie = request.cookies.get("dmi_session")?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(sessionCookie);
      } catch (e) {}
    }

    const authStudentId = sessionUser?.studentId || sessionUser?.id || body.studentId || body.student_id;
    if (!authStudentId) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHENTICATED", message: "You must be authenticated as a student to submit gate movement." },
        { status: 401 }
      );
    }

    // 2. Cryptographic Token Verification
    const expectedGate = (body.gateId || "MAIN").toUpperCase();
    const tokenCheck = await verifyGateToken(qrText, expectedGate, authStudentId);
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { ok: false, code: tokenCheck.code, message: tokenCheck.message },
        { status: 400 }
      );
    }

    const gateId = tokenCheck.gateId || expectedGate;
    const gateName = "Main Campus Gate";

    // 3. Connect to MySQL and Start Transaction
    const pool = getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 4. Anti-duplicate 10-second debounce check within transaction
    const [recentScans] = await conn.execute(
      `SELECT id, action, timestamp 
       FROM security_logs 
       WHERE student_id = ? AND pass_id = ? AND action = ? 
         AND timestamp > DATE_SUB(NOW(), INTERVAL 10 SECOND)
       LIMIT 1`,
      [authStudentId, passId, normalizedAction === "OUT" ? "EXIT" : "ENTRY"]
    );

    if (recentScans && recentScans.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          code: "DUPLICATE_SUBMISSION",
          message: `Movement '${normalizedAction}' was already recorded seconds ago. Please do not submit repeatedly.`,
        },
        { status: 429 }
      );
    }

    // 5. Row-level Lock (FOR UPDATE) to prevent race conditions & concurrent conflicting movements
    const [passRows] = await conn.execute(
      `SELECT * FROM outpasses 
       WHERE (id = ? OR pass_number = ?)
       FOR UPDATE`,
      [passId, passId]
    );

    if (!passRows || passRows.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, code: "PASS_NOT_FOUND", message: "Specified outpass record does not exist." },
        { status: 404 }
      );
    }

    const pass = passRows[0];

    // Verify ownership: pass must belong to the authenticated student
    if (pass.student_id !== authStudentId) {
      // Check if student_id references users.id
      const [userCheck] = await conn.execute(
        `SELECT id FROM users WHERE id = ? OR email = ? LIMIT 1`,
        [pass.student_id, sessionUser?.email || ""]
      );

      if (!userCheck || userCheck.length === 0 || userCheck[0].id !== authStudentId) {
        await conn.rollback();
        return NextResponse.json(
          { ok: false, code: "FORBIDDEN", message: "Unauthorized: You can only record gate movement for your own outpass." },
          { status: 403 }
        );
      }
    }

    const currentStatus = (pass.status || "").toLowerCase();
    const scanId = `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const tokenRef = tokenCheck.nonce || "NONCE_VERIFIED";

    // 6. Execute Specific Movement
    if (normalizedAction === "OUT") {
      // State check: Must be approved or gate_pass_issued
      if (!["approved", "gate_pass_issued"].includes(currentStatus)) {
        await conn.rollback();
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_STATE_FOR_EXIT",
            message: currentStatus === "out" || currentStatus === "overdue"
              ? "Exit has already been recorded for this pass. You are currently outside campus."
              : currentStatus === "returned"
              ? "This pass has already been completed and returned."
              : `Pass status '${pass.status}' is not eligible for campus exit.`,
          },
          { status: 409 }
        );
      }

      if (pass.actual_exit_time) {
        await conn.rollback();
        return NextResponse.json(
          { ok: false, code: "ALREADY_EXITED", message: "Campus exit has already been recorded for this outpass." },
          { status: 409 }
        );
      }

      // Update Outpasses table
      await conn.execute(
        `UPDATE outpasses 
         SET status = 'out', overall_status = 'out', actual_exit_time = NOW(), updated_at = NOW() 
         WHERE id = ?`,
        [pass.id]
      );

      // Record in security_logs
      await conn.execute(
        `INSERT INTO security_logs (
          id, pass_id, student_id, action, gate_id, timestamp, verified_by, is_manual, 
          is_late, late_minutes, notes, scan_type, verification_status, qr_token_reference, created_at
        ) VALUES (?, ?, ?, 'EXIT', ?, NOW(), ?, 0, 0, 0, 'Campus exit confirmed by student scan', 'EXIT', 'VERIFIED', ?, NOW())`,
        [scanId, pass.id, authStudentId, gateId, source, tokenRef]
      );

      // Maintain single gatepass movement summary record
      await conn.execute(
        `INSERT INTO gate_movement_summaries (pass_id, pass_number, student_id, gate_id, gate_station, exit_at, movement_status)
         VALUES (?, ?, ?, ?, ?, NOW(), 'OUTSIDE CAMPUS')
         ON DUPLICATE KEY UPDATE
           exit_at = COALESCE(exit_at, NOW()),
           movement_status = IF(entry_at IS NOT NULL, 'RETURNED', 'OUTSIDE CAMPUS'),
           updated_at = NOW()`,
        [pass.id, pass.pass_number || pass.id, authStudentId, gateId, gateName]
      ).catch(() => {});

      // Add to pass_timeline
      await conn.execute(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'out', 'Campus Exit Confirmed', 'Security Gate', ?, NOW())`,
        [pass.id, `Exited campus through ${gateName}`]
      );

      // Add Notification
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await conn.execute(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Campus Exit Confirmed', ?, 'gate_exit', 0, ?, NOW())`,
        [notifId, authStudentId, `Your departure through ${gateName} has been recorded. Please return before curfew.`, pass.id]
      );

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: {
          action: "OUT",
          passId: pass.id,
          passNumber: pass.pass_number,
          status: "out",
          actualExitTime: new Date().toISOString(),
          gate: { id: gateId, name: gateName },
          message: "Campus exit recorded successfully! Have a safe journey.",
        },
      });

    } else if (normalizedAction === "IN") {
      // State check: Must be 'out' or 'overdue'
      if (!["out", "overdue"].includes(currentStatus)) {
        await conn.rollback();
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_STATE_FOR_RETURN",
            message: currentStatus === "returned"
              ? "This pass has already been returned and closed."
              : currentStatus === "approved" || currentStatus === "gate_pass_issued"
              ? "You have not exited campus yet. You must record an OUT exit before returning."
              : `Pass status '${pass.status}' is not eligible for campus return.`,
          },
          { status: 409 }
        );
      }

      if (pass.actual_return_time) {
        await conn.rollback();
        return NextResponse.json(
          { ok: false, code: "ALREADY_RETURNED", message: "Campus return has already been recorded for this pass." },
          { status: 409 }
        );
      }

      // CRITICAL REQUIREMENT: Return is NEVER blocked by expected return date!
      // Calculate whether overdue for monitoring purposes only
      const expReturnTime = pass.expected_return_time ? new Date(pass.expected_return_time).getTime() : 0;
      const nowMs = Date.now();
      const isLate = expReturnTime > 0 && nowMs > expReturnTime;
      const lateMinutes = isLate ? Math.max(1, Math.round((nowMs - expReturnTime) / 60000)) : 0;

      // Update Outpasses table
      await conn.execute(
        `UPDATE outpasses 
         SET status = 'returned', overall_status = 'returned', actual_return_time = NOW(), 
             is_late = ?, late_minutes = ?, updated_at = NOW() 
         WHERE id = ?`,
        [isLate ? 1 : 0, lateMinutes, pass.id]
      );

      // Record in security_logs
      await conn.execute(
        `INSERT INTO security_logs (
          id, pass_id, student_id, action, gate_id, timestamp, verified_by, is_manual, 
          is_late, late_minutes, notes, scan_type, verification_status, qr_token_reference, created_at
        ) VALUES (?, ?, ?, 'ENTRY', ?, NOW(), ?, 0, ?, ?, ?, 'ENTRY', ?, ?, NOW())`,
        [
          scanId,
          pass.id,
          authStudentId,
          gateId,
          source,
          isLate ? 1 : 0,
          lateMinutes,
          isLate ? `Late return by ${lateMinutes} minutes` : 'Safe return confirmed by student scan',
          isLate ? 'LATE_RETURN' : 'VERIFIED',
          tokenRef
        ]
      );

      // Maintain single gatepass movement summary record
      await conn.execute(
        `INSERT INTO gate_movement_summaries (pass_id, pass_number, student_id, gate_id, gate_station, entry_at, movement_status)
         VALUES (?, ?, ?, ?, ?, NOW(), 'RETURNED')
         ON DUPLICATE KEY UPDATE
           entry_at = NOW(),
           movement_status = 'RETURNED',
           updated_at = NOW()`,
        [pass.id, pass.pass_number || pass.id, authStudentId, gateId, gateName]
      ).catch(() => {});

      // Add to pass_timeline
      await conn.execute(
        `INSERT INTO pass_timeline (pass_id, status, label, actor, note, timestamp)
         VALUES (?, 'returned', 'Campus Re-entry Confirmed', 'Security Gate', ?, NOW())`,
        [pass.id, isLate ? `Late return by ${lateMinutes}m through ${gateName}` : `Safe return through ${gateName}`]
      );

      // Add Notification
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await conn.execute(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
         VALUES (?, ?, 'Campus Return Confirmed', ?, 'gate_entry', 0, ?, NOW())`,
        [
          notifId,
          authStudentId,
          isLate
            ? `Your hostel check-in has been recorded. Note: Return was overdue by ${lateMinutes} minutes.`
            : `Your safe return through ${gateName} has been recorded. Welcome back!`,
          pass.id
        ]
      );

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: {
          action: "IN",
          passId: pass.id,
          passNumber: pass.pass_number,
          status: "returned",
          actualReturnTime: new Date().toISOString(),
          isLate,
          lateMinutes,
          gate: { id: gateId, name: gateName },
          message: isLate
            ? `Welcome back! Return recorded (overdue by ${lateMinutes} minutes).`
            : "Welcome back! Campus re-entry recorded successfully.",
        },
      });
    }

  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (e) {}
    }
    console.error("[API gate movement] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to record gate movement." },
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
