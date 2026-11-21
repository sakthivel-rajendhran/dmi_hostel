import mysql from "mysql2/promise";

const config = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "Anbu@2005",
  database: "hostel_management",
};

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    console.log("Running Student Allocation migration...");

    // 1. Add allocation_status column to students (backward-compatible)
    try {
      await conn.query(`
        ALTER TABLE students
        ADD COLUMN allocation_status ENUM(
          'waiting_for_warden',
          'accepted',
          'rejected'
        ) NOT NULL DEFAULT 'waiting_for_warden'
        AFTER profile_completed
      `);
      console.log("✓ Added allocation_status to students");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log("→ allocation_status already exists, skipping");
      } else throw e;
    }

    // 2. Create allocation_decisions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS allocation_decisions (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id    VARCHAR(64)  NOT NULL,
        warden_id     VARCHAR(64)  NOT NULL,
        decision      ENUM('accepted','rejected') NOT NULL,
        rejection_reason TEXT       NULL,
        decided_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_warden_id  (warden_id),
        INDEX idx_decided_at (decided_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✓ Created allocation_decisions table");

    // 3. Verify
    const [cols] = await conn.query("SHOW COLUMNS FROM students LIKE 'allocation_status'");
    const [tbl]  = await conn.query("SHOW TABLES LIKE 'allocation_decisions'");
    console.log("allocation_status column:", cols.length > 0 ? "✓ present" : "✗ missing");
    console.log("allocation_decisions table:", tbl.length > 0 ? "✓ present" : "✗ missing");

    console.log("\nMigration completed successfully.");
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
