import { query } from "../src/lib/db/mysql.js";

async function run() {
  await query("ALTER TABLE students MODIFY COLUMN batch VARCHAR(50) NULL DEFAULT NULL;");
  await query("ALTER TABLE students MODIFY COLUMN programme VARCHAR(50) NULL DEFAULT NULL;");
  await query("ALTER TABLE students MODIFY COLUMN section VARCHAR(50) NULL DEFAULT NULL;");
  console.log("✓ Made batch, programme, and section nullable in MySQL students table.");
  process.exit(0);
}

run();
