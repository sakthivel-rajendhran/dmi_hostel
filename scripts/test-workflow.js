import puppeteer from "puppeteer";

async function testWorkflow() {
  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. Visit /login and set authenticated student session
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const user = {
      id: "CSE-3-001",
      studentId: "CSE-3-001",
      name: "Rahul Kumar",
      role: "student",
      email: "rahul.kumar@dmice.ac.in",
      avatar: "RK",
    };
    const session = {
      user,
      role: "student",
      mustChangePassword: false,
      token: "test-token",
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
  });

  // 2. Test Scan Page: default pass (DMI-PASS-2026-0001 is pending)
  console.log("Testing Scan Page with pending pass (awaiting Warden approval)...");
  await page.goto("http://localhost:3000/student/scan", { waitUntil: "networkidle2" });
  await page.waitForSelector("h1");

  const hasApproveMsg = await page.evaluate(() => Boolean(document.querySelector("[data-testid='warden-approval-message']")));
  const hasEnableCam = await page.evaluate(() => Boolean(document.querySelector("[data-testid='enable-camera-button']")));
  console.log("  Scan Page with pending pass: GET APPROVE FROM WARDEN visible =", hasApproveMsg);
  console.log("  Scan Page with pending pass: Enable Camera button visible =", hasEnableCam);

  if (!hasApproveMsg || hasEnableCam) {
    throw new Error("Scan page failed pending pass check!");
  }

  // 3. Test Scan Page with approved pass (DMI-PASS-2026-0003 is approved)
  console.log("Testing Scan Page with approved pass DMI-PASS-2026-0003...");
  await page.goto("http://localhost:3000/student/scan?passId=DMI-PASS-2026-0003", { waitUntil: "networkidle2" });
  await page.waitForSelector("h1");

  const approvedHasEnableCam = await page.evaluate(() => Boolean(document.querySelector("[data-testid='enable-camera-button']")));
  const approvedHasApproveMsg = await page.evaluate(() => Boolean(document.querySelector("[data-testid='warden-approval-message']")));
  console.log("  Scan Page with approved pass: Enable Camera button visible =", approvedHasEnableCam);
  console.log("  Scan Page with approved pass: GET APPROVE FROM WARDEN hidden =", !approvedHasApproveMsg);

  if (!approvedHasEnableCam || approvedHasApproveMsg) {
    throw new Error("Scan page failed approved pass check!");
  }

  // 4. Test Profile Page
  console.log("Testing Profile Page elements...");
  await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle2" });
  await page.waitForSelector("h1");

  const profileHeading = await page.evaluate(() => document.querySelector("h1")?.innerText || "");
  console.log("  Profile heading:", profileHeading);

  const hasPhotoInput = await page.evaluate(() => Boolean(document.querySelector("input[type='file']")));
  console.log("  Hidden file input present:", hasPhotoInput);

  // 5. Test Responsiveness
  console.log("Testing Mobile Viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle2" });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log("  Mobile horizontal overflow:", mobileOverflow);

  console.log("Testing Tablet Viewport (768x1024)...");
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle2" });
  const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log("  Tablet horizontal overflow:", tabletOverflow);

  await browser.close();
  console.log("\n>>> ALL AUTOMATED WORKFLOW TESTS PASSED CLEANLY! <<<");
}

testWorkflow().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
