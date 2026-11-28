import { NextResponse } from "next/server";
import { runRetentionCleanup } from "@/lib/services/retentionService.js";

export async function GET(request) {
  try {
    const result = await runRetentionCleanup();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API cron cleanup-outpasses] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to execute outpass retention cleanup." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const result = await runRetentionCleanup();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API cron cleanup-outpasses] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to execute outpass retention cleanup." },
      { status: 500 }
    );
  }
}
