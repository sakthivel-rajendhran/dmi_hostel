import { query } from "../src/lib/db/mysql.js";

async function executeRemoval() {
  console.log("=== REMOVING ALL DATA AND DROPPING ROOM TABLE ===");

  try {
    // 1. Disable Foreign Key Checks
    await query("SET FOREIGN_KEY_CHECKS = 0;");
    console.log("✓ Disabled FOREIGN_KEY_CHECKS");

    // 2. Drop Foreign Key constraint on students referencing rooms if exists
    try {
      const fks = await query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = 'hostel_management'
          AND TABLE_NAME = 'students'
          AND REFERENCED_TABLE_NAME = 'rooms'
      `);

      for (const fk of fks) {
        console.log(`Dropping FK constraint: ${fk.CONSTRAINT_NAME}`);
        await query(`ALTER TABLE students DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`);
      }
    } catch (fkErr) {
      console.warn("FK drop notice:", fkErr.message);
    }

    // 3. Drop 'rooms' table
    await query("DROP TABLE IF EXISTS rooms;");
    console.log("✓ Dropped table 'rooms' from MySQL database");

    // 4. Truncate all tables in database
    const tablesResult = await query("SHOW TABLES;");
    const tableNames = tablesResult.map((t) => Object.values(t)[0]);

    for (const table of tableNames) {
      if (table !== "rooms") {
        await query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`✓ Truncated table: ${table}`);
      }
    }

    // 5. Re-enable Foreign Key Checks
    await query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("✓ Re-enabled FOREIGN_KEY_CHECKS");

    // 6. Verify Table List
    console.log("\n=== VERIFYING REMAINING TABLES IN DATABASE ===");
    const remainingTables = await query("SHOW TABLES;");
    console.log("Current MySQL Tables:", remainingTables.map((t) => Object.values(t)[0]));

    // 7. Verify Row Counts (all must be 0)
    console.log("\n=== VERIFYING ROW COUNTS ACROSS ALL TABLES ===");
    for (const t of remainingTables) {
      const name = Object.values(t)[0];
      const countRes = await query(`SELECT COUNT(*) as count FROM \`${name}\`;`);
      console.log(`  - ${name}: ${countRes[0].count} rows`);
    }

    console.log("\n✓ ALL DATA IN DATABASE CLEARED AND ROOM TABLE SUCCESSFULLY REMOVED!");
    process.exit(0);
  } catch (err) {
    console.error("Error executing database cleanup:", err);
    process.exit(1);
  }
}

executeRemoval();
