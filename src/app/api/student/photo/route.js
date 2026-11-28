import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query } from "@/lib/db/mysql.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const studentId = formData.get("studentId");
    if (!studentId) {
      return NextResponse.json(
        { ok: false, message: "studentId is required." },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, message: "No image file provided." },
        { status: 400 }
      );
    }

    // Size validation
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          message: "Image size must be 5 MB or less. Please select another image.",
        },
        { status: 400 }
      );
    }

    // Format validation
    const mime = file.type || "image/jpeg";
    const ext = ALLOWED_MIMES[mime] || "jpg";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/profiles/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/profiles/${filename}`;

    // Persist photo URL in MySQL database
    try {
      await query("UPDATE students SET photo_url = ? WHERE student_id = ? OR id = ?", [publicUrl, studentId, studentId]);
      await query("UPDATE users SET avatar_url = ? WHERE id = ? OR id = (SELECT id FROM students WHERE student_id = ? LIMIT 1)", [publicUrl, studentId, studentId]);
    } catch (dbErr) {
      console.warn("Could not sync photo URL to MySQL users/students:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      filename,
      size: buffer.length,
      mime,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to upload photo." },
      { status: 500 }
    );
  }
}
