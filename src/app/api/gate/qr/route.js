import { NextResponse } from "next/server";
import { generateDynamicGateQr } from "@/lib/server/gateTokenEngine.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/gate/qr?gate=MAIN
 * Generates/Retrieves dynamic, cryptographically signed gate QR with high error correction
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gateId = (searchParams.get("gate") || "MAIN").toUpperCase();
    const rotate = searchParams.get("rotate") === "true";

    const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate" }];
    const gateConfig = gates.find((g) => g.id.toUpperCase() === gateId) || {
      id: gateId,
      name: `${gateId} Gate`,
    };

    const qrResult = await generateDynamicGateQr(gateId, rotate);

    return NextResponse.json({
      ok: true,
      data: {
        ...qrResult,
        gate: gateConfig,
      },
    });
  } catch (err) {
    console.error("[API /api/gate/qr] Generation error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to generate dynamic gate QR code." },
      { status: 500 }
    );
  }
}
