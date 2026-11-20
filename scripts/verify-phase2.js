/**
 * DMI College Hostel Management PWA - Phase 2 Visual QA & Verification Script
 * Automates browser acceptance checks, navigations, interactive states and captures screenshots.
 */

import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const BASE_URL = "http://localhost:3000";

const RAHUL_SESSION = {
  user: {
    id: "CSE-3-001",
    studentId: "CSE-3-001",
    name: "Rahul Kumar",
    email: "rahul.kumar@dmice.ac.in",
    gmail: "rahul.kumar@gmail.com",
    role: "student",
    phone: "9876543210",
    avatar: "RK",
    dept: "CSE",
    department: "CSE",
    year: 3,
    block: "B",
    roomNumber: "B-204",
    guardianName: "David Kumar",
    guardianPhone: "9876500001",
    bloodGroup: "O+ve",
    mustChangePassword: false,
    profileComplete: true,
  },
  role: "student",
  token: "mock-jwt-token-CSE-3-001",
  loginTime: new Date().toISOString(),
};

const KARTHIK_INCOMPLETE_SESSION = {
  user: {
    id: "IT-2-004",
    studentId: "IT-2-004",
    name: "Karthik Rajan",
    email: "karthik.rajan@dmice.ac.in",
    gmail: "karthik.rajan@gmail.com",
    role: "student",
    phone: "",
    avatar: "KR",
    dept: "IT",
    department: "IT",
    year: 2,
    block: "",
    roomNumber: "",
    guardianName: "",
    guardianPhone: "",
    bloodGroup: "B+ve",
    mustChangePassword: false,
    profileComplete: false,
  },
  role: "student",
  token: "mock-jwt-token-IT-2-004",
  loginTime: new Date().toISOString(),
};

async function run() {
  console.log("Starting Phase 2 Puppeteer Verification...\n");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  async function setSessionAndTheme(sessionObj, themeMode = "light") {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      (sess, theme) => {
        localStorage.setItem("dmi_auth_session_v2", JSON.stringify(sess));
        localStorage.setItem("theme", theme);
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      sessionObj,
      themeMode
    );
  }

  // 1. DASHBOARD - MOBILE (390x844) LIGHT
  console.log("Capturing Student Dashboard (Mobile 390x844 Light)...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await setSessionAndTheme(RAHUL_SESSION, "light");
  await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-dashboard-mobile-light.png") });

  // 2. DASHBOARD - MOBILE (390x844) DARK
  console.log("Capturing Student Dashboard (Mobile 390x844 Dark)...");
  await setSessionAndTheme(RAHUL_SESSION, "dark");
  await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-dashboard-mobile-dark.png") });

  // 3. DASHBOARD - DESKTOP (1440x900 Phone Frame) LIGHT
  console.log("Capturing Student Dashboard (Desktop 1440x900 Phone Frame)...");
  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await setSessionAndTheme(RAHUL_SESSION, "light");
  await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-dashboard-desktop-1440x900.png") });

  // 4. APPLY PASS - MOBILE (390x844) LIGHT
  console.log("Capturing Apply Pass (Mobile Light)...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await setSessionAndTheme(RAHUL_SESSION, "light");
  await page.goto(`${BASE_URL}/student/apply`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-apply-mobile-light.png") });

  // 5. APPLY PASS PROFILE GATE - IT-2-004 INCOMPLETE PROFILE BLOCKING
  console.log("Capturing Apply Pass Profile Completeness Gate (IT-2-004)...");
  await setSessionAndTheme(KARTHIK_INCOMPLETE_SESSION, "light");
  await page.goto(`${BASE_URL}/student/apply`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-apply-profile-gate-blocked.png") });

  // Switch back to Rahul Kumar for remaining checks
  await setSessionAndTheme(RAHUL_SESSION, "light");

  // 6. MY PASSES - MOBILE (390x844) LIGHT & DARK
  console.log("Capturing My Passes (Mobile Light)...");
  await page.goto(`${BASE_URL}/student/passes`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-passes-mobile-light.png") });

  console.log("Capturing My Passes (Mobile Dark)...");
  await setSessionAndTheme(RAHUL_SESSION, "dark");
  await page.goto(`${BASE_URL}/student/passes`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-passes-mobile-dark.png") });

  // 7. PASS DETAILS - ACTIVE QR TOKEN (DMI-PASS-2026-0004)
  console.log("Capturing Pass Details with QR (DMI-PASS-2026-0004)...");
  await setSessionAndTheme(RAHUL_SESSION, "light");
  await page.goto(`${BASE_URL}/student/passes/DMI-PASS-2026-0004`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-pass-details-qr-token-light.png") });

  // 8. PASS DETAILS - REJECTED WITH WARDEN REASON (DMI-PASS-2026-0007)
  console.log("Capturing Pass Details Rejected (DMI-PASS-2026-0007)...");
  await page.goto(`${BASE_URL}/student/passes/DMI-PASS-2026-0007`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-pass-details-rejected-reason.png") });

  // 9. MY GATE QR (/student/scan)
  console.log("Capturing My Gate QR (/student/scan)...");
  await page.goto(`${BASE_URL}/student/scan`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-my-gate-qr-light.png") });

  // 10. PROFILE PAGE (/student/profile)
  console.log("Capturing Profile Page (/student/profile)...");
  await page.goto(`${BASE_URL}/student/profile`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-profile-light.png") });

  // 11. NOTIFICATIONS PAGE (/student/notifications)
  console.log("Capturing Notifications Page (/student/notifications)...");
  await page.goto(`${BASE_URL}/student/notifications`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "phase2-student-notifications-light.png") });

  await browser.close();
  console.log("\nAll Phase 2 Visual QA screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Puppeteer verification failed:", err);
  process.exit(1);
});
