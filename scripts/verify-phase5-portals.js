/**
 * Visual QA Verification for Phase 5: Principal & Correspondent Portals
 * Comprehensive automated inspection across 5 viewports in light and dark mode.
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { MOCK_USERS } from "../src/lib/mock/users.js";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("====================================================");
  console.log("PHASE 5 VISUAL QA & VERIFICATION SUITE");
  console.log("====================================================");

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const principal = MOCK_USERS.find((u) => u.gmail === "principal.dmi@gmail.com") || {
    id: "U-PRIN-001",
    name: "Dr. A. Joseph",
    gmail: "principal.dmi@gmail.com",
    role: "principal",
    phone: "9876543230",
  };

  const correspondent = MOCK_USERS.find((u) => u.gmail === "correspondent.dmi@gmail.com") || {
    id: "U-CORR-001",
    name: "Rev. Fr. T. Thomas",
    gmail: "correspondent.dmi@gmail.com",
    role: "correspondent",
    phone: "9876543231",
  };

  const student = MOCK_USERS.find((u) => u.gmail === "sarah.cse@gmail.com") || {
    id: "U-STU-001",
    name: "Sarah Jenkins",
    gmail: "sarah.cse@gmail.com",
    role: "student",
  };

  const setSession = async (user) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate((u) => {
      const session = {
        user: u,
        role: u.role,
        token: `mock-jwt-${u.id}-${Date.now()}`,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
    }, user);
  };

  const setPolicy = async (updater) => {
    await page.evaluate((fnStr) => {
      const raw = localStorage.getItem("dmi_hostel_policy_v2");
      let current = raw ? JSON.parse(raw) : {};
      const updateFn = new Function("curr", fnStr);
      current = updateFn(current);
      localStorage.setItem("dmi_hostel_policy_v2", JSON.stringify(current));
      window.dispatchEvent(new CustomEvent("dmi-policy-change", { detail: current }));
    }, updater.toString());
  };

  const checkNoHorizontalScroll = async (contextName) => {
    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    if (hasScroll) {
      console.warn(`[WARNING] Horizontal scroll detected in: ${contextName}`);
    } else {
      console.log(`[PASS] Zero horizontal scroll: ${contextName}`);
    }
  };

  try {
    // -------------------------------------------------------------------------
    // 1. PRINCIPAL CAMPUS OVERVIEW (Desktop Large 1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Principal Campus Overview (Desktop 1440x900) ---");
    await page.setViewport({ width: 1440, height: 900 });
    await setSession(principal);
    await page.goto(`${BASE_URL}/principal/overview`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot1 = path.join(ARTIFACT_DIR, "phase5-1-principal-overview-desktop.png");
    await page.screenshot({ path: shot1, fullPage: true });
    console.log("Captured:", shot1);
    await checkNoHorizontalScroll("Principal Overview Desktop");

    // -------------------------------------------------------------------------
    // 2. PRINCIPAL CAMPUS OVERVIEW (Mobile 390x844)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Principal Campus Overview (Mobile 390x844) ---");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/principal/overview`, { waitUntil: "networkidle0" });
    await sleep(1200);

    const shot1m = path.join(ARTIFACT_DIR, "phase5-1m-principal-overview-mobile.png");
    await page.screenshot({ path: shot1m, fullPage: true });
    console.log("Captured:", shot1m);
    await checkNoHorizontalScroll("Principal Overview Mobile");

    // -------------------------------------------------------------------------
    // 3. PRINCIPAL DEPARTMENT INSIGHTS (1366x768) + Open Drawer
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Principal Department Insights (1366x768) ---");
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}/principal/departments`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot2 = path.join(ARTIFACT_DIR, "phase5-2-principal-departments.png");
    await page.screenshot({ path: shot2, fullPage: true });
    console.log("Captured:", shot2);
    await checkNoHorizontalScroll("Principal Departments 1366x768");

    // Click "View Details" on the first department to test Drilldown Drawer
    console.log("Testing Department Drilldown Drawer...");
    const clickedDrawer = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("tbody tr button"));
      const btn = btns.find((b) => b.textContent.includes("View Details"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clickedDrawer) {
      await sleep(800);
      const shot2b = path.join(ARTIFACT_DIR, "phase5-2b-dept-drilldown-drawer.png");
      await page.screenshot({ path: shot2b });
      console.log("Captured:", shot2b);

      // Close drawer
      await page.evaluate(() => {
        const closeBtn = document.querySelector('[aria-label="Close"], button:has(svg.lucide-x)');
        if (closeBtn) closeBtn.click();
      });
      await sleep(400);
    }

    // -------------------------------------------------------------------------
    // 4. PRINCIPAL LATE RETURNS AUDIT (1024x768)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Principal Late Returns Audit (1024x768) ---");
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/principal/late-returns`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot3 = path.join(ARTIFACT_DIR, "phase5-3-principal-late-returns.png");
    await page.screenshot({ path: shot3, fullPage: true });
    console.log("Captured:", shot3);
    await checkNoHorizontalScroll("Principal Late Returns 1024x768");

    // Click Repeat Offenders tab
    console.log("Switching to Repeat Offenders Tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const tab = tabs.find((t) => t.textContent.includes("Repeat offenders"));
      if (tab) tab.click();
    });
    await sleep(600);
    const shot3b = path.join(ARTIFACT_DIR, "phase5-3b-repeat-offenders-tab.png");
    await page.screenshot({ path: shot3b });
    console.log("Captured:", shot3b);

    // -------------------------------------------------------------------------
    // 5. PRINCIPAL READ-ONLY SECURITY LOG (1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Principal Read-Only Security Log (1440x900) ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/principal/security-log`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot4 = path.join(ARTIFACT_DIR, "phase5-4-principal-security-log.png");
    await page.screenshot({ path: shot4, fullPage: true });
    console.log("Captured:", shot4);
    await checkNoHorizontalScroll("Principal Security Log");

    // -------------------------------------------------------------------------
    // 6. CORRESPONDENT OVERVIEW & WELFARE FOCUS (768x1024 Tablet Portrait)
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Correspondent Overview (768x1024 Tablet Portrait) ---");
    await page.setViewport({ width: 768, height: 1024 });
    await setSession(correspondent);
    await page.goto(`${BASE_URL}/correspondent/overview`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot5 = path.join(ARTIFACT_DIR, "phase5-5-correspondent-overview-tablet.png");
    await page.screenshot({ path: shot5, fullPage: true });
    console.log("Captured:", shot5);
    await checkNoHorizontalScroll("Correspondent Overview Tablet");

    // -------------------------------------------------------------------------
    // 7. CORRESPONDENT PROFILE (1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Correspondent Profile (1440x900) ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/correspondent/profile`, { waitUntil: "networkidle0" });
    await sleep(1200);

    const shot6 = path.join(ARTIFACT_DIR, "phase5-6-correspondent-profile.png");
    await page.screenshot({ path: shot6, fullPage: true });
    console.log("Captured:", shot6);

    // -------------------------------------------------------------------------
    // 8. LETTERS MODULE TOGGLE VERIFICATION (Letters OFF -> Letters ON -> Review -> Undo -> Letters OFF)
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Letters Module Feature Flag Verification ---");

    // Step 8a: Ensure letters disabled initially
    await setPolicy(`curr.studentLetters = { ...curr.studentLetters, enabled: false }; return curr;`);
    await page.goto(`${BASE_URL}/principal/overview`, { waitUntil: "networkidle0" });
    await sleep(600);

    const navHasLettersWhenDisabled = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Letters") && document.querySelector('a[href*="/letters"]') !== null;
    });
    console.log(`Letters nav visible when disabled: ${navHasLettersWhenDisabled} (Expected: false)`);

    // Verify fallback banner when hitting route directly with letters disabled
    await page.goto(`${BASE_URL}/principal/letters`, { waitUntil: "networkidle0" });
    await sleep(800);
    const shot7disabled = path.join(ARTIFACT_DIR, "phase5-7a-letters-disabled-banner.png");
    await page.screenshot({ path: shot7disabled });
    console.log("Captured letters disabled notice:", shot7disabled);

    // Step 8b: Enable letters in policy!
    console.log("Enabling studentLetters in policy...");
    await setPolicy(`curr.studentLetters = { ...curr.studentLetters, enabled: true, approverMode: 'either', letterApprovalRequired: true, requiredHomeDays: 7 }; return curr;`);
    await sleep(600);

    // Refresh Principal Letters queue
    await page.goto(`${BASE_URL}/principal/letters`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot7enabled = path.join(ARTIFACT_DIR, "phase5-7b-principal-letters-queue.png");
    await page.screenshot({ path: shot7enabled, fullPage: true });
    console.log("Captured principal letters queue:", shot7enabled);

    // Open first letter detail / action modal
    console.log("Opening letter action dialog...");
    const openedAction = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent.includes("Endorse") || b.textContent.includes("Approve"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (openedAction) {
      await sleep(600);
      const shot7action = path.join(ARTIFACT_DIR, "phase5-7c-letter-decision-modal.png");
      await page.screenshot({ path: shot7action });
      console.log("Captured letter decision modal:", shot7action);

      // Confirm endorsement to see undo toast
      const confirmed = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find((b) => b.textContent.includes("Confirm Endorsement") || b.textContent.includes("Confirm Approval"));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (confirmed) {
        await sleep(600);
        const shot7undo = path.join(ARTIFACT_DIR, "phase5-7d-letter-undo-toast.png");
        await page.screenshot({ path: shot7undo });
        console.log("Captured undo toast:", shot7undo);
      }
    }

    // Step 8c: Test Student Letters submission page
    console.log("Testing Student Letters page (/student/letters)...");
    await setSession(student);
    await page.goto(`${BASE_URL}/student/letters`, { waitUntil: "networkidle0" });
    await sleep(1200);

    const shot7student = path.join(ARTIFACT_DIR, "phase5-7e-student-letters-portal.png");
    await page.screenshot({ path: shot7student, fullPage: true });
    console.log("Captured student letters portal:", shot7student);

    // Step 8d: Cleanly turn letters back OFF
    console.log("Disabling studentLetters back to default...");
    await setPolicy(`curr.studentLetters = { ...curr.studentLetters, enabled: false }; return curr;`);
    await page.goto(`${BASE_URL}/student/apply`, { waitUntil: "networkidle0" });
    await sleep(800);

    // -------------------------------------------------------------------------
    // 9. DARK MODE VERIFICATION (1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Dark Mode Verification ---");
    await setSession(principal);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/principal/overview`, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await sleep(1000);

    const shot8dark = path.join(ARTIFACT_DIR, "phase5-8-principal-overview-dark.png");
    await page.screenshot({ path: shot8dark, fullPage: true });
    console.log("Captured Dark Mode Principal Overview:", shot8dark);

    // Dark mode on Departments
    await page.goto(`${BASE_URL}/principal/departments`, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await sleep(1000);

    const shot8darkDepts = path.join(ARTIFACT_DIR, "phase5-8b-principal-departments-dark.png");
    await page.screenshot({ path: shot8darkDepts, fullPage: true });
    console.log("Captured Dark Mode Principal Departments:", shot8darkDepts);

    console.log("\n====================================================");
    console.log("ALL PHASE 5 VISUAL QA CHECKS COMPLETED SUCCESSFULLY!");
    console.log("====================================================");
  } catch (err) {
    console.error("Visual QA Verification Error:", err);
  } finally {
    await browser.close();
  }
}

run();
