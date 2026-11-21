import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";
import { getImageDimensions } from "@/lib/utils/image-dimensions.js";

const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024; // 15 MB
const MIN_DIMENSION_PX = 200;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Extracts and verifies student identity from headers, cookies, or body
 */
async function authenticateRequest(request, requestedStudentId = null) {
  // 1. Check custom headers
  const headerStudentId = request.headers.get("x-student-id") || request.headers.get("x-user-id");
  const authHeader = request.headers.get("authorization") || "";

  let candidateId = headerStudentId;

  // Extract from Bearer token if present (e.g. mock-jwt-token-CSE-3-001-...)
  if (!candidateId && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const tokenMatch = token.match(/mock-jwt-(?:token-)?([A-Za-z0-9_-]+)-\d+/);
    if (tokenMatch && tokenMatch[1]) {
      candidateId = tokenMatch[1];
    }
  }

  // Fallback to requestedStudentId only if header/bearer not supplied
  if (!candidateId && requestedStudentId) {
    candidateId = requestedStudentId;
  }

  // Fallback to query param if provided
  if (!candidateId) {
    const { searchParams } = new URL(request.url);
    candidateId = searchParams.get("studentId");
  }

  if (!candidateId) {
    return { authenticated: false, error: "Authentication required" };
  }

  const cleanId = String(candidateId).trim();

  // If a specific student ID was requested and differs from authenticated user, reject unauthorized modification
  if (requestedStudentId && String(requestedStudentId).trim() !== cleanId) {
    return {
      authenticated: false,
      error: "Unauthorized: You cannot access or modify another student's photo",
    };
  }

  // Verify candidate exists in database
  try {
    const userRows = await query(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [cleanId]
    );

    const studentRows = await query(
      "SELECT id, student_id FROM students WHERE id = ? OR student_id = ? LIMIT 1",
      [cleanId, cleanId]
    );

    if ((!userRows || userRows.length === 0) && (!studentRows || studentRows.length === 0)) {
      // Allow valid formatted student ID during registration IF requested matches candidate
      const isRegistrationId = /^[A-Z]{2,5}-[1-4]-\d{3}$/i.test(cleanId);
      if (isRegistrationId && (!requestedStudentId || requestedStudentId === cleanId)) {
        return { authenticated: true, studentId: cleanId, isNew: true };
      }
      return { authenticated: false, error: "Invalid student account" };
    }

    const studentId = studentRows?.[0]?.student_id || studentRows?.[0]?.id || userRows?.[0]?.id || cleanId;
    return { authenticated: true, studentId, user: userRows?.[0] };
  } catch (err) {
    console.error("Auth verification error in photo route:", err);
    return { authenticated: false, error: "Database error during authentication" };
  }
}

