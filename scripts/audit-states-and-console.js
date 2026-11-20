/**
 * State & Console Warning Audit across all 46 routes
 */

import puppeteer from "puppeteer";
import { MOCK_USERS } from "../src/lib/mock/users.js";

const BASE_URL = "http://localhost:3000";

const ALL_ROUTES = [
  // Public
  { path: "/", role: "public" },
  { path: "/login", role: "public" },
  { path: "/register", role: "public" },
  { path: "/unauthorized", role: "public" },
  { path: "/gate", role: "warden" },
  // Student
  { path: "/student/dashboard", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/apply", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/scan", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/passes", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/notifications", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/profile", role: "student", user: "sarah.cse@gmail.com" },
  { path: "/student/letters", role: "student", user: "sarah.cse@gmail.com" },
  // Staff
  { path: "/staff/dashboard", role: "staff", user: "staff.cse@gmail.com" },
  { path: "/staff/students", role: "staff", user: "staff.cse@gmail.com" },
  { path: "/staff/requests", role: "staff", user: "staff.cse@gmail.com" },
  { path: "/staff/profile", role: "staff", user: "staff.cse@gmail.com" },
  // HOD
  { path: "/hod/dashboard", role: "hod", user: "hod.cse@gmail.com" },
  { path: "/hod/students", role: "hod", user: "hod.cse@gmail.com" },
  { path: "/hod/requests", role: "hod", user: "hod.cse@gmail.com" },
  { path: "/hod/analytics", role: "hod", user: "hod.cse@gmail.com" },
  { path: "/hod/profile", role: "hod", user: "hod.cse@gmail.com" },
  // Warden
  { path: "/warden/dashboard", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/approvals", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/gate-passes", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/students", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/rooms", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/security-log", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/announcements", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/gate-qr", role: "warden", user: "warden.dmi@gmail.com" },
  { path: "/warden/settings", role: "warden", user: "warden.dmi@gmail.com" },
  // Principal
  { path: "/principal/overview", role: "principal", user: "principal.dmi@gmail.com" },
  { path: "/principal/departments", role: "principal", user: "principal.dmi@gmail.com" },
  { path: "/principal/late-returns", role: "principal", user: "principal.dmi@gmail.com" },
  { path: "/principal/security-log", role: "principal", user: "principal.dmi@gmail.com" },
  { path: "/principal/profile", role: "principal", user: "principal.dmi@gmail.com" },
  { path: "/principal/letters", role: "principal", user: "principal.dmi@gmail.com" },
  // Correspondent
  { path: "/correspondent/overview", role: "correspondent", user: "correspondent.dmi@gmail.com" },
  { path: "/correspondent/departments", role: "correspondent", user: "correspondent.dmi@gmail.com" },
  { path: "/correspondent/late-returns", role: "correspondent", user: "correspondent.dmi@gmail.com" },
  { path: "/correspondent/security-log", role: "correspondent", user: "correspondent.dmi@gmail.com" },
  { path: "/correspondent/profile", role: "correspondent", user: "correspondent.dmi@gmail.com" },
  { path: "/correspondent/letters", role: "correspondent", user: "correspondent.dmi@gmail.com" },
];

async function run() {
  console.log("==================================================");
  console.log("     AUDIT: CONSOLE LOGS & STATES INSPECTION      ");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const setSession = async (userEmail, role) => {
    const user = MOCK_USERS.find((u) => u.gmail === userEmail || u.email === userEmail) || {
      id: "MOCK-USER",
      role: role || "warden",
      gmail: userEmail,
      name: "Mock User",
    };
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

  const results = [];

  for (const r of ALL_ROUTES) {
    const errors = [];
    const warnings = [];

    const onConsole = (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    };

    page.on("console", onConsole);

    try {
      if (r.user) {
        await setSession(r.user, r.role);
      } else {
        await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => localStorage.removeItem("dmi_auth_session_v2"));
      }

      await page.goto(`${BASE_URL}${r.path}`, { waitUntil: "networkidle0" });

      const hasSkeleton = await page.evaluate(() => {
        return document.querySelector(".animate-pulse") !== null;
      });

      const pageTitle = await page.evaluate(() => {
        return document.querySelector("h1, h2")?.textContent?.trim() || "";
      });

      results.push({
        path: r.path,
        role: r.role,
        status: "OK",
        title: pageTitle.substring(0, 30),
        errorsCount: errors.length,
        warningsCount: warnings.length,
        hasSkeletonClass: hasSkeleton,
      });
    } catch (err) {
      results.push({
        path: r.path,
        role: r.role,
        status: "ERROR: " + err.message,
        errorsCount: errors.length,
      });
    } finally {
      page.off("console", onConsole);
    }
  }

  console.table(results);
  const totalErrors = results.reduce((acc, r) => acc + (r.errorsCount || 0), 0);
  const totalWarnings = results.reduce((acc, r) => acc + (r.warningsCount || 0), 0);
  console.log(`\nTotal Console Errors: ${totalErrors}`);
  console.log(`Total Console Warnings: ${totalWarnings}`);

  await browser.close();
}

run();
