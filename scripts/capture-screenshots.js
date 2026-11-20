import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  // 1. Desktop Light Mode (1440x900)
  console.log("Capturing Desktop Light Mode (1440x900)...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await delay(1000);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-desktop-light-1440.png"),
    fullPage: false,
  });

  // 2. Desktop Dark Mode (1440x900)
  console.log("Toggling Dark Mode...");
  const darkToggle = await page.$('button[aria-label="Switch to dark mode"]');
  if (darkToggle) {
    await darkToggle.click();
    await delay(600);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-desktop-dark-1440.png"),
    fullPage: false,
  });

  // 3. Admin Role Selection in Dark Mode
  console.log("Selecting Admin Role...");
  const adminTab = await page.$('button[role="tab"]:nth-child(2)');
  if (adminTab) {
    await adminTab.click();
    await delay(500);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-desktop-admin-dark-1440.png"),
    fullPage: false,
  });

  // 4. Admin Role in Light Mode
  console.log("Toggling back to Light Mode with Admin selected...");
  const lightToggle = await page.$('button[aria-label="Switch to light mode"]');
  if (lightToggle) {
    await lightToggle.click();
    await delay(600);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-desktop-admin-light-1440.png"),
    fullPage: false,
  });

  // Switch back to Student
  const studentTab = await page.$('button[role="tab"]:nth-child(1)');
  if (studentTab) {
    await studentTab.click();
    await delay(400);
  }

  // 5. Tablet Viewport (1024x768)
  console.log("Capturing Tablet Viewport (1024x768)...");
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });
  await delay(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-tablet-1024.png"),
    fullPage: false,
  });

  // 6. Mobile Viewport (390x844 - iPhone 14)
  console.log("Capturing Mobile Viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await delay(500);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-mobile-390.png"),
    fullPage: false,
  });

  // 7. Forgot Password Modal
  console.log("Opening Forgot Password Modal...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await delay(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const fb = btns.find((b) => b.textContent && b.textContent.includes("Forgot Password?"));
    if (fb) fb.click();
  });
  await delay(600);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-forgot-modal.png"),
    fullPage: false,
  });

  // Close forgot modal
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const backBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Back to Login"));
    if (backBtn) backBtn.click();
    const xBtn = document.querySelector(".fixed.inset-0 button");
    if (xBtn) xBtn.click();
  });
  await delay(400);

  // 8. Student Registration Modal
  console.log("Opening Student Registration Modal...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const reg = btns.find((b) => b.textContent && b.textContent.includes("Register Here"));
    if (reg) reg.click();
  });
  await delay(600);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase1-register-modal.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
