import { NextResponse } from "next/server";
import { createRequest } from "@/lib/server/db.js";

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.studentId && !body.student_id) {
      return NextResponse.json(
        { ok: false, message: "student_id is required." },
        { status: 400 }
      );
    }

    if (!body.destination) {
      return NextResponse.json(
        { ok: false, message: "destination is required." },
        { status: 400 }
      );
    }

    const created = createRequest(body);
    return NextResponse.json({
      ok: true,
      data: created,
      message: `${created.outpass_type} application submitted successfully!`,
    });
  } catch (err) {
    console.error("[API apply] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to submit outpass request." },
      { status: 500 }
    );
  }
}
