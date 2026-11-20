import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1375, height: 715, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await delay(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "before-defect-1375x715-light.png") });

  const darkToggle = await page.$('button[aria-label="Switch to dark mode"]');
  if (darkToggle) {
    await darkToggle.click();
    await delay(500);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "before-defect-1375x715-dark.png") });
  await browser.close();
  console.log("Captured before defect screenshots at 1375x715");
}
capture().catch(console.error);
