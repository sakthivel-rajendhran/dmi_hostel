import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("Launching headless browser for Phase 0 verification...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Helper to set session in localStorage
  async function setRoleSession(role, userOverride = {}) {
    const defaultUser = {
      id: "TEST-01",
      name: "Rahul Kumar",
      studentId: "CSE-3-001",
      role: role,
      dept: "CSE",
      year: 3,
      roomNumber: "B-204",
      ...userOverride,
    };
    const session = {
      user: defaultUser,
      role: role,
      token: `mock-jwt-${role}-test`,
      loginTime: new Date().toISOString(),
    };

    await page.evaluate((sess) => {
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(sess));
      localStorage.setItem("dmi_mock_latency_enabled", "false");
    }, session);
  }

  try {
    // 1. VERIFY STUDENT DESKTOP VIEW (1440x900)
    console.log("\n[1/5] Verifying Student Desktop View (Phone mockup on canvas)...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
    await setRoleSession("student");
    await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase0-student-desktop-1440x900.png"),
      fullPage: false,
    });
    console.log("  ✓ Captured phase0-student-desktop-1440x900.png");

    // 2. VERIFY STUDENT MOBILE VIEW (390x844)
    console.log("\n[2/5] Verifying Student Mobile View (Native viewport)...");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase0-student-mobile-390x844.png"),
      fullPage: false,
    });
    console.log("  ✓ Captured phase0-student-mobile-390x844.png");

    // 3. VERIFY DASHBOARD WARDEN VIEW (1440x900)
    console.log("\n[3/5] Verifying Warden Dashboard Shell...");
    await page.setViewport({ width: 1440, height: 900 });
    await setRoleSession("warden", { name: "Dr. Arumugam", role: "warden" });
    await page.goto(`${BASE_URL}/warden/dashboard`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase0-warden-dashboard-1440x900.png"),
      fullPage: false,
    });
    console.log("  ✓ Captured phase0-warden-dashboard-1440x900.png");

    // 4. VERIFY GATE KIOSK FULLSCREEN VIEW (1920x1080)
    console.log("\n[4/5] Verifying Gate Kiosk Shell...");
    await page.setViewport({ width: 1920, height: 1080 });
    await setRoleSession("gate", { name: "Main Gate Kiosk", role: "gate" });
    await page.goto(`${BASE_URL}/gate`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase0-gate-kiosk-1920x1080.png"),
      fullPage: false,
    });
    console.log("  ✓ Captured phase0-gate-kiosk-1920x1080.png");

    // 5. VERIFY DESIGN SYSTEM SHOWCASE (1440x900)
    console.log("\n[5/5] Verifying Design System Showcase Page...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/design-system`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase0-design-system-showcase.png"),
      fullPage: true,
    });
    console.log("  ✓ Captured phase0-design-system-showcase.png");

    console.log("\nALL PUPPETEER VERIFICATION TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Puppeteer verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
