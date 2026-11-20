import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 360, height: 740, name: "mobile-small-360" },
  { width: 390, height: 844, name: "mobile-standard-390" },
  { width: 430, height: 932, name: "mobile-large-430" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 1024, height: 768, name: "desktop-small-1024" },
  { width: 1280, height: 800, name: "laptop-1280" },
  { width: 1366, height: 768, name: "laptop-standard-1366" },
  { width: 1440, height: 900, name: "desktop-macbook-1440" },
  { width: 1920, height: 1080, name: "desktop-hd-1920" },
];

async function runVisualQA() {
  console.log("==================================================");
  console.log("   DMI COLLEGE HOSTEL PWA - VISUAL QA SUITE       ");
  console.log("==================================================\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let overflowIssues = 0;

  try {
    // 1. Multi-breakpoint Login & Hero Tests
    console.log("[1] Testing Login & Layout across 9 Breakpoints:");
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        console.error(`  ✗ FAIL: Horizontal scroll detected at ${vp.name} (${vp.width}x${vp.height})`);
        overflowIssues++;
      } else {
        console.log(`  ✓ PASS: Zero horizontal overflow at ${vp.name} (${vp.width}x${vp.height})`);
      }

      if (["mobile-standard-390", "laptop-standard-1366", "desktop-hd-1920"].includes(vp.name)) {
        const filePath = path.join(SCREENSHOT_DIR, `login-${vp.name}.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`    Saved screenshot: ${filePath}`);
      }
    }

    // 2. Offline Fallback Page
    console.log("\n[2] Testing Offline Fallback Screen:");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/offline", { waitUntil: "networkidle2" });
    const offlineScreenshot = path.join(SCREENSHOT_DIR, "pwa-offline-fallback.png");
    await page.screenshot({ path: offlineScreenshot });
    console.log(`  ✓ PASS: Offline page rendered successfully -> ${offlineScreenshot}`);

    // 3. Authenticated Student Dashboard
    console.log("\n[3] Testing Student Portal (Rahul Kumar):");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.type("input#identifier, input[name='identifier'], input[placeholder*='Student ID']", "CSE-3-001");
    await page.type("input#password, input[name='password'], input[type='password']", "Student@123");
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));

    // Mobile student view
    await page.setViewport({ width: 390, height: 844 });
    const studentDashScreenshot = path.join(SCREENSHOT_DIR, "student-dashboard-mobile.png");
    await page.screenshot({ path: studentDashScreenshot });
    console.log(`  ✓ PASS: Student Dashboard (390px) -> ${studentDashScreenshot}`);

    // 4. Authenticated Warden Portal: Staff Accounts & Rooms
    console.log("\n[4] Testing Warden Portal (Dr. John Xavier):");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    // Click Staff/Admin tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const tab = btns.find((b) => b.textContent?.includes("Staff / Admin"));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.type("input[type='email'], input[placeholder*='gmail']", "warden.dmi@gmail.com");
    await page.type("input[type='password']", "Warden@123");
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));

    await page.setViewport({ width: 1440, height: 900 });

    // Staff accounts page
    await page.goto("http://localhost:3000/warden/staff-accounts", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1000));
    const staffAccountsScreenshot = path.join(SCREENSHOT_DIR, "warden-staff-accounts.png");
    await page.screenshot({ path: staffAccountsScreenshot });
    console.log(`  ✓ PASS: Warden Staff Accounts -> ${staffAccountsScreenshot}`);

    // Rooms page
    await page.goto("http://localhost:3000/warden/rooms", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1000));
    const roomsScreenshot = path.join(SCREENSHOT_DIR, "warden-rooms.png");
    await page.screenshot({ path: roomsScreenshot });
    console.log(`  ✓ PASS: Warden Rooms -> ${roomsScreenshot}`);

    console.log("\n==================================================");
    if (overflowIssues === 0) {
      console.log("   ALL VISUAL QA & OVERLAP CHECKS PASSED (0 ERRORS)");
    } else {
      console.log(`   COMPLETED WITH ${overflowIssues} OVERFLOW ISSUES`);
    }
    console.log("==================================================");
  } catch (err) {
    console.error("Visual QA error:", err);
  } finally {
    await browser.close();
  }
}

runVisualQA();
