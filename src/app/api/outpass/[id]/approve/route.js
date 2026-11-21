import { NextResponse } from "next/server";
import { handleStaffDecision, handleWardenDecision } from "@/lib/server/db.js";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json();

    const role = (body.role || body.actorRole || "").toLowerCase();
    const actorUserId = body.actorUserId || body.userId || "staff_or_warden";
    const actorName = body.actorName || body.name || "Hostel Authority";
    const remarks = body.remarks || body.note || "";

    if (role === "staff") {
      const result = handleStaffDecision(id, {
        actorUserId,
        actorName,
        verdict: "APPROVE",
        remarks,
      });

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    } else if (role === "warden" || role === "admin") {
      const result = handleWardenDecision(id, {
        actorUserId,
        actorName,
        verdict: "APPROVE",
        remarks,
      });

      if (!result.ok) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "Unauthorized: only Staff or Chief Warden can approve passes.",
        },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[API approve] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process approval." },
      { status: 500 }
    );
  }
}
