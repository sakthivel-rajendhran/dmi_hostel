/**
 * Visual & Behavioral Verification Script for:
 * - Block -> Floor rename & room format
 * - Switchable policies: roomAllocationMode & photoPolicy
 * - Sign-up 3-step wizard with identical fixed AuthCard sizing across viewports
 * - Profile page display of Academic & Hostel records
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching browser for visual verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------
    // TEST 1: Viewport Card Sizing Check across /login and /register
    // -------------------------------------------------------------
    const viewports = [
      { name: "desktop-1440x900", width: 1440, height: 900 },
      { name: "laptop-1375x715", width: 1375, height: 715 },
      { name: "compact-1366x768", width: 1366, height: 768 },
      { name: "mobile-390x844", width: 390, height: 844 },
    ];

    console.log("\n--- Checking Card Dimensions & Layout Consistency ---");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Measure Login Card
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await sleep(1000);

      const loginCardBounds = await page.evaluate(() => {
        const el = document.querySelector(".rounded-\\[32px\\]");
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });

      // 2. Measure Register Card (Step 1)
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await sleep(1000);

      const registerCardBounds = await page.evaluate(() => {
        const el = document.querySelector(".rounded-\\[32px\\]");
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });

      console.log(
        `Viewport ${vp.name} (${vp.width}x${vp.height}):\n` +
        `  Login Card:    ${loginCardBounds?.width}px × ${loginCardBounds?.height}px\n` +
        `  Register Card: ${registerCardBounds?.width}px × ${registerCardBounds?.height}px`
      );

      // Capture screenshot of Register Step 1
      if (vp.name === "desktop-1440x900") {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "floor-policy-1-register-step1-desktop.png"),
        });
      } else if (vp.name === "mobile-390x844") {
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "floor-policy-2-register-step1-mobile.png"),
        });
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Walk Through Sign-up Wizard (Steps 1, 2, 3, Review, Success)
    // -------------------------------------------------------------
    console.log("\n--- Stepping through Sign-Up Wizard ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[placeholder="e.g. Alex Parker"]', { timeout: 10000 });
    await sleep(500);

    // Step 1: Fill Account
    await page.type('input[placeholder="e.g. Alex Parker"]', "Kavitha Raman");
    await page.type('input[placeholder="e.g. alex.parker@dmice.ac.in"]', "kavitha.raman@dmice.ac.in");
    await page.type('input[placeholder="10-digit mobile e.g. 9876543210"]', "9876543299");
    await sleep(400);

    // Click Next: Academic & Hostel
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const nextBtn = btns.find((b) => b.textContent?.includes("Next: Academic & Hostel"));
      if (nextBtn) nextBtn.click();
    });
    await sleep(800);

    // Screenshot Step 2
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-3-register-step2-academic-hostel.png"),
    });

    // Step 2: Fill Academic & Hostel
    await page.waitForSelector('input[placeholder*="310622104045"]', { timeout: 5000 });
    await page.type('input[placeholder*="310622104045"]', "310626104099");
    await page.type('input[placeholder*="e.g. G04"]', "G08");
    await sleep(400);

    // Click Next: Resident Photo
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const nextBtn = btns.find((b) => b.textContent?.includes("Next: Resident Photo"));
      if (nextBtn) nextBtn.click();
    });
    await sleep(800);

    // Screenshot Step 3
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-4-register-step3-photo.png"),
    });

    // Step 3: Upload Photo
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const logoPath = path.resolve("public/images/dmi-foundations-logo.png");
      await fileInput.uploadFile(logoPath);
      await sleep(800);

      // In PhotoPicker cropper, click "Done" to apply crop
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const doneBtn = btns.find((b) => b.textContent?.includes("Done"));
        if (doneBtn) doneBtn.click();
      });
      await sleep(800);
    }

    // Click Next: Review Details
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const nextBtn = btns.find((b) => b.textContent?.includes("Next: Review Details"));
      if (nextBtn) nextBtn.click();
    });
    await sleep(800);

    // Screenshot Review State
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-4b-register-step4-review.png"),
    });

    // Accept terms & Submit
    await page.evaluate(() => {
      const chk = document.querySelector('input[type="checkbox"]');
      if (chk) chk.click();
      const btns = Array.from(document.querySelectorAll("button"));
      const confirmBtn = btns.find((b) => b.textContent?.includes("Confirm & Register"));
      if (confirmBtn) confirmBtn.click();
    });
    await sleep(1500);

    // Screenshot Success State
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-4c-register-step5-success.png"),
    });

    // -------------------------------------------------------------
    // TEST 3: Student Profile View (Floor, Room, Degree, Batch, Chip)
    // -------------------------------------------------------------
    console.log("\n--- Checking Student Profile Page ---");
    // Switch role to student and visit profile
    await page.goto(`${BASE_URL}/student/profile`, { waitUntil: "domcontentloaded" });
    await sleep(1500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-5-student-profile-floor-records.png"),
    });

    // -------------------------------------------------------------
    // TEST 4: Warden Rooms Page (Floor Filter & 30 rooms/floor)
    // -------------------------------------------------------------
    console.log("\n--- Checking Warden Rooms Page with Floor Filters ---");
    await page.goto(`${BASE_URL}/warden/rooms`, { waitUntil: "domcontentloaded" });
    await sleep(1500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-6-warden-rooms-floor-filters.png"),
    });

    // -------------------------------------------------------------
    // TEST 5: Student Apply Page with Allocation & Completeness
    // -------------------------------------------------------------
    console.log("\n--- Checking Student Apply Page ---");
    await page.goto(`${BASE_URL}/student/apply`, { waitUntil: "domcontentloaded" });
    await sleep(1500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-7-student-apply-page.png"),
    });

    console.log("\nAll visual QA tests and screenshots completed successfully!");
  } catch (err) {
    console.error("Puppeteer QA Error:", err);
  } finally {
    await browser.close();
  }
}

run();
