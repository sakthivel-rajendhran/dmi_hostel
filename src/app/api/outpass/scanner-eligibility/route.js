import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || searchParams.get("student_id");
    const passId = searchParams.get("passId") || searchParams.get("pass_id");

    if (!studentId) {
      return NextResponse.json(
        { ok: false, message: "studentId is required." },
        { status: 400 }
      );
    }

    // 1. Query MySQL outpasses table directly
    const rows = await query(
      `SELECT o.*, s.name as student_name
       FROM outpasses o
       LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
       WHERE o.student_id = ? OR o.student_id = (SELECT id FROM users WHERE id = ? LIMIT 1)
       ORDER BY o.created_at DESC`,
      [studentId, studentId]
    );

      if (rows && rows.length > 0) {
        let targetPass = null;
        if (passId) {
          targetPass = rows.find((r) => r.id === passId || r.pass_number === passId);
        }
        if (!targetPass) {
          // Look for active actionable pass first (out, overdue, gate_pass_issued, approved, pending)
          const priorityOrder = ["out", "overdue", "gate_pass_issued", "approved", "pending", "rejected"];
          for (const status of priorityOrder) {
            const found = rows.find((r) => (r.status || "").toLowerCase() === status);
            if (found) {
              targetPass = found;
              break;
            }
          }
          if (!targetPass) targetPass = rows[0];
        }

        const rawStatus = (targetPass.status || "").toLowerCase();

        // Already exited (OUT or OVERDUE) -> Camera unlocked for ENTRY scan
        if (rawStatus === "out" || rawStatus === "overdue") {
          return NextResponse.json({
            ok: true,
            data: {
              state: "STATE_7_ALREADY_EXITED",
              stateCode: "EXIT_COMPLETED",
              canScan: true,
              canAccess: true,
              allowCamera: true,
              action: "ENTRY",
              color: "cyan",
              indicatorClass: "bg-cyan-50 text-cyan-800 border-cyan-400",
              hasGlow: false,
              message: rawStatus === "overdue" ? "Curfew Elapsed – Scan QR for Late Entry" : "Resident Outside Campus – Scan QR for Entry",
              pass: targetPass,
            },
          });
        }

        // Warden Approved or Gate Pass Issued -> Camera unlocked for EXIT scan
        if (rawStatus === "approved" || rawStatus === "gate_pass_issued") {
          return NextResponse.json({
            ok: true,
            data: {
              state: "STATE_4_WARDEN_APPROVED",
              stateCode: "WARDEN_APPROVED",
              canScan: true,
              canAccess: true,
              allowCamera: true,
              action: "EXIT",
              color: "emerald",
              indicatorClass: "bg-emerald-50 text-emerald-800 border-emerald-400",
              hasGlow: true,
              message: "Warden Approved – Scanner Available.",
              pass: targetPass,
            },
          });
        }

        // Pending approval
        if (rawStatus === "pending") {
          return NextResponse.json({
            ok: true,
            data: {
              state: "STATE_3_WAITING_WARDEN",
              stateCode: "WAITING_WARDEN",
              canScan: false,
              canAccess: false,
              allowCamera: false,
              color: "blue",
              indicatorClass: "bg-blue-50 text-blue-800 border-blue-300",
              hasGlow: false,
              message: "Waiting for Warden approval.",
              pass: targetPass,
            },
          });
        }

        // Rejected
        if (rawStatus === "rejected") {
          return NextResponse.json({
            ok: true,
            data: {
              state: "STATE_5_REJECTED",
              stateCode: "REJECTED",
              canScan: false,
              canAccess: false,
              allowCamera: false,
              color: "rose",
              indicatorClass: "bg-rose-50 text-rose-800 border-rose-300",
              hasGlow: false,
              message: `Application Rejected: "${targetPass.warden_reason || 'Application declined by hostel authority.'}"`,
              pass: targetPass,
            },
          });
        }

        // Expired, returned, or cancelled
        if (rawStatus === "returned" || rawStatus === "cancelled" || rawStatus === "expired") {
          return NextResponse.json({
            ok: true,
            data: {
              state: "STATE_6_EXPIRED_OR_CANCELLED",
              stateCode: "EXPIRED_OR_CANCELLED",
              canScan: false,
              canAccess: false,
              allowCamera: false,
              color: "slate",
              indicatorClass: "bg-slate-100 text-slate-500 border-slate-300",
              hasGlow: false,
              message: rawStatus === "returned" ? "Pass Completed – Already Returned" : "Pass Expired or Cancelled.",
              pass: targetPass,
            },
          });
        }
      }
    // If no passes exist for this student in MySQL, return authoritative NO_PASS state
    return NextResponse.json({
      ok: true,
      data: {
        state: "STATE_1_NO_PASS",
        stateCode: "NO_PASS",
        canScan: false,
        canAccess: false,
        allowCamera: false,
        color: "slate",
        indicatorClass: "bg-slate-400 text-slate-700 border-slate-300",
        hasGlow: false,
        message: "No Warden-approved pass available.",
        pass: null,
      },
    });
  } catch (err) {
    console.error("[API scanner-eligibility] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to determine scanner eligibility." },
      { status: 500 }
    );
  }
}
