import { query } from "../src/lib/db/mysql.js";

async function verify() {
  const tables = await query("SHOW TABLES");
  console.log("=== FINAL MYSQL DATABASE STATUS ===");
  for (const t of tables) {
    const name = Object.values(t)[0];
    const count = await query(`SELECT COUNT(*) as c FROM \`${name}\``);
    console.log(`Table: ${name.padEnd(20)} | Rows: ${count[0].c}`);
  }
  const hasRooms = tables.some((t) => Object.values(t)[0] === "rooms");
  console.log(`\n'rooms' table exists in MySQL: ${hasRooms ? "YES" : "NO (Successfully Dropped)"}`);
  process.exit(0);
}

verify();
