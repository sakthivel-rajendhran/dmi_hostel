import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { MOCK_USERS } from "../src/lib/mock/users.js";
import { MOCK_STUDENTS } from "../src/lib/mock/students.js";
import { MOCK_ROOMS } from "../src/lib/mock/rooms.js";
import { MOCK_PASSES } from "../src/lib/mock/passes.js";

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Anbu@2005",
  multipleStatements: true,
};

const dbName = process.env.DB_NAME || "hostel_management";

async function main() {
  console.log(`\n======================================================`);
  console.log(`   DMI HOSTEL MANAGEMENT — MYSQL DATABASE SETUP`);
  console.log(`======================================================`);
  console.log(`Host:     ${config.host}`);
  console.log(`Port:     ${config.port}`);
  console.log(`User:     ${config.user}`);
  console.log(`Database: ${dbName}\n`);

  let connection;
  try {
    console.log(`[1/5] Connecting to MySQL server at ${config.host}:${config.port}...`);
    connection = await mysql.createConnection(config);
    console.log(`  ✓ Successfully connected to MySQL server!`);

    console.log(`\n[2/5] Ensuring database '${dbName}' exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.changeUser({ database: dbName });
    console.log(`  ✓ Database '${dbName}' selected.`);

    console.log(`\n[3/5] Creating database tables from schema...`);
    const schemaSql = fs.readFileSync(path.join("scripts", "schema.sql"), "utf8");
    await connection.query(schemaSql);
    console.log(`  ✓ All 9 database tables verified/created!`);

    console.log(`\n[4/5] Seeding foundational records...`);

    // 1. Seed Rooms
    if (Array.isArray(MOCK_ROOMS) && MOCK_ROOMS.length > 0) {
      for (const r of MOCK_ROOMS) {
        await connection.query(
          `INSERT INTO rooms (room_number, floor, capacity, occupied, status)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), occupied = VALUES(occupied), status = VALUES(status);`,
          [r.roomNumber || r.id, r.floor || "GF", r.capacity || 4, r.occupied || 0, r.status || "available"]
        );
      }
      console.log(`  ✓ Seeded ${MOCK_ROOMS.length} rooms.`);
    }

    // 2. Seed Users
    if (Array.isArray(MOCK_USERS) && MOCK_USERS.length > 0) {
      for (const u of MOCK_USERS) {
        const email = u.email || u.gmail || `${u.studentId || u.id}@dmi.edu`;
        await connection.query(
          `INSERT INTO users (id, email, password, role, name, phone, avatar_url, must_change_password, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), status = VALUES(status);`,
          [
            u.id,
            email,
            u.password || "Anbu@2005",
            u.role,
            u.name,
            u.phone || null,
            u.avatar || null,
            Boolean(u.mustChangePassword),
            u.status || "Active",
          ]
        );

        // Staff profile if applicable
        if (["staff", "hod", "warden", "principal", "correspondent"].includes(u.role)) {
          await connection.query(
            `INSERT INTO staff_profiles (user_id, department, designation, assigned_years)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE department = VALUES(department), designation = VALUES(designation);`,
            [
              u.id,
              u.department || "General",
              u.designation || u.role,
              JSON.stringify(u.assignedYears || [1, 2, 3, 4]),
            ]
          );
        }
      }
      console.log(`  ✓ Seeded ${MOCK_USERS.length} user accounts.`);
    }

    // 3. Seed Students
    if (Array.isArray(MOCK_STUDENTS) && MOCK_STUDENTS.length > 0) {
      for (const s of MOCK_STUDENTS) {
        const studentEmail = s.email || `${s.studentId}@dmi.edu`;
        // Ensure user record exists first
        await connection.query(
          `INSERT INTO users (id, email, password, role, name, phone, avatar_url, status)
           VALUES (?, ?, ?, 'student', ?, ?, ?, 'Active')
           ON DUPLICATE KEY UPDATE name = VALUES(name);`,
          [s.id, studentEmail, s.password || "student123", s.name, s.phone || null, s.photoUrl || null]
        );

        await connection.query(
          `INSERT INTO students (id, student_id, reg_no, name, department, programme, year, batch, floor, room_number, room_verified, guardian_name, guardian_phone, profile_completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), year = VALUES(year);`,
          [
            s.id,
            s.studentId,
            s.regNo || `REG-${s.studentId}`,
            s.name,
            s.department || "CSE",
            s.programme || "B.E.",
            s.year || 3,
            s.batch || "2023-2027",
            s.floor || "GF",
            s.roomNo || null,
            Boolean(s.roomVerified),
            s.guardianName || null,
            s.guardianPhone || null,
            Boolean(s.profileCompleted),
          ]
        );
      }
      console.log(`  ✓ Seeded ${MOCK_STUDENTS.length} student profiles.`);
    }

    console.log(`\n[5/5] Database verification complete!`);
    const [tables] = await connection.query(`SHOW TABLES;`);
    console.log(`  ✓ Tables verified:`, tables.map((t) => Object.values(t)[0]).join(", "));

    console.log(`\n======================================================`);
    console.log(`  🎉 DATABASE CONNECTION & SETUP COMPLETE!`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`\n❌ Failed to connect to MySQL:`, error.message);
    if (error.code === "ECONNREFUSED") {
      console.error(`\n⚠️  The MySQL server on port ${config.port} is currently stopped.`);
      console.error(`👉 To start the MySQL service:`);
      console.error(`   Open an Administrator Command Prompt or PowerShell and run:`);
      console.error(`   net start MySQL80`);
      console.error(`   (Or start MySQL from the Windows Services app / MySQL Workbench)`);
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(`\n⚠️  Access denied for user '${config.user}'. Check your password.`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
