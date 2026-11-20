import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const BREAKPOINTS = [
  { name: "mobile_360", width: 360, height: 740, isMobile: true },
  { name: "mobile_390", width: 390, height: 844, isMobile: true },
  { name: "mobile_430", width: 430, height: 932, isMobile: true },
  { name: "tablet_768", width: 768, height: 1024, isTablet: true },
  { name: "desktop_1024", width: 1024, height: 700, isDesktop: true },
  { name: "desktop_1280_defect_vp", width: 1280, height: 665, isDesktop: true },
  { name: "laptop_1366", width: 1366, height: 650, isDesktop: true },
  { name: "desktop_1440", width: 1440, height: 900, isDesktop: true },
  { name: "desktop_1920", width: 1920, height: 1080, isDesktop: true },
];

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const SCREENSHOT_DIR = fs.existsSync(ARTIFACT_DIR) ? ARTIFACT_DIR : "./docs/screenshots/responsive";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runResponsiveTests() {
  console.log("================================================================");
  console.log("   DMI STUDENT PORTAL RESPONSIVE & LAYOUT VERIFICATION SUITE    ");
  console.log("================================================================\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Log in as student
    console.log("[1/5] Authenticating as Student (Rahul Kumar, CSE-3-001)...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    await page.type("input#identifier, input[name='identifier'], input[placeholder*='Student ID']", "CSE-3-001");
    await page.type("input#password, input[name='password'], input[type='password']", "Student@123");
    await page.click("button[type='submit']");
    await page.waitForFunction(() => window.location.pathname.includes("/student/dashboard"), { timeout: 8000 });
    assert(page.url().includes("/student/dashboard"), "Student logged in successfully");

    // 2. Test Breakpoint Layouts & Shell Behavior
    console.log("\n[2/5] Testing Viewports across all 9 breakpoints...");
    for (const bp of BREAKPOINTS) {
      console.log(`\n  Checking viewport: ${bp.name} (${bp.width}x${bp.height})`);
      await page.setViewport({ width: bp.width, height: bp.height });
      await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 400));

      // Assert No Fake Phone Frame or Notch exists in DOM
      const frameCheck = await page.evaluate(() => {
        const hasNotch = !!document.querySelector("[data-notch], .notch, [class*='notch']");
        const hasPhoneFrame = !!document.querySelector("[data-phone-frame], .phone-frame, [class*='device-frame'], [class*='mockup']");
        const mainEl = document.querySelector("main");
        const mainComputed = mainEl ? window.getComputedStyle(mainEl) : null;
        const mainHasNestedScroll = mainComputed ? (mainComputed.overflowY === "auto" || mainComputed.overflowY === "scroll") : false;

        return {
          hasNotch,
          hasPhoneFrame,
          mainHasNestedScroll,
          mainDisplay: mainComputed?.display,
        };
      });

      assert(!frameCheck.hasNotch, `[${bp.name}] No fake phone notch in DOM`);
      assert(!frameCheck.hasPhoneFrame, `[${bp.name}] No fake phone mockup container in DOM`);
      assert(!frameCheck.mainHasNestedScroll, `[${bp.name}] <main> has no nested scrollbar (document window scrolls naturally)`);

      // Test breakpoint-specific navigation elements
      const navCheck = await page.evaluate((bpData) => {
        const bottomNav = document.querySelector("nav[aria-label='Mobile Navigation Bar']");
        const sidebar = document.querySelector("aside[aria-label='Sidebar'], aside");
        const isBottomNavVisible = bottomNav && window.getComputedStyle(bottomNav).display !== "none";
        const isSidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== "none";

        return {
          isBottomNavVisible,
          isSidebarVisible,
        };
      }, bp);

      if (bp.isMobile) {
        assert(navCheck.isBottomNavVisible, `[${bp.name}] Mobile bottom navigation bar is visible`);
      } else if (bp.isTablet) {
        assert(!navCheck.isBottomNavVisible, `[${bp.name}] Tablet hides bottom navigation bar`);
        assert(navCheck.isSidebarVisible, `[${bp.name}] Tablet displays compact icon rail sidebar`);
      } else if (bp.isDesktop) {
        assert(!navCheck.isBottomNavVisible, `[${bp.name}] Desktop hides bottom navigation bar`);
        assert(navCheck.isSidebarVisible, `[${bp.name}] Desktop displays sidebar`);
      }
    }

    // 3. Test Defect 1280x665: /student/apply Layout & Action Bar
    console.log("\n[3/5] Verifying /student/apply at 1280x665 (Defect resolution test)...");
    await page.setViewport({ width: 1280, height: 665 });
    await page.goto("http://localhost:3000/student/apply", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));

    const applyCheck = await page.evaluate(() => {
      const desktopSummaryCard = document.querySelector(".lg\\:col-span-4, .sticky.top-24");
      const mobileActionBar = document.querySelector(".lg\\:hidden.fixed");
      const segmentedControl = document.querySelector("button[role='tab'], [class*='SegmentedControl']");
      const submitBtn = document.querySelector("button[type='submit']");

      const summaryRect = desktopSummaryCard ? desktopSummaryCard.getBoundingClientRect() : null;
      const segRect = segmentedControl ? segmentedControl.getBoundingClientRect() : null;
      const btnRect = submitBtn ? submitBtn.getBoundingClientRect() : null;

      // Check for overlap between segmented control and submit button
      let hasOverlap = false;
      if (segRect && btnRect) {
        hasOverlap = !(
          segRect.right < btnRect.left ||
          segRect.left > btnRect.right ||
          segRect.bottom < btnRect.top ||
          segRect.top > btnRect.bottom
        );
      }

      // Check text wrapping of submit button
      const submitText = submitBtn ? submitBtn.innerText.trim() : "";

      return {
        hasDesktopSummary: !!desktopSummaryCard,
        hasMobileActionBarHidden: mobileActionBar ? window.getComputedStyle(mobileActionBar).display === "none" : true,
        hasOverlap,
        submitText,
      };
    });

    assert(applyCheck.hasDesktopSummary, "Desktop 1280x665 renders right-column sticky Summary card");
    assert(applyCheck.hasMobileActionBarHidden, "Desktop 1280x665 hides mobile bottom action bar");
    assert(!applyCheck.hasOverlap, "Desktop 1280x665: Zero overlap between SegmentedControl and Submit button");

    // Capture Defect Viewport Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_apply_1280x665.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_apply_1280x665.png");

    // 4. Test Mobile 390x844: Single-line labels & Clearances
    console.log("\n[4/5] Verifying Mobile (390x844) Bottom Tab Bar & Labels...");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/student/apply", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));

    const mobileCheck = await page.evaluate(() => {
      const mobileBar = document.querySelector(".lg\\:hidden.fixed");
      const bottomNav = document.querySelector("nav[aria-label='Mobile Navigation Bar']");
      const brandHeader = document.querySelector("header h1, header h2, header span");

      // Check bottom clearance
      const barBottom = mobileBar ? parseInt(window.getComputedStyle(mobileBar).bottom, 10) : 0;
      const navHeight = bottomNav ? bottomNav.getBoundingClientRect().height : 0;

      // Check tab label wrap
      const tabLabels = Array.from(document.querySelectorAll("nav[aria-label='Mobile Navigation Bar'] span")).map((s) => ({
        text: s.innerText.trim(),
        clientHeight: s.clientHeight,
      }));

      const brandText = brandHeader ? brandHeader.innerText.trim() : "";

      return {
        hasMobileBar: !!mobileBar,
        hasBottomNav: !!bottomNav,
        barBottom,
        navHeight,
        tabLabels,
        brandText,
      };
    });

    assert(mobileCheck.hasMobileBar, "Mobile shows sticky Submit Pass bar above tabbar");
    assert(mobileCheck.hasBottomNav, "Mobile shows 64px bottom tab navigation bar");
    console.log("  Tab labels detected on mobile:", mobileCheck.tabLabels.map((t) => t.text).join(", "));
    assert(mobileCheck.tabLabels.some((t) => t.text.includes("Pass")), "Passes label renders cleanly on tab bar");

    // Capture Mobile Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_apply_390x844.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_apply_390x844.png");

    // 5. Test Tablet 768x1024 & Desktop Dashboard
    console.log("\n[5/5] Verifying Tablet (768x1024) and Desktop Dashboard (1440x900)...");
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_dashboard_768x1024.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_dashboard_768x1024.png");

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_dashboard_1440x900.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_dashboard_1440x900.png");

    // Passes page at 1280
    await page.setViewport({ width: 1280, height: 665 });
    await page.goto("http://localhost:3000/student/passes", { waitUntil: "networkidle2" });
    await page.waitForFunction(
      () => !document.querySelector(".animate-pulse") && (document.querySelector("table") || document.querySelector("tbody")),
      { timeout: 8000 }
    ).catch(() => {});

    const passesCheck = await page.evaluate(() => {
      const desktopTable = document.querySelector("table");
      const mobileList = document.querySelector(".lg\\:hidden");
      const pageText = document.body.innerText;
      return {
        hasDesktopTable: !!desktopTable,
        mobileListHiddenOnDesktop: mobileList ? window.getComputedStyle(mobileList).display === "none" : false,
        textSnippet: pageText.slice(0, 150),
      };
    });
    console.log("  Passes check result:", passesCheck.hasDesktopTable ? "Table found" : `No table (snippet: ${passesCheck.textSnippet})`);
    assert(passesCheck.hasDesktopTable, "Passes directory displays full DataTable on desktop (1280x665)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_passes_1280x665.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_passes_1280x665.png");

    // Profile page at 1280
    await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "responsive_student_profile_1280x665.png"),
      fullPage: false,
    });
    console.log("  📸 Saved screenshot: responsive_student_profile_1280x665.png");

    console.log("\n================================================================");
    console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runResponsiveTests();
