import puppeteer from "puppeteer";

async function runE2E() {
  console.log("==================================================");
  console.log("   DMI COLLEGE HOSTEL PWA - COMPLETE E2E SUITE    ");
  console.log("==================================================\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // FLOW 1: STUDENT PORTAL (Rahul Kumar, CSE-3-001)
    // -------------------------------------------------------------------------
    console.log("[Flow 1] Student Portal: Login, Apply Pass & Scan Gate QR");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    // Login as student
    await page.type("input#identifier, input[name='identifier'], input[placeholder*='Student ID']", "CSE-3-001");
    await page.type("input#password, input[name='password'], input[type='password']", "Student@123");
    await page.click("button[type='submit']");

    await page.waitForFunction(() => window.location.pathname.includes("/student/dashboard"), { timeout: 8000 });
    assert(page.url().includes("/student/dashboard"), "Redirects to /student/dashboard on student login");

    await page.waitForSelector("main, h1, h2");
    const studentTitle = await page.evaluate(() => document.body.innerText);
    assert(studentTitle.includes("Rahul") || studentTitle.includes("Hostel") || studentTitle.includes("Pass"), "Dashboard renders student portal");

    // Navigate to Apply Pass
    await page.goto("http://localhost:3000/student/apply", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    const applyText = await page.evaluate(() => document.body.innerText);
    assert(applyText.includes("Apply") || applyText.includes("Pass"), "Student can view Apply Pass form");

    // Navigate to My Passes
    await page.goto("http://localhost:3000/student/passes", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    const passesText = await page.evaluate(() => document.body.innerText);
    assert(passesText.includes("Pass") || passesText.includes("Filter"), "Student can view passes directory");

    // Navigate to Gate QR Scanner
    await page.goto("http://localhost:3000/student/scan", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 800));
    const scanText = await page.evaluate(() => document.body.innerText);
    assert(scanText.includes("Gate") || scanText.includes("Scan") || scanText.includes("Pass"), "Student can access Gate QR scanner screen");

    // -------------------------------------------------------------------------
    // FLOW 2: WARDEN PORTAL (Dr. John Xavier, warden.dmi@gmail.com)
    // -------------------------------------------------------------------------
    console.log("\n[Flow 2] Warden Portal: Approvals, Staff Accounts & Rooms");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    // Switch to Staff / Admin tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button[role='tab']"));
      const tab = tabs.find((b) => b.textContent?.includes("Staff") || b.textContent?.includes("Admin"));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.type("input[name='identifier']", "warden.dmi@gmail.com");
    await page.type("input[name='password']", "Warden@123");
    await page.click("button[type='submit']");

    await page.waitForFunction(() => window.location.pathname.includes("/warden/dashboard"), { timeout: 8000 });
    assert(page.url().includes("/warden/dashboard"), "Redirects to /warden/dashboard on Warden login");

    // Approvals page
    await page.goto("http://localhost:3000/warden/approvals", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    const approvalsText = await page.evaluate(() => document.body.innerText);
    assert(approvalsText.includes("Approval") || approvalsText.includes("Pass"), "Warden can access Approvals queue");

    // Staff Accounts page
    await page.goto("http://localhost:3000/warden/staff-accounts", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 800));
    const staffAccountsText = await page.evaluate(() => document.body.innerText);
    assert(staffAccountsText.includes("Staff") || staffAccountsText.includes("Account") || staffAccountsText.includes("Faculty"), "Warden can access Staff Accounts page");

    // Rooms page
    await page.goto("http://localhost:3000/warden/rooms", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    const roomsText = await page.evaluate(() => document.body.innerText);
    assert(roomsText.includes("Room") || roomsText.includes("Floor"), "Warden can access Room Allocations");

    // -------------------------------------------------------------------------
    // FLOW 3: HOD PORTAL (Dr. K. Arulmozhi, hod.cse@gmail.com)
    // -------------------------------------------------------------------------
    console.log("\n[Flow 3] HOD Portal: Department Dashboard & Analytics");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button[role='tab']"));
      const tab = tabs.find((b) => b.textContent?.includes("Staff") || b.textContent?.includes("Admin"));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.type("input[name='identifier']", "hod.cse@gmail.com");
    await page.type("input[name='password']", "Staff@123");
    await page.click("button[type='submit']");

    await page.waitForFunction(() => window.location.pathname.includes("/hod/dashboard"), { timeout: 8000 });
    assert(page.url().includes("/hod/dashboard"), "Redirects to /hod/dashboard on HOD login");

    // HOD Analytics
    await page.goto("http://localhost:3000/hod/analytics", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 800));
    const hodAnalyticsText = await page.evaluate(() => document.body.innerText);
    assert(hodAnalyticsText.includes("Analytics") || hodAnalyticsText.includes("CSE") || hodAnalyticsText.includes("Department"), "HOD can access Department Analytics");

    // -------------------------------------------------------------------------
    // FLOW 4: PRINCIPAL PORTAL (Dr. M. Senthil Kumar, principal.dmi@gmail.com)
    // -------------------------------------------------------------------------
    console.log("\n[Flow 4] Principal Portal: Campus Overview & Late Returns");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button[role='tab']"));
      const tab = tabs.find((b) => b.textContent?.includes("Staff") || b.textContent?.includes("Admin"));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.type("input[name='identifier']", "principal.dmi@gmail.com");
    await page.type("input[name='password']", "Staff@123");
    await page.click("button[type='submit']");

    await page.waitForFunction(() => window.location.pathname.includes("/principal/overview"), { timeout: 8000 });
    assert(page.url().includes("/principal/overview"), "Redirects to /principal/overview on Principal login");

    // Late returns
    await page.goto("http://localhost:3000/principal/late-returns", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 800));
    const lateReturnsText = await page.evaluate(() => document.body.innerText);
    assert(lateReturnsText.includes("Late") || lateReturnsText.includes("Returns") || lateReturnsText.includes("Campus"), "Principal can view Late Returns Audit");

    // -------------------------------------------------------------------------
    // FLOW 5: CORRESPONDENT PORTAL (Rev. Fr. J. Antony, correspondent.dmi@gmail.com)
    // -------------------------------------------------------------------------
    console.log("\n[Flow 5] Correspondent Portal: Governance Overview");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle2" });

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button[role='tab']"));
      const tab = tabs.find((b) => b.textContent?.includes("Staff") || b.textContent?.includes("Admin"));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.type("input[name='identifier']", "correspondent.dmi@gmail.com");
    await page.type("input[name='password']", "Staff@123");
    await page.click("button[type='submit']");

    await page.waitForFunction(() => window.location.pathname.includes("/correspondent/overview"), { timeout: 8000 });
    assert(page.url().includes("/correspondent/overview"), "Redirects to /correspondent/overview on Correspondent login");

    console.log("\n==================================================");
    console.log(`E2E SUMMARY: TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("==================================================");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("E2E Execution Error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
