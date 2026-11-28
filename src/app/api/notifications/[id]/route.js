import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function PATCH(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    const body = await request.json().catch(() => ({}));

    if (id === "all" || body.all) {
      const studentId = body.studentId || body.userId;
      if (studentId) {
        await query(
          "UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = 'all'",
          [studentId]
        );
      } else {
        await query("UPDATE notifications SET is_read = 1");
      }
      return NextResponse.json({ ok: true, message: "All notifications marked as read." });
    }

    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
    return NextResponse.json({ ok: true, message: "Notification marked as read." });
  } catch (err) {
    console.error("[API notifications PATCH] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to update notification." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    await query("DELETE FROM notifications WHERE id = ?", [id]);
    return NextResponse.json({ ok: true, message: "Notification deleted." });
  } catch (err) {
    console.error("[API notifications DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to delete notification." },
      { status: 500 }
    );
  }
}
