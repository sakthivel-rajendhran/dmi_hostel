import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "").trim().toUpperCase();
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Aggregated query: one unique row per gatepass with both Exit and Entry timestamps
    const sql = `
      SELECT
        o.id AS pass_id,
        o.pass_number,
        o.student_id,
        COALESCE(s.name, o.student_name, 'Student') AS student_name,
        COALESCE(s.reg_no, '') AS reg_no,
        COALESCE(s.department, o.department, 'CSE') AS department,
        COALESCE(s.year, o.year, 1) AS year,
        COALESCE(s.room_number, o.room_number, '—') AS room_number,
        COALESCE(gms.gate_station, sec.gate_station, 'Main Campus Gate') AS gate_station,
        COALESCE(gms.gate_id, sec.gate_id, 'MAIN') AS gate_id,
        COALESCE(gms.exit_at, sec.exit_time, o.actual_exit_time) AS exit_time,
        COALESCE(gms.entry_at, sec.entry_time, o.actual_return_time) AS entry_time,
        o.status AS pass_status,
        COALESCE(sec.is_late, o.is_late, 0) AS is_late,
        COALESCE(sec.late_minutes, o.late_minutes, 0) AS late_minutes,
        COALESCE(sec.notes, '') AS notes,
        COALESCE(gms.updated_at, sec.last_timestamp, o.updated_at, o.created_at) AS last_timestamp
      FROM outpasses o
      LEFT JOIN students s ON s.id = o.student_id OR s.student_id = o.student_id
      LEFT JOIN gate_movement_summaries gms ON gms.pass_id = o.id OR gms.pass_id = o.pass_number
      LEFT JOIN (
        SELECT
          pass_id,
          MIN(CASE WHEN action = 'EXIT' THEN timestamp END) AS exit_time,
          MAX(CASE WHEN action = 'ENTRY' THEN timestamp END) AS entry_time,
          SUBSTRING_INDEX(GROUP_CONCAT(gate_id ORDER BY timestamp DESC SEPARATOR ','), ',', 1) AS gate_id,
          CASE 
            WHEN SUBSTRING_INDEX(GROUP_CONCAT(gate_id ORDER BY timestamp DESC SEPARATOR ','), ',', 1) = 'MAIN' 
            THEN 'Main Campus Gate' 
            ELSE SUBSTRING_INDEX(GROUP_CONCAT(gate_id ORDER BY timestamp DESC SEPARATOR ','), ',', 1)
          END AS gate_station,
          MAX(is_late) AS is_late,
          MAX(late_minutes) AS late_minutes,
          SUBSTRING_INDEX(GROUP_CONCAT(notes ORDER BY timestamp DESC SEPARATOR ' | '), ' | ', 1) AS notes,
          MAX(timestamp) AS last_timestamp
        FROM security_logs
        GROUP BY pass_id
      ) sec ON sec.pass_id = o.id OR sec.pass_id = o.pass_number
      WHERE (
        gms.pass_id IS NOT NULL
        OR sec.pass_id IS NOT NULL 
        OR o.actual_exit_time IS NOT NULL 
        OR o.actual_return_time IS NOT NULL 
        OR o.status IN ('out', 'overdue', 'returned')
      )
      ORDER BY last_timestamp DESC
    `;

    let rows = await query(sql);

    let data = rows.map((r) => {
      let movementStatus = "NOT EXITED";
      if (r.exit_time && r.entry_time) {
        movementStatus = "RETURNED";
      } else if (r.exit_time && !r.entry_time) {
        movementStatus = "OUTSIDE CAMPUS";
      } else if (r.pass_status === "out" || r.pass_status === "overdue") {
        movementStatus = "OUTSIDE CAMPUS";
      } else if (r.pass_status === "returned") {
        movementStatus = "RETURNED";
      }

      return {
        id: r.pass_id,
        passId: r.pass_id,
        passNumber: r.pass_number || r.pass_id,
        studentId: r.student_id,
        studentName: r.student_name,
        regNo: r.reg_no,
        department: r.department,
        year: r.year,
        roomNo: r.room_number,
        gate: r.gate_station || "Main Campus Gate",
        gateStation: r.gate_station || "Main Campus Gate",
        gateId: r.gate_id || "MAIN",
        exitTime: r.exit_time,
        entryTime: r.entry_time,
        timestamp: r.entry_time || r.exit_time || r.last_timestamp,
        status: movementStatus,
        movementStatus,
        movementType: r.entry_time ? "ENTRY" : (r.exit_time ? "EXIT" : "NONE"),
        isLate: Boolean(r.is_late),
        lateMinutes: r.late_minutes || 0,
        notes: r.notes || "",
      };
    });

    // Type filter
    if (type && type !== "ALL") {
      if (type === "EXIT") {
        data = data.filter((item) => Boolean(item.exitTime));
      } else if (type === "ENTRY") {
        data = data.filter((item) => Boolean(item.entryTime));
      }
    }

    // Search filter
    if (search) {
      data = data.filter((item) =>
        (item.studentName || "").toLowerCase().includes(search) ||
        (item.studentId || "").toLowerCase().includes(search) ||
        (item.regNo || "").toLowerCase().includes(search) ||
        (item.passId || "").toLowerCase().includes(search) ||
        (item.passNumber || "").toLowerCase().includes(search) ||
        (item.gateStation || "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (err) {
    console.error("[API security-logs] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to retrieve security logs." },
      { status: 500 }
    );
  }
}
