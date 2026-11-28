import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || searchParams.get("userId") || "";
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = searchParams.get("category") || "";

    const whereClauses = [];
    const params = [];

    if (studentId) {
      whereClauses.push("(user_id = ? OR user_id = 'all' OR user_id IS NULL OR user_id = '')");
      params.push(studentId);
    }

    if (unreadOnly) {
      whereClauses.push("is_read = 0");
    }

    if (category && category !== "all") {
      whereClauses.push("type = ?");
      params.push(category);
    }

    const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
    const sql = `
      SELECT id, user_id, title, message, type, is_read, pass_id, created_at
      FROM notifications
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const rows = await query(sql, params);

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      studentId: r.user_id,
      title: r.title,
      message: r.message,
      body: r.message,
      type: r.type || "info",
      category: r.type || "info",
      read: Boolean(r.is_read),
      passId: r.pass_id || null,
      date: r.created_at,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err) {
    console.error("[API notifications GET] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const id = body.id || `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = body.userId || body.studentId || "all";
    const title = body.title || "Notification";
    const message = body.message || body.body || "";
    const type = body.type || body.category || "info";
    const passId = body.passId || null;

    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, pass_id, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, NOW())`,
      [id, userId, title, message, type, passId]
    );

    return NextResponse.json({
      ok: true,
      data: {
        id,
        userId,
        studentId: userId,
        title,
        message,
        type,
        read: false,
        passId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[API notifications POST] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to create notification." },
      { status: 500 }
    );
  }
}
