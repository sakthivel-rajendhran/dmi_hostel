import { query } from "../src/lib/db/mysql.js";

async function run() {
  try {
    const cols = await query("DESCRIBE students;");
    const hasSection = cols.some((c) => c.Field === "section");
    if (!hasSection) {
      await query("ALTER TABLE students ADD COLUMN section VARCHAR(50) DEFAULT 'Section A' AFTER programme;");
      console.log("Successfully added 'section' column to students table in MySQL.");
    } else {
      console.log("'section' column already exists in students table.");
    }

    const hasPhone = cols.some((c) => c.Field === "phone");
    if (!hasPhone) {
      await query("ALTER TABLE students ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER batch;");
      console.log("Successfully added 'phone' column to students table in MySQL.");
    } else {
      console.log("'phone' column already exists in students table.");
    }
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

run();
