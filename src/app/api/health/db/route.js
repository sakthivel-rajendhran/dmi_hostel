import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db/mysql.js";

export async function GET() {
  const status = await testConnection();
  if (status.ok) {
    return NextResponse.json({
      status: "connected",
      database: process.env.DB_NAME || "hostel_management",
      host: process.env.DB_HOST || "127.0.0.1",
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    {
      status: "disconnected",
      code: status.code,
      message: status.message,
      help: "Ensure MySQL service 'MySQL80' is running locally on port 3306.",
    },
    { status: 503 }
  );
}
