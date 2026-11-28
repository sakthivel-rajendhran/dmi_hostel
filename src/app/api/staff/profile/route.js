import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

/**
 * GET /api/staff/profile?userId=...
 * Retrieves authenticated Staff or HOD profile details directly from MySQL.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId =
      searchParams.get("userId") ||
      request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const cleanId = String(userId).trim();

    const rows = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.status,
        sp.department,
        sp.designation,
        sp.assigned_years
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = ? OR LOWER(u.email) = LOWER(?)
      LIMIT 1`,
      [cleanId, cleanId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "User record not found in MySQL." },
        { status: 404 }
      );
    }

    const u = rows[0];

    let parsedAssignedYears = [];
    if (u.assigned_years) {
      if (Array.isArray(u.assigned_years)) {
        parsedAssignedYears = u.assigned_years;
      } else if (typeof u.assigned_years === "string") {
        try {
          parsedAssignedYears = JSON.parse(u.assigned_years);
        } catch {
          parsedAssignedYears = [];
        }
      }
    }

    // Never return password, password_hash, or sensitive tokens
    return NextResponse.json({
      ok: true,
      data: {
        id: u.id,
        name: u.name,
        email: u.email || null,
        role: u.role,
        phone: u.phone || null,
        status: u.status || "active",
        department: u.department || "CSE",
        designation: u.designation || null,
        assignedYears: parsedAssignedYears,
      },
    });
  } catch (err) {
    console.error("GET /api/staff/profile error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profile details." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/staff/profile
 * Updates authenticated Staff or HOD profile details in MySQL.
 * Protected fields: id, role (read-only, cannot be updated).
 */
export async function PUT(request) {
  try {
    const userId = request.headers.get("x-user-id");
    const body = await request.json().catch(() => ({}));

    const targetId = String(body.userId || userId || "").trim();
    if (!targetId) {
      return NextResponse.json(
        { ok: false, message: "User ID is required to update profile." },
        { status: 400 }
      );
    }

    const { name, department, email, designation } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { ok: false, message: "Full Name is required (at least 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { ok: false, message: "A valid Email Address is required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDept = (department || "CSE").trim();
    const cleanDesignation = (designation || "").trim();

    // Verify user exists and retrieve current role
    const existingUsers = await query("SELECT id, role FROM users WHERE id = ? LIMIT 1", [targetId]);
    if (!existingUsers || existingUsers.length === 0) {
      return NextResponse.json(
        { ok: false, message: "User record not found in database." },
        { status: 404 }
      );
    }

    const currentRole = existingUsers[0].role;

    // Persist changes in MySQL: update users table
    await query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [cleanName, cleanEmail, targetId]
    );

    // Persist changes in MySQL: update staff_profiles table
    await query(
      `INSERT INTO staff_profiles (user_id, department, designation)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE department = VALUES(department), designation = VALUES(designation)`,
      [targetId, cleanDept, cleanDesignation]
    );

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully.",
      data: {
        id: targetId,
        name: cleanName,
        email: cleanEmail,
        department: cleanDept,
        designation: cleanDesignation,
        role: currentRole,
      },
    });
  } catch (err) {
    console.error("PUT /api/staff/profile error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
