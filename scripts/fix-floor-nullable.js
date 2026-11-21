import { query } from "../src/lib/db/mysql.js";

async function fixFloorNullable() {
  try {
    await query("ALTER TABLE students MODIFY COLUMN floor VARCHAR(20) NULL DEFAULT NULL;");
    console.log("Successfully made 'floor' column nullable with DEFAULT NULL.");

    await query("ALTER TABLE students MODIFY COLUMN room_number VARCHAR(20) NULL DEFAULT NULL;");
    console.log("Successfully made 'room_number' column nullable with DEFAULT NULL.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

fixFloorNullable();
