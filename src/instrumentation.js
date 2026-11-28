/**
 * Next.js Server Instrumentation
 * Runs server-side initialization tasks when the Next.js process starts.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Initializing server-side background tasks...");

    // Schedule 3-month automated outpass retention cleanup
    // Grace period of 15s after startup, then every 24 hours
    setTimeout(async () => {
      try {
        const { runRetentionCleanup } = await import("@/lib/services/retentionService.js");
        const res = await runRetentionCleanup();
        console.log("[Instrumentation] Initial outpass retention check completed:", res);
      } catch (err) {
        console.warn("[Instrumentation] Initial retention check error:", err?.message);
      }
    }, 15000);

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const { runRetentionCleanup } = await import("@/lib/services/retentionService.js");
        const res = await runRetentionCleanup();
        console.log("[Instrumentation] Scheduled daily outpass retention completed:", res);
      } catch (err) {
        console.warn("[Instrumentation] Scheduled retention error:", err?.message);
      }
    }, TWENTY_FOUR_HOURS);
  }
}
