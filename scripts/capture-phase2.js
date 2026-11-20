import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching browser for Phase 2 captures...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });

  // 1. Student Dashboard
  console.log("1. Student Dashboard...");
  await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-dashboard.png") });

  // 2. Student Passes Grid
  console.log("2. Student Passes...");
  await page.goto("http://localhost:3000/student/passes", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-passes.png") });

  // 3. Digital Pass QR Detail
  console.log("3. Digital Pass QR...");
  await page.goto("http://localhost:3000/student/passes/PASS-2026-001", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-pass-qr.png") });

  // 4. Student Notifications / Circulars
  console.log("4. Student Notifications...");
  await page.goto("http://localhost:3000/student/notifications", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-notifications.png") });

  // 5. Student Profile
  console.log("5. Student Profile...");
  await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-profile.png") });

  // 6. Admin Dashboard
  console.log("6. Admin Dashboard...");
  await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-dashboard.png") });

  // 7. Admin Passes Approvals
  console.log("7. Admin Passes...");
  await page.goto("http://localhost:3000/admin/passes", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-passes.png") });

  // 8. Admin Gate QR Scanner
  console.log("8. Admin Gate QR Scanner...");
  await page.goto("http://localhost:3000/admin/scan", { waitUntil: "networkidle0" });
  await delay(800);
  // Trigger a scan simulation
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const validBtn = btns.find((b) => b.textContent && b.textContent.includes("Scan Valid Pass"));
    if (validBtn) validBtn.click();
  });
  await delay(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-scan.png") });

  // 9. Admin Resident Students Directory
  console.log("9. Admin Students...");
  await page.goto("http://localhost:3000/admin/students", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-students.png") });

  // 10. Admin Room Matrix
  console.log("10. Admin Room Matrix...");
  await page.goto("http://localhost:3000/admin/rooms", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-rooms.png") });

  // 11. Admin Circulars Manager
  console.log("11. Admin Circulars...");
  await page.goto("http://localhost:3000/admin/notifications", { waitUntil: "networkidle0" });
  await delay(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-admin-notifications.png") });

  await browser.close();
  console.log("All Phase 2 screenshots captured successfully!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
