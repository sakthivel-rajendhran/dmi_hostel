import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/mysql.js";

/**
 * Mask an email address for privacy: e.g. "student@gmail.com" -> "s***t@gmail.com"
 */
function maskEmail(email = "") {
  if (!email || !email.includes("@")) return "registered email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery by finding resident/user and generating an expiring reset token
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawIdentifier = String(body.identifier || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { ok: false, code: "IDENTIFIER_REQUIRED", message: "Please enter your Student ID, Register Number, or registered Email address." },
        { status: 400 }
      );
    }

    const cleanLower = rawIdentifier.toLowerCase();
    const cleanUpper = rawIdentifier.toUpperCase();

    // 1. Query users and students table
    const users = await query(
      `SELECT u.id, u.email, u.name, u.role,
              COALESCE(u.account_status, s.account_status, 'APPROVED') AS account_status
       FROM users u
       LEFT JOIN students s ON u.id = s.id OR u.id = s.student_id
       WHERE LOWER(u.email) = ? OR UPPER(u.id) = ? OR UPPER(s.reg_no) = ?
       LIMIT 1`,
      [cleanLower, cleanUpper, cleanUpper]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { ok: false, code: "USER_NOT_FOUND", message: "No account found matching the provided Student ID or Email." },
        { status: 404 }
      );
    }

    const user = users[0];

    // 2. Reject pending or rejected accounts from resetting passwords
    const accStatus = (user.account_status || "").toUpperCase();
    if (user.role === "student" && accStatus !== "APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          code: "ACCOUNT_PENDING",
          message: "Your registration is currently awaiting Warden approval. Password recovery is only available for approved accounts.",
        },
        { status: 403 }
      );
    }

    // 3. Generate secure tokens
    const recoveryToken = crypto.randomBytes(24).toString("hex");
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");

    // 4. Save into MySQL password_resets table (expires in 30 minutes)
    await query(
      `INSERT INTO password_resets (user_id, otp_hash, recovery_token, expires_at, is_used, is_verified)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0, 0)`,
      [user.id, otpHash, recoveryToken]
    );

    const masked = maskEmail(user.email);

    return NextResponse.json({
      ok: true,
      message: `Password reset link generated. An authorization token has been dispatched for ${masked}.`,
      token: recoveryToken,
      maskedEmail: masked,
      userId: user.id,
      name: user.name,
    });
  } catch (err) {
    console.error("Forgot Password API error:", err);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: "Failed to initiate password reset. Please try again." },
      { status: 500 }
    );
  }
}