/**
 * GET /api/student/profile/photo
 * Retrieves the stored binary photo from MySQL
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let studentId = searchParams.get("studentId");

    if (!studentId) {
      const auth = await authenticateRequest(request);
      if (auth.authenticated) {
        studentId = auth.studentId;
      }
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const cleanId = String(studentId).trim();
    const rows = await query(
      "SELECT photo_data, mime_type, file_size, updated_at FROM student_photos WHERE student_id = ? OR user_id = ? LIMIT 1",
      [cleanId, cleanId]
    );

    if (!rows || rows.length === 0 || !rows[0].photo_data) {
      // Return placeholder SVG if accept header includes image/ or requested by <img>
      const accept = request.headers.get("accept") || "";
      if (accept.includes("image") || searchParams.has("fallback")) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="#0f172a">
          <rect width="400" height="400" fill="#1e293b"/>
          <circle cx="200" cy="160" r="70" fill="#475569"/>
          <path d="M80 360 C80 260, 320 260, 320 360 Z" fill="#475569"/>
        </svg>`;
        return new NextResponse(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
          },
        });
      }

      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = rows[0];
    const mimeType = photo.mime_type || "image/jpeg";
    const buffer = Buffer.isBuffer(photo.photo_data)
      ? photo.photo_data
      : Buffer.from(photo.photo_data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "ETag": `"${cleanId}-${new Date(photo.updated_at).getTime()}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/student/profile/photo error:", err);
    return NextResponse.json({ error: "Internal server error fetching photo" }, { status: 500 });
  }
}

/**
 * POST /api/student/profile/photo
 * Uploads & compresses student photo permanently into MySQL MEDIUMBLOB
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer = null;
    let fileName = "photo.jpg";
    let mimeType = "image/jpeg";
    let targetStudentId = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") || formData.get("photo");
      targetStudentId = formData.get("studentId");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No image file provided in form-data" }, { status: 400 });
      }

      if (file.size > MAX_ORIGINAL_BYTES) {
        return NextResponse.json(
          { error: `File is too large (${Math.round(file.size / (1024 * 1024))} MB). Maximum original size is 15 MB.` },
          { status: 400 }
        );
      }

      fileName = file.name || "photo.jpg";
      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      targetStudentId = body.studentId;
      fileName = body.fileName || "photo.jpg";

      if (!body.photoDataUrl) {
        return NextResponse.json({ error: "photoDataUrl is required in JSON body" }, { status: 400 });
      }

      const rawUrl = typeof body.photoDataUrl === "string" ? body.photoDataUrl : (body.photoDataUrl?.dataUrl || "");
      const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
      }

      mimeType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data or application/json" },
        { status: 400 }
      );
    }

    // 1. Authenticate & Authorize Student
    const auth = await authenticateRequest(request, targetStudentId);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Authentication failed" }, { status: 401 });
    }

    const studentId = auth.studentId;

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid image format. Only JPG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // 3. Validate Dimensions & Format Headers
    const dimensions = getImageDimensions(buffer);
    if (!dimensions) {
      return NextResponse.json(
        { error: "Corrupted or unreadable image file. Please choose a valid photograph." },
        { status: 400 }
      );
    }

    if (dimensions.width < MIN_DIMENSION_PX || dimensions.height < MIN_DIMENSION_PX) {
      return NextResponse.json(
        {
          error: `Image dimensions (${dimensions.width}×${dimensions.height}) are below minimum requirement (${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX} px).`,
        },
        { status: 400 }
      );
    }

    // 4. Validate Final File Size (Up to 15 MB)
    if (buffer.length > MAX_ORIGINAL_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large (${Math.round(buffer.length / (1024 * 1024))} MB). Maximum upload size is 15 MB.`,
        },
        { status: 400 }
      );
    }

    // 5. Store permanently in MySQL
    await query(
      `INSERT INTO student_photos (student_id, user_id, photo_data, mime_type, file_name, file_size, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         photo_data = VALUES(photo_data),
         mime_type = VALUES(mime_type),
         file_name = VALUES(file_name),
         file_size = VALUES(file_size),
         width = VALUES(width),
         height = VALUES(height),
         updated_at = CURRENT_TIMESTAMP`,
      [
        studentId,
        studentId,
        buffer,
        mimeType,
        fileName,
        buffer.length,
        dimensions.width,
        dimensions.height,
      ]
    );

    // Update photo_url in students and users tables
    const photoUrl = `/api/student/profile/photo?studentId=${encodeURIComponent(studentId)}&v=${Date.now()}`;
    await query("UPDATE students SET photo_url = ? WHERE student_id = ? OR id = ?", [photoUrl, studentId, studentId]).catch(() => {});
    await query("UPDATE users SET avatar_url = ? WHERE id = ?", [photoUrl, studentId]).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Student photograph saved successfully to MySQL.",
      photoUrl,
      meta: {
        studentId,
        fileName,
        mimeType,
        fileSize: buffer.length,
        width: dimensions.width,
        height: dimensions.height,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("POST /api/student/profile/photo error:", err);
    return NextResponse.json({ error: err.message || "Failed to save photo" }, { status: 500 });
  }
}

/**
 * DELETE /api/student/profile/photo
 * Permanently deletes student photo from MySQL
 */
export async function DELETE(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: 401 });
    }

    const studentId = auth.studentId;

    await query("DELETE FROM student_photos WHERE student_id = ? OR user_id = ?", [studentId, studentId]);
    await query("UPDATE students SET photo_url = NULL WHERE student_id = ? OR id = ?", [studentId, studentId]).catch(() => {});
    await query("UPDATE users SET avatar_url = NULL WHERE id = ?", [studentId]).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Student photo deleted successfully from database.",
      studentId,
    });
  } catch (err) {
    console.error("DELETE /api/student/profile/photo error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete photo" }, { status: 500 });
  }
}
