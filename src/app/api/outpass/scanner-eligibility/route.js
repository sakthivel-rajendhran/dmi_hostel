import { NextResponse } from "next/server";
import { checkScannerEligibility } from "@/lib/server/db.js";

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

    const eligibility = checkScannerEligibility(studentId, passId);
    return NextResponse.json({
      ok: true,
      data: eligibility,
    });
  } catch (err) {
    console.error("[API scanner-eligibility] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to determine scanner eligibility." },
      { status: 500 }
    );
  }
}
