import { NextResponse } from "next/server";
import { processGateScanVerification } from "@/lib/server/db.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const studentId = body.studentId || body.student_id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, message: "studentId is required for gate scan." },
        { status: 400 }
      );
    }

    const result = processGateScanVerification({
      studentId,
      qrText: body.qrText,
      manualCode: body.manualCode,
      location: body.location,
      source: body.source || "student_scan",
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API gate verify-scan] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Gate scan processing failed." },
      { status: 500 }
    );
  }
}
