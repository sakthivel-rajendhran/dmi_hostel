import { query } from "../src/lib/db/mysql.js";

async function checkRole() {
  const cols = await query("SHOW COLUMNS FROM users;");
  const roleCol = cols.find((c) => c.Field === "role");
  console.log("role column:", roleCol);
  process.exit(0);
}

checkRole();
