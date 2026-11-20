/**
 * Visual QA Verification Script for Gate QR Flow
 * Uses Puppeteer to load and capture screenshots of:
 * 1. /student/scan (Scanner interface & permission states)
 * 2. /student/scan (Manual fallback modal)
 * 3. /student/scan (EXIT Success screen with live ticking clock)
 * 4. /student/scan (ENTRY Late Success screen)
 * 5. /student/scan (Denied screen)
 * 6. /warden/gate-qr (Warden poster management & printable layout)
 * 7. /gate (Gate QR Display mode on tablet viewport)
 * 8. /student/dashboard (Contextual scan button)
 * 9. /student/passes/[id] (Gate Pass card)
 */

const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== STARTING GATE QR VISUAL QA VERIFICATION ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Helper to set session in localStorage before loading app
  async function setStudentSession(studentId = "CSE-3-001", role = "student") {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ sId, r }) => {
        const session = {
          user: {
            id: sId,
            studentId: sId,
            name: "Rahul Kumar",
            role: r,
            dept: "CSE",
            year: 3,
            roomNumber: "B-204",
          },
          role: r,
          token: "mock-token-qa",
        };
        localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
      },
      { sId: studentId, r: role }
    );
  }

  async function setWardenSession() {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const session = {
        user: {
          id: "WARDEN-001",
          email: "warden@dmi.edu",
          name: "Dr. K. Arumugam",
          role: "warden",
        },
        role: "warden",
        token: "mock-warden-qa",
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
    });
  }

  // Mobile Viewport (iPhone 14 / standard 390x844)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // 1. Student Dashboard with Contextual Scan Button
  console.log("1. Capturing Student Dashboard...");
  await setStudentSession("CSE-3-001");
  await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-1-student-dashboard-mobile.png"),
    fullPage: false,
  });

  // 2. Student Scan Page (Camera Permission Prompt & Raised Button)
  console.log("2. Capturing Student Scan Page (Prompt)...");
  await page.goto(`${BASE_URL}/student/scan`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-2-scanner-initial-mobile.png"),
    fullPage: false,
  });

  // 3. Manual Fallback Modal
  console.log("3. Capturing Manual Code Fallback Modal...");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Enter 6-character") || b.textContent.includes("Enter gate code")
    );
    if (btn) btn.click();
  });
  await sleep(800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-3-manual-fallback-modal.png"),
    fullPage: false,
  });

  // Close modal
  await page.keyboard.press("Escape");
  await sleep(400);

  // 4. Trigger Dev Simulation: EXIT Success
  console.log("4. Capturing EXIT Success Screen (with Live Clock)...");
  await page.evaluate(() => {
    const details = document.querySelector("details");
    if (details) details.open = true;
  });
  await sleep(400);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Simulate EXIT")
    );
    if (btn) btn.click();
  });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-4-exit-success-ticking-clock.png"),
    fullPage: false,
  });

  // 5. Trigger Dev Simulation: ENTRY Success (Late)
  console.log("5. Capturing ENTRY Late Success Screen...");
  await page.goto(`${BASE_URL}/student/scan`, { waitUntil: "domcontentloaded" });
  await sleep(1000);
  await page.evaluate(() => {
    const details = document.querySelector("details");
    if (details) details.open = true;
  });
  await sleep(400);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Simulate ENTRY")
    );
    if (btn) btn.click();
  });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-5-entry-late-screen.png"),
    fullPage: false,
  });

  // 6. Trigger Dev Simulation: Geofence Denied
  console.log("6. Capturing Denied (Geofence) Screen...");
  await page.goto(`${BASE_URL}/student/scan`, { waitUntil: "domcontentloaded" });
  await sleep(1000);
  await page.evaluate(() => {
    const details = document.querySelector("details");
    if (details) details.open = true;
  });
  await sleep(400);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Simulate Far Away")
    );
    if (btn) btn.click();
  });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-6-geofence-denied-screen.png"),
    fullPage: false,
  });

  // 7. Student Pass Detail Gate Pass Card
  console.log("7. Capturing Pass Details Gate Pass Card...");
  await page.goto(`${BASE_URL}/student/passes/DMI-PASS-2026-0004`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-7-pass-detail-gate-card.png"),
    fullPage: false,
  });

  // 8. Warden Gate QR Poster Management Page (Desktop 1440x900)
  console.log("8. Capturing Warden Gate QR Poster Page (Desktop)...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await setWardenSession();
  await page.goto(`${BASE_URL}/warden/gate-qr`, { waitUntil: "domcontentloaded" });
  await sleep(1800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-8-warden-poster-desktop.png"),
    fullPage: false,
  });

  // 9. Gate QR Display Mode (/gate) on Tablet Viewport (1024x768 landscape)
  console.log("9. Capturing Gate QR Display Mode (/gate)...");
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/gate?gate=MAIN`, { waitUntil: "domcontentloaded" });
  await sleep(1800);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "gateqr-9-kiosk-display-mode-tablet.png"),
    fullPage: false,
  });

  console.log("=== ALL GATE QR SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  await browser.close();
}

main().catch((err) => {
  console.error("Visual QA script failed:", err);
  process.exit(1);
});
