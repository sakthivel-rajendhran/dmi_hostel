/**
 * Performance and Lighthouse Metric Audit for Phase 6 Step 0
 * Tests the 9 key routes specified in Section 0 & 7:
 * login, student dashboard, scan, apply, warden dashboard, approvals, security log, HOD analytics, principal overview.
 */

import puppeteer from "puppeteer";
import { MOCK_USERS } from "../src/lib/mock/users.js";

const BASE_URL = "http://localhost:3000";

const ROUTES = [
  { name: "Login", path: "/", role: "public" },
  { name: "Student Dashboard", path: "/student/dashboard", role: "student", user: "sarah.cse@gmail.com" },
  { name: "Student Scan", path: "/student/scan", role: "student", user: "sarah.cse@gmail.com" },
  { name: "Student Apply", path: "/student/apply", role: "student", user: "sarah.cse@gmail.com" },
  { name: "Warden Dashboard", path: "/warden/dashboard", role: "warden", user: "warden.dmi@gmail.com" },
  { name: "Warden Approvals", path: "/warden/approvals", role: "warden", user: "warden.dmi@gmail.com" },
  { name: "Warden Security Log", path: "/warden/security-log", role: "warden", user: "warden.dmi@gmail.com" },
  { name: "HOD Analytics", path: "/hod/analytics", role: "hod", user: "hod.cse@gmail.com" },
  { name: "Principal Overview", path: "/principal/overview", role: "principal", user: "principal.dmi@gmail.com" },
];

async function run() {
  console.log("==================================================");
  console.log("       AUDIT: PERFORMANCE METRICS PER KEY ROUTE   ");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const setSession = async (userEmail) => {
    const user = MOCK_USERS.find((u) => u.gmail === userEmail || u.email === userEmail) || {
      id: "MOCK-USER",
      role: "warden",
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

  for (const route of ROUTES) {
    if (route.user) {
      await setSession(route.user);
    } else {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("dmi_auth_session_v2"));
    }

    const start = Date.now();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle0" });
    const loadDuration = Date.now() - start;

    const metrics = await page.evaluate(() => {
      const perf = window.performance.getEntriesByType("navigation")[0];
      const paint = window.performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint");

      return {
        domContentLoaded: perf ? Math.round(perf.domContentLoadedEventEnd - perf.startTime) : null,
        domComplete: perf ? Math.round(perf.domComplete - perf.startTime) : null,
        fcp: fcp ? Math.round(fcp.startTime) : null,
        domElementsCount: document.getElementsByTagName("*").length,
      };
    });

    results.push({
      route: route.name,
      path: route.path,
      loadMs: loadDuration,
      fcpMs: metrics.fcp,
      domContentLoadedMs: metrics.domContentLoaded,
      domElementsCount: metrics.domElementsCount,
    });
  }

  console.log("\nRoute Performance Summary:");
  console.table(results);

  await browser.close();
  return results;
}

run();
