/**
 * CLI runner for Outpass 3-Month Data Retention
 * Usage: node scripts/retention-cleanup.js
 */

async function main() {
  console.log("Starting 3-month automated outpass retention cleanup...");
  try {
    const { runRetentionCleanup } = await import("../src/lib/services/retentionService.js");
    const result = await runRetentionCleanup();
    console.log("Cleanup result:", JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error("Fatal cleanup error:", err);
    process.exit(1);
  }
}

main();
