import { NextResponse } from "next/server";
import { getAllRequests } from "@/lib/server/db.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || searchParams.get("student_id");
    const role = searchParams.get("role") || "";
    const department = searchParams.get("department") || searchParams.get("dept");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = (searchParams.get("search") || "").toLowerCase().trim();

    let list = getAllRequests();

    // 1. Role Scoping
    if (studentId && (role === "student" || !role)) {
      list = list.filter((r) => r.student_id === studentId);
    }

    // 2. Staff Queue Scoping: Staff reviews Home passes for their department
    if (role === "staff") {
      list = list.filter((r) => r.workflow_type === "HOME");
      if (department) {
        list = list.filter((r) => (r.department || "").toUpperCase() === department.toUpperCase());
      }
    }

    // 3. Status filter
    if (status && status !== "all") {
      list = list.filter((r) => {
        const s = r.overall_status.toLowerCase();
        const target = status.toLowerCase();
        if (target === "pending") {
          return s === "pending_staff" || s === "pending_warden" || s === "staff_approved";
        }
        if (target === "approved") {
          return s === "warden_approved" || s === "gate_pass_issued";
        }
        if (target === "rejected") {
          return s === "staff_rejected" || s === "warden_rejected";
        }
        return s === target;
      });
    }

    // 4. Type filter
    if (type && type !== "all") {
      list = list.filter((r) => (r.outpass_type || "").toLowerCase().includes(type.toLowerCase()));
    }

    // 5. Search query
    if (search) {
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(search) ||
          r.pass_number.toLowerCase().includes(search) ||
          r.student_name.toLowerCase().includes(search) ||
          r.student_id.toLowerCase().includes(search) ||
          r.destination.toLowerCase().includes(search) ||
          r.reason.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      ok: true,
      data: list,
      total: list.length,
    });
  } catch (err) {
    console.error("[API list] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to retrieve outpasses." },
      { status: 500 }
    );
  }
}
