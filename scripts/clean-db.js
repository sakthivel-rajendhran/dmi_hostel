import mysql from "mysql2/promise";

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Anbu@2005",
  database: process.env.DB_NAME || "hostel_management",
};

async function cleanDatabase() {
  console.log(`Connecting to ${config.database} on ${config.host}:${config.port}...`);
  const conn = await mysql.createConnection(config);

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0;");
    const [tables] = await conn.query("SHOW TABLES;");

    for (const t of tables) {
      const tableName = Object.values(t)[0];
      await conn.query(`TRUNCATE TABLE \`${tableName}\`;`);
      console.log(`✓ Truncated table: ${tableName}`);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("\nAll table data has been successfully removed!");

    // Verification: count rows in each table
    console.log("\nVerifying row counts:");
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [result] = await conn.query(`SELECT COUNT(*) AS count FROM \`${tableName}\`;`);
      console.log(`  - ${tableName}: ${result[0].count} rows`);
    }
  } catch (error) {
    console.error("Failed to clean database:", error);
  } finally {
    await conn.end();
  }
}

cleanDatabase();
