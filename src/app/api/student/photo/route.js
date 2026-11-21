import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
    const studentId = formData.get("studentId") || "CSE-3-001";

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
