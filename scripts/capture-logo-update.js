import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1375, height: 715, deviceScaleFactor: 2 });

  // 1. Light mode login with new logo
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await delay(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "updated-logo-1375x715-light.png") });
  console.log("Captured updated-logo-1375x715-light.png");

  // 2. Dark mode login with new logo
  const darkToggle = await page.$('button[aria-label="Switch to dark mode"]');
  if (darkToggle) {
    await darkToggle.click();
    await delay(500);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "updated-logo-1375x715-dark.png") });
  console.log("Captured updated-logo-1375x715-dark.png");

  // 3. Close up on top left logo
  const headerLogo = await page.$('header .select-none');
  if (headerLogo) {
    await headerLogo.screenshot({ path: path.join(ARTIFACT_DIR, "updated-logo-top-nav-preview.png") });
    console.log("Captured updated-logo-top-nav-preview.png");
  }

  // 4. Close up on card logo
  const cardBadge = await page.$('.short-badge');
  if (cardBadge) {
    await cardBadge.screenshot({ path: path.join(ARTIFACT_DIR, "updated-logo-card-badge-preview.png") });
    console.log("Captured updated-logo-card-badge-preview.png");
  }

  await browser.close();
}

capture().catch(console.error);
