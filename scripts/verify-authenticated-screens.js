/**
 * Visual & Behavioral Verification Script - Part 2:
 * Injects session to capture authenticated Student Profile, Warden Rooms, and Apply screens.
 */

import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching browser for remaining authenticated screens...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Visit root and inject Student session
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(600);

    await page.evaluate(() => {
      const studentSession = {
        user: {
          id: "CSE-3-001",
          studentId: "CSE-3-001",
          name: "Rahul Kumar",
          role: "student",
          department: "CSE",
          dept: "CSE",
          year: 3,
          programme: "B.E.",
          section: "A",
          batch: "2022 – 2026",
          regNumber: "310622104045",
          regNo: "310622104045",
          floor: "F3",
          floorLabel: "3rd Floor",
          room: "304",
          roomNo: "304",
          roomNumber: "304",
          hostelVerification: "verified",
          profileComplete: true,
          phone: "9876543210",
          guardianName: "David Kumar",
          guardianPhone: "9876500001",
          guardianRelation: "Father",
          photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
          photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
        },
        role: "student",
        token: "mock-jwt-student-verified",
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(studentSession));
    });

    // 2. Capture Student Profile Page
    console.log("Capturing Student Profile Page...");
    await page.goto(`${BASE_URL}/student/profile`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-5-student-profile-floor-records.png"),
    });

    // 3. Capture Student Apply Page
    console.log("Capturing Student Apply Page...");
    await page.goto(`${BASE_URL}/student/apply`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-7-student-apply-page.png"),
    });

    // 4. Inject Warden session and capture Warden Rooms Page
    console.log("Capturing Warden Rooms Page with Floor filters...");
    await page.evaluate(() => {
      const wardenSession = {
        user: {
          id: "WARDEN-001",
          name: "Dr. John Xavier",
          role: "warden",
          designation: "Chief Warden & Professor",
          assignedFloors: ["GF", "F2", "F3", "F4"],
        },
        role: "warden",
        token: "mock-jwt-warden-session",
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(wardenSession));
    });

    await page.goto(`${BASE_URL}/warden/rooms`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "floor-policy-6-warden-rooms-floor-filters.png"),
    });

    console.log("All screenshots captured successfully!");
  } catch (err) {
    console.error("Authenticated visual capture error:", err);
  } finally {
    await browser.close();
  }
}

run();
