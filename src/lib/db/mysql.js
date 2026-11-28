import mysql from "mysql2/promise";

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Sakthi@2004",
  database: process.env.DB_NAME || "hostel_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

/**
 * Execute a query with parameters using connection pool
 */
export async function query(sql, params = []) {
  const p = getPool();
  const [results] = await p.execute(sql, params);
  return results;
}

/**
 * Test database connectivity
 */
export async function testConnection() {
  try {
    const p = getPool();
    const [rows] = await p.query("SELECT 1 AS connected");
    return { ok: true, connected: rows[0]?.connected === 1 };
  } catch (error) {
    return {
      ok: false,
      code: error.code || "DB_CONNECTION_ERROR",
      message: error.message,
    };
  }
}

export default {
  getPool,
  query,
  testConnection,
};
