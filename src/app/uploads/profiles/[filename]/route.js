import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    if (!filename || filename.includes("..")) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "profiles", filename);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = filename.split(".").pop().toLowerCase();
    const contentType = MIME_MAP[ext] || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err) {
    return new NextResponse("Error reading file", { status: 500 });
  }
}
