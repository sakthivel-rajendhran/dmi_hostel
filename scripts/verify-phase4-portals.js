/**
 * Visual QA Verification for Phase 4: Staff & HOD Portals
 * Captures screenshots of:
 * 1. Staff Dashboard (Desktop & Mobile)
 * 2. Staff Students Directory (with Student Drawer)
 * 3. Staff Pass Requests Queue & Review Detail
 * 4. Staff Profile & Notification Preferences
 * 5. HOD Dashboard (with Performance Strip & Violet Accent)
 * 6. HOD Department Analytics (Recharts Charts, KPIs & Tables)
 * 7. HOD Requests & Profile
 * 8. Dark Mode Verification
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { MOCK_USERS } from "../src/lib/mock/users.js";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching headless browser for Phase 4 verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const staff1 = MOCK_USERS.find((u) => u.gmail === "staff.cse@gmail.com");
  const hodCse = MOCK_USERS.find((u) => u.gmail === "hod.cse@gmail.com");

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

  try {
    // -------------------------------------------------------------------------
    // 1. STAFF DASHBOARD (Desktop & Mobile)
    // -------------------------------------------------------------------------
    console.log("Testing 1: Staff Dashboard Desktop...");
    await page.setViewport({ width: 1440, height: 900 });
    await setSession(staff1);
    await page.goto(`${BASE_URL}/staff/dashboard`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot1 = path.join(ARTIFACT_DIR, "phase4-1-staff-dashboard-desktop.png");
    await page.screenshot({ path: shot1, fullPage: true });
    console.log("Captured:", shot1);

    console.log("Testing 1b: Staff Dashboard Mobile...");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/staff/dashboard`, { waitUntil: "networkidle0" });
    await sleep(1200);

    const shot1m = path.join(ARTIFACT_DIR, "phase4-1m-staff-dashboard-mobile.png");
    await page.screenshot({ path: shot1m, fullPage: true });
    console.log("Captured:", shot1m);

    // -------------------------------------------------------------------------
    // 2. STAFF STUDENTS DIRECTORY (Desktop + Open Drawer)
    // -------------------------------------------------------------------------
    console.log("Testing 2: Staff Students Directory...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/staff/students`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot2 = path.join(ARTIFACT_DIR, "phase4-2-staff-students-directory.png");
    await page.screenshot({ path: shot2, fullPage: true });
    console.log("Captured:", shot2);

    // Open first student drawer
    console.log("Testing 2b: Opening Student Read-Only Drawer...");
    const detailsBtn = await page.$("tbody tr button");
    if (detailsBtn) {
      await detailsBtn.click();
      await sleep(800);
      const shot2drawer = path.join(ARTIFACT_DIR, "phase4-2b-staff-student-drawer-locked.png");
      await page.screenshot({ path: shot2drawer });
      console.log("Captured:", shot2drawer);
    }

    // -------------------------------------------------------------------------
    // 3. STAFF PASS REQUESTS QUEUE & REVIEW
    // -------------------------------------------------------------------------
    console.log("Testing 3: Staff Pass Requests Queue...");
    await page.goto(`${BASE_URL}/staff/requests`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot3 = path.join(ARTIFACT_DIR, "phase4-3-staff-requests-queue.png");
    await page.screenshot({ path: shot3, fullPage: true });
    console.log("Captured:", shot3);

    // Click "Recommend Pass (R)" to open modal
    const clickedRecommend = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent.includes("Recommend Pass"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clickedRecommend) {
      await sleep(600);
      const shot3modal = path.join(ARTIFACT_DIR, "phase4-3b-staff-recommend-modal.png");
      await page.screenshot({ path: shot3modal });
      console.log("Captured:", shot3modal);

      // Close modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const cancel = btns.find((b) => b.textContent.trim() === "Cancel");
        if (cancel) cancel.click();
      });
      await sleep(300);
    }

    // -------------------------------------------------------------------------
    // 4. STAFF PROFILE & NOTIFICATION PREFERENCES
    // -------------------------------------------------------------------------
    console.log("Testing 4: Staff Profile...");
    await page.goto(`${BASE_URL}/staff/profile`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot4 = path.join(ARTIFACT_DIR, "phase4-4-staff-profile.png");
    await page.screenshot({ path: shot4, fullPage: true });
    console.log("Captured:", shot4);

    // -------------------------------------------------------------------------
    // 5. HOD DASHBOARD (With Violet Accent & Monthly Strip)
    // -------------------------------------------------------------------------
    console.log("Testing 5: HOD Dashboard...");
    await setSession(hodCse);
    await page.goto(`${BASE_URL}/hod/dashboard`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot5 = path.join(ARTIFACT_DIR, "phase4-5-hod-dashboard.png");
    await page.screenshot({ path: shot5, fullPage: true });
    console.log("Captured:", shot5);

    // -------------------------------------------------------------------------
    // 6. HOD DEPARTMENT ANALYTICS (Recharts, 7 KPIs, 3 Audit Tables)
    // -------------------------------------------------------------------------
    console.log("Testing 6: HOD Department Analytics...");
    await page.goto(`${BASE_URL}/hod/analytics`, { waitUntil: "networkidle0" });
    await sleep(2000);

    const shot6 = path.join(ARTIFACT_DIR, "phase4-6-hod-analytics-overview.png");
    await page.screenshot({ path: shot6, fullPage: true });
    console.log("Captured:", shot6);

    // -------------------------------------------------------------------------
    // 7. HOD STUDENTS DIRECTORY & REQUESTS
    // -------------------------------------------------------------------------
    console.log("Testing 7: HOD Students & Requests...");
    await page.goto(`${BASE_URL}/hod/students`, { waitUntil: "networkidle0" });
    await sleep(1500);
    const shot7 = path.join(ARTIFACT_DIR, "phase4-7-hod-students.png");
    await page.screenshot({ path: shot7, fullPage: true });
    console.log("Captured:", shot7);

    await page.goto(`${BASE_URL}/hod/requests`, { waitUntil: "networkidle0" });
    await sleep(1500);
    const shot7req = path.join(ARTIFACT_DIR, "phase4-7b-hod-requests.png");
    await page.screenshot({ path: shot7req, fullPage: true });
    console.log("Captured:", shot7req);

    // -------------------------------------------------------------------------
    // 8. DARK MODE VERIFICATION
    // -------------------------------------------------------------------------
    console.log("Testing 8: Dark Mode Verification...");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });
    await page.goto(`${BASE_URL}/hod/analytics`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const shot8 = path.join(ARTIFACT_DIR, "phase4-8-hod-analytics-dark-mode.png");
    await page.screenshot({ path: shot8, fullPage: true });
    console.log("Captured:", shot8);

    console.log("\nAll visual screenshots captured successfully!");
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await browser.close();
  }
}

run();
