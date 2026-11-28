import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * POST /api/auth/change-password
 * Permanent MySQL password update for first-time login or forced password resets
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword, confirmPassword } = body;
    const studentId = body.studentId || body.userId || request.headers.get("x-student-id") || request.headers.get("x-user-id");

    if (!studentId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_USER_ID", message: "User identification is required." },
        { status: 400 }
      );
    }

    const cleanId = String(studentId).trim();
    const cleanCurrent = String(currentPassword || "").trim();
    const cleanNew = String(newPassword || "").trim();
    const cleanConfirm = String(confirmPassword || "").trim();

    // 1. Validation
    if (!cleanCurrent) {
      return NextResponse.json(
        { ok: false, code: "CURRENT_REQUIRED", message: "Current temporary password is required." },
        { status: 400 }
      );
    }

    if (!cleanNew || cleanNew.length < 8) {
      return NextResponse.json(
        { ok: false, code: "INVALID_LENGTH", message: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (cleanConfirm && cleanNew !== cleanConfirm) {
      return NextResponse.json(
        { ok: false, code: "PASSWORD_MISMATCH", message: "New password and confirmation password do not match." },
        { status: 400 }
      );
    }

    const defaultPass = WORKFLOW_CONFIG.defaultPassword || "DmiCE@1202";
    if (cleanNew === defaultPass) {
      return NextResponse.json(
        { ok: false, code: "DEFAULT_PASSWORD_FORBIDDEN", message: "New password cannot be the college default temporary password." },
        { status: 400 }
      );
    }

    // 2. Fetch User from MySQL
    const users = await query(
      `SELECT u.id, u.email, u.password, u.role,
              COALESCE(u.account_status, s.account_status, 'PENDING_WARDEN') AS account_status,
              u.must_change_password
       FROM users u
       LEFT JOIN students s ON u.id = s.id OR u.id = s.student_id
       WHERE u.id = ? OR u.email = ?
       LIMIT 1`,
      [cleanId, cleanId]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { ok: false, code: "USER_NOT_FOUND", message: "User account not found." },
        { status: 404 }
      );
    }

    const user = users[0];

    // 3. Check Account Status (Prevent pending or rejected students from bypassing)
    const accStatus = (user.account_status || "").toUpperCase();
    if (user.role === "student" && accStatus !== "APPROVED") {
      return NextResponse.json(
        { ok: false, code: "ACCOUNT_NOT_APPROVED", message: "Registration is pending Warden approval. You cannot set a password until approved." },
        { status: 403 }
      );
    }

    // 4. Verify Current Password
    const isCurrentMatch = cleanCurrent === user.password || cleanCurrent === defaultPass;
    if (!isCurrentMatch) {
      return NextResponse.json(
        { ok: false, code: "INCORRECT_CURRENT_PASSWORD", message: "Current temporary password is incorrect." },
        { status: 401 }
      );
    }

    // 5. Update password in MySQL users table
    await query(
      `UPDATE users
       SET password = ?,
           must_change_password = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [cleanNew, user.id]
    );

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully. You can now access your dashboard.",
      user: {
        id: user.id,
        role: user.role,
        mustChangePassword: false,
      },
    });
  } catch (err) {
    console.error("Change Password API Error:", err);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
