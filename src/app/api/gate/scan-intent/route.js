import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { verifyGateToken } from "@/lib/server/gateTokenEngine.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/gate/scan-intent
 * Step 1 of Option B: Validate Gate QR + Authenticate Student + Retrieve Outpass & Permitted Action
 * DOES NOT modify the database.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const qrText = (body.qrText || body.token || "").trim();

    if (!qrText) {
      return NextResponse.json(
        { ok: false, code: "MISSING_QR", message: "QR code data is required." },
        { status: 400 }
      );
    }

    // 1. Authenticate student from session cookie or payload
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
        { ok: false, code: "UNAUTHENTICATED", message: "You must be logged in as a student to scan gate QR." },
        { status: 401 }
      );
    }

    // 2. Cryptographic Gate Token Verification
    const expectedGate = (body.gateId || "MAIN").toUpperCase();
    const tokenCheck = await verifyGateToken(qrText, expectedGate, studentId);
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { ok: false, code: tokenCheck.code, message: tokenCheck.message },
        { status: 400 }
      );
    }

    // 3. Query student active outpasses from MySQL
    const passRows = await query(
      `SELECT o.*, s.name as student_full_name, s.reg_no, s.department as student_dept, s.room_number as student_room
       FROM outpasses o
       LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
       WHERE o.student_id = ? OR o.student_id = (SELECT id FROM users WHERE id = ? LIMIT 1)
       ORDER BY o.created_at DESC`,
      [studentId, studentId]
    );

    if (!passRows || passRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_ACTIVE_PASS",
          message: "No outpass record found for your account. Please submit an application.",
        },
        { status: 404 }
      );
    }

    // Find the relevant actionable pass
    // Eligible active statuses: 'gate_pass_issued', 'approved', 'out', 'overdue'
    let targetPass = passRows.find((r) => {
      const st = (r.status || "").toLowerCase();
      return ["out", "overdue", "approved", "gate_pass_issued"].includes(st);
    });

    if (!targetPass) {
      // Check for informative feedback
      const pendingPass = passRows.find((r) => ["pending", "recommended"].includes((r.status || "").toLowerCase()));
      if (pendingPass) {
        const isRec = (pendingPass.status || "").toLowerCase() === "recommended";
        return NextResponse.json(
          {
            ok: false,
            code: "PENDING_APPROVAL",
            message: isRec
              ? "Your Home Outpass has been recommended by staff and is awaiting Chief Warden final approval."
              : "Your outpass is awaiting approval. Gate scanning is locked until approved.",
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
            message: `Your outpass application was rejected: "${rejectedPass.warden_reason || 'Declined by hostel authority.'}".`,
          },
          { status: 403 }
        );
      }

      const returnedPass = passRows.find((r) => (r.status || "").toLowerCase() === "returned");
      if (returnedPass) {
        return NextResponse.json(
          {
            ok: false,
            code: "ALREADY_COMPLETED",
            message: "Your previous outpass has already been used for both exit and return and is now completed.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: "NO_ACTIONABLE_PASS",
          message: "No approved active outpass eligible for campus movement.",
        },
        { status: 404 }
      );
    }

    const currentStatus = (targetPass.status || "").toLowerCase();
    const expectedReturnTime = targetPass.expected_return_time ? new Date(targetPass.expected_return_time).getTime() : 0;
    const nowTime = Date.now();
    const isOverdue = expectedReturnTime > 0 && nowTime > expectedReturnTime;
    const overdueMinutes = isOverdue ? Math.round((nowTime - expectedReturnTime) / 60000) : 0;

    let permittedAction = null;
    let outEnabled = false;
    let inEnabled = false;

    // Movement evaluation:
    if (currentStatus === "approved" || currentStatus === "gate_pass_issued") {
      // First Scan: Pass approved, no recorded exit yet
      permittedAction = "OUT";
      outEnabled = true;
      inEnabled = false;
    } else if (currentStatus === "out" || currentStatus === "overdue") {
      // Second Scan: Pass exited, returning to campus
      // CRITICAL: Overdue status NEVER blocks return!
      permittedAction = "IN";
      outEnabled = false;
      inEnabled = true;
    } else if (currentStatus === "returned") {
      permittedAction = "COMPLETED";
      outEnabled = false;
      inEnabled = false;
    }

    return NextResponse.json({
      ok: true,
      data: {
        token: qrText,
        gate: {
          id: tokenCheck.gateId || "MAIN",
          name: "Main Campus Gate",
        },
        pass: {
          id: targetPass.id,
          passNumber: targetPass.pass_number,
          studentId: targetPass.student_id,
          studentName: targetPass.student_name || targetPass.student_full_name,
          department: targetPass.department || targetPass.student_dept,
          roomNumber: targetPass.room_number || targetPass.student_room,
          destination: targetPass.destination,
          reason: targetPass.reason,
          status: targetPass.status,
          departureTime: targetPass.departure_time,
          expectedReturnTime: targetPass.expected_return_time,
          actualExitTime: targetPass.actual_exit_time,
          actualReturnTime: targetPass.actual_return_time,
        },
        permittedAction,
        actions: {
          out: {
            enabled: outEnabled,
            label: "OUT - Leaving Campus",
          },
          in: {
            enabled: inEnabled,
            label: "IN - Returning to Campus",
          },
        },
        isOverdue,
        overdueMinutes,
        message:
          permittedAction === "OUT"
            ? "Approved outpass verified! Please confirm your campus exit."
            : permittedAction === "IN"
            ? isOverdue
              ? `Check-in available. Note: Return is overdue by ${overdueMinutes} minutes. Return is allowed.`
              : "Check-in available! Please confirm your campus return."
            : "Pass already completed.",
      },
    });
  } catch (err) {
    console.error("[API scan-intent] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process scan intent." },
      { status: 500 }
    );
  }
}
