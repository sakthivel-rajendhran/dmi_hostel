import { NextResponse } from "next/server";
import { getRequestById, getHistoryForPass, getScansForPass, handleStudentCancel } from "@/lib/server/db.js";

export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const pass = getRequestById(id);

    if (!pass) {
      return NextResponse.json(
        { ok: false, message: "Outpass request not found." },
        { status: 404 }
      );
    }

    const history = getHistoryForPass(pass.id);
    const scans = getScansForPass(pass.id);

    const timeline = history.map((h) => {
      let title = "Status Update";
      if (h.action === "APPLIED") {
        title = pass.workflow_type === "COMMON" ? "Submitted (Awaiting Warden Clearance)" : "Submitted (Awaiting Staff Recommendation)";
      } else if (h.action === "STAFF_APPROVED") {
        title = "Staff Recommended";
      } else if (h.action === "STAFF_REJECTED") {
        title = "Staff Rejected";
      } else if (h.action === "WARDEN_APPROVED") {
        title = "Warden Approved (Gate Pass Issued)";
      } else if (h.action === "WARDEN_REJECTED") {
        title = "Warden Rejected";
      } else if (h.action === "CANCELLED") {
        title = "Cancelled by Resident";
      }

      return {
        title,
        status: h.action,
        timestamp: h.created_at,
        actor: `${h.actor_name} (${h.actor_role.toUpperCase()})`,
        description: h.remarks || "Workflow transition recorded.",
        note: h.remarks,
      };
    });

    for (const scan of scans) {
      timeline.push({
        title: scan.scan_type === "EXIT" ? "Campus Gate Exit Recorded" : "Campus Gate Return Recorded",
        status: scan.scan_type,
        timestamp: scan.scanned_at,
        actor: `Security Checkpoint (${scan.gate_name || "Main Gate"})`,
        description: `Verified at ${scan.gate_name || "Main Gate"} via ${scan.verification_method}.`,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...pass,
        history,
        scans,
        timeline,
      },
    });
  } catch (err) {
    console.error("[API getById] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  // Cancel action
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json();

    const result = handleStudentCancel(id, {
      studentId: body.studentId || body.student_id,
      remarks: body.remarks || body.reason,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API cancel] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to cancel outpass." },
      { status: 500 }
    );
  }
}
