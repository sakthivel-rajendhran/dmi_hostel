import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Launching Puppeteer for Vignette & Viewport verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  const viewports = [
    { name: "1440x900", width: 1440, height: 900 },
    { name: "1366x768", width: 1366, height: 768 },
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1024x768", width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
    await delay(600);

    // Measure scrollability
    const scrollMetrics = await page.evaluate(() => {
      const el = document.documentElement;
      const body = document.body;
      const hasVerticalScroll = el.scrollHeight > el.clientHeight || body.scrollHeight > window.innerHeight;
      
      // Check 4 chips visibility
      const chips = Array.from(document.querySelectorAll("div")).filter(d => 
        d.textContent && (
          d.textContent.includes("Apply for Passes") ||
          d.textContent.includes("Get Instant Notifications") ||
          d.textContent.includes("Scan QR for Verification") ||
          d.textContent.includes("Manage Your Profile")
        )
      );

      // Check login card bounds
      const card = document.querySelector("form")?.parentElement;
      let cardFullyVisible = false;
      if (card) {
        const rect = card.getBoundingClientRect();
        cardFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      }

      return {
        windowHeight: window.innerHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        hasVerticalScroll,
        chipsCount: chips.length,
        cardFullyVisible,
      };
    });

    console.log(`- ${vp.name} Scroll Metrics:`, scrollMetrics);

    // Capture screenshot
    if (vp.name === "1440x900") {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "after-desktop-light-1440.png"),
      });

      // Dark mode switch
      const darkToggle = await page.$('button[aria-label="Switch to dark mode"]');
      if (darkToggle) {
        await darkToggle.click();
        await delay(500);
      }
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "after-desktop-dark-1440.png"),
      });

      // Switch back to light
      const lightToggle = await page.$('button[aria-label="Switch to light mode"]');
      if (lightToggle) {
        await lightToggle.click();
        await delay(400);
      }
    } else {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `vignette-${vp.name}-light.png`),
      });
    }
  }

  await browser.close();
  console.log("\nConsole errors:", errors);
  console.log("All viewport tests and screenshots completed successfully!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
