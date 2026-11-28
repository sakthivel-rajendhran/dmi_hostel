import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * POST /api/auth/reset-password
 * Completes password reset using a valid, unexpired recovery token
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, newPassword, confirmPassword } = body;

    const cleanToken = String(token || "").trim();
    const cleanNew = String(newPassword || "").trim();
    const cleanConfirm = String(confirmPassword || "").trim();

    if (!cleanToken) {
      return NextResponse.json(
        { ok: false, code: "TOKEN_REQUIRED", message: "Recovery token is required." },
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
        { ok: false, code: "PASSWORD_MISMATCH", message: "New password and confirm password do not match." },
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

    // 1. Look up active token in MySQL password_resets
    const resets = await query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.is_used,
              u.role, COALESCE(u.account_status, 'APPROVED') AS account_status
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.recovery_token = ? AND pr.is_used = 0 AND pr.expires_at > NOW()
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [cleanToken]
    );

    if (!resets || resets.length === 0) {
      return NextResponse.json(
        { ok: false, code: "INVALID_OR_EXPIRED_TOKEN", message: "The password recovery token is invalid or has expired. Please request a new link." },
        { status: 400 }
      );
    }

    const resetRecord = resets[0];

    // Ensure account is approved
    if (resetRecord.role === "student" && resetRecord.account_status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "This student account is not approved by the Warden." },
        { status: 403 }
      );
    }

    // 2. Update user password in MySQL and clear must_change_password
    await query(
      `UPDATE users
       SET password = ?,
           must_change_password = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [cleanNew, resetRecord.user_id]
    );

    // 3. Invalidate reset token
    await query(
      `UPDATE password_resets
       SET is_used = 1
       WHERE id = ?`,
      [resetRecord.id]
    );

    return NextResponse.json({
      ok: true,
      message: "Password reset successful! You can now sign in with your new password.",
    });
  } catch (err) {
    console.error("Reset Password API error:", err);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
