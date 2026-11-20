import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\sakth\\.gemini\\antigravity\\brain\\fd0959b1-bb62-4c6f-94bf-6e855366d42b";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VIEWPORTS = [
  { name: "1375x715 (Primary Bug Viewport)", width: 1375, height: 715, isDesktop: true },
  { name: "1366x650 (Short Laptop Viewport)", width: 1366, height: 650, isDesktop: true },
  { name: "1280x620 (Compact Laptop Viewport)", width: 1280, height: 620, isDesktop: true },
  { name: "1440x700 (MacBook / 125% Scaled)", width: 1440, height: 700, isDesktop: true },
  { name: "1536x730 (1080p 125% Scaling)", width: 1536, height: 730, isDesktop: true },
  { name: "1920x960 (Full HD with Browser UI)", width: 1920, height: 960, isDesktop: true },
  { name: "1024x700 (Tablet Landscape / Min Desktop)", width: 1024, height: 700, isDesktop: true },
  { name: "768x1024 (Tablet Portrait)", width: 768, height: 1024, isDesktop: false },
  { name: "390x844 (Mobile)", width: 390, height: 844, isDesktop: false },
];

function checkIntersection(rect1, rect2) {
  const overlapX = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
  const overlapY = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
  return overlapX * overlapY;
}

async function verify() {
  console.log("Starting automated viewport and non-overlap verification...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} [${vp.width}x${vp.height}]`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
    await delay(500);

    const metrics = await page.evaluate((isDesktop) => {
      const header = document.querySelector("header");
      const h1 = document.querySelector("h1");
      const toggle = document.querySelector('button[aria-label*="mode"]');
      const pwaBadge = document.querySelector('span:has(> svg.lucide-zap)')?.closest('div') || document.querySelector('.lucide-zap')?.closest('div');
      const card = document.querySelector('form')?.closest('.relative.w-full.max-w-\\[490px\\]') || document.querySelector('.short-tight-card') || document.querySelector('form')?.parentElement;
      const chips = Array.from(document.querySelectorAll('.short-chip'));
      const quote = document.querySelector('.font-caveat');

      const headerRect = header ? header.getBoundingClientRect() : null;
      const h1Rect = h1 ? h1.getBoundingClientRect() : null;
      const toggleRect = toggle ? toggle.getBoundingClientRect() : null;
      const pwaRect = pwaBadge ? pwaBadge.getBoundingClientRect() : null;
      const cardRect = card ? card.getBoundingClientRect() : null;
      const chipsRects = chips.map(c => c.getBoundingClientRect());
      const quoteRect = quote ? quote.getBoundingClientRect() : null;

      const docHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const hasVerticalScrollbar = scrollHeight > docHeight + 2;

      return {
        headerRect: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, left: headerRect.left, right: headerRect.right, height: headerRect.height } : null,
        h1Rect: h1Rect ? { top: h1Rect.top, bottom: h1Rect.bottom, left: h1Rect.left, right: h1Rect.right, height: h1Rect.height } : null,
        toggleRect: toggleRect ? { top: toggleRect.top, bottom: toggleRect.bottom, left: toggleRect.left, right: toggleRect.right } : null,
        pwaRect: pwaRect ? { top: pwaRect.top, bottom: pwaRect.bottom, left: pwaRect.left, right: pwaRect.right } : null,
        cardRect: cardRect ? { top: cardRect.top, bottom: cardRect.bottom, left: cardRect.left, right: cardRect.right, height: cardRect.height } : null,
        quoteRect: quoteRect ? { top: quoteRect.top, bottom: quoteRect.bottom, left: quoteRect.left, right: quoteRect.right } : null,
        chipsCount: chips.length,
        hasVerticalScrollbar,
        docHeight,
        scrollHeight,
      };
    }, vp.isDesktop);

    const vpChecks = [];

    // 1. Check Header vs H1
    if (vp.isDesktop && metrics.headerRect && metrics.h1Rect) {
      const headerH1Overlap = checkIntersection(metrics.headerRect, metrics.h1Rect);
      const headerBelow = metrics.h1Rect.top >= metrics.headerRect.bottom - 1;
      vpChecks.push({
        check: "H1 does not render underneath TopBar (Clearance >= 0px)",
        pass: headerH1Overlap === 0 && headerBelow,
        detail: `H1 top: ${metrics.h1Rect.top.toFixed(1)}px, Header bottom: ${metrics.headerRect.bottom.toFixed(1)}px (Gap: ${(metrics.h1Rect.top - metrics.headerRect.bottom).toFixed(1)}px)`,
      });
    }

    // 2. Check Toggle vs Card
    if (vp.isDesktop && metrics.toggleRect && metrics.cardRect) {
      const toggleCardOverlap = checkIntersection(metrics.toggleRect, metrics.cardRect);
      const cardBelowToggle = metrics.cardRect.top >= metrics.toggleRect.bottom - 1;
      vpChecks.push({
        check: "Theme toggle does not overlap Login Card",
        pass: toggleCardOverlap === 0 && cardBelowToggle,
        detail: `Toggle bottom: ${metrics.toggleRect.bottom.toFixed(1)}px, Card top: ${metrics.cardRect.top.toFixed(1)}px (Gap: ${(metrics.cardRect.top - metrics.toggleRect.bottom).toFixed(1)}px)`,
      });
    }

    // 3. Check PWA Badge removed from page
    if (vp.isDesktop) {
      vpChecks.push({
        check: "PWA badge removed from page",
        pass: metrics.pwaRect === null,
        detail: metrics.pwaRect === null ? "PWA badge is completely removed" : "PWA badge still present",
      });
    }

    // 4. Check Card vs Viewport Bottom (No clipping)
    if (vp.isDesktop && metrics.cardRect) {
      const cardFits = metrics.cardRect.bottom <= vp.height + 2;
      vpChecks.push({
        check: "Login Card is fully visible inside viewport (Card bottom <= viewport height)",
        pass: cardFits,
        detail: `Card bottom: ${metrics.cardRect.bottom.toFixed(1)}px, Viewport height: ${vp.height}px (Margin to bottom: ${(vp.height - metrics.cardRect.bottom).toFixed(1)}px)`,
      });
    }

    // 5. Check Desktop Scrollbar
    if (vp.isDesktop) {
      vpChecks.push({
        check: "No desktop vertical scrollbar (scrollHeight <= clientHeight)",
        pass: !metrics.hasVerticalScrollbar,
        detail: `ScrollHeight: ${metrics.scrollHeight}px, ClientHeight: ${metrics.docHeight}px`,
      });
    }

    // Log results for this viewport
    let allPassed = true;
    for (const c of vpChecks) {
      console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.check}: ${c.detail}`);
      if (!c.pass) allPassed = false;
    }

    results.push({ viewport: vp.name, allPassed, checks: vpChecks });
  }

  // Now capture high-res screenshots at 1375x715
  console.log("\nCapturing updated screenshots at 1375x715 (Light & Dark mode, Modals)...");
  await page.setViewport({ width: 1375, height: 715, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await delay(600);

  const lightPath = path.join(ARTIFACT_DIR, "pwa-removed-enlarged-logo-1375x715-light.png");
  await page.screenshot({ path: lightPath });
  console.log(`Saved: ${lightPath}`);

  // Badge close-up
  const badge = await page.$('.short-badge');
  if (badge) {
    await badge.screenshot({ path: path.join(ARTIFACT_DIR, "enlarged-circular-logo-badge.png") });
    console.log("Saved enlarged-circular-logo-badge.png");
  }

  // Open registration modal
  const regBtn = await page.$('button:has(strong)');
  if (regBtn) {
    await regBtn.click();
    await delay(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "registration-modal-circular-logo.png") });
    console.log("Saved registration-modal-circular-logo.png");
    const closeBtn = await page.$('button:has(svg.lucide-x)');
    if (closeBtn) await closeBtn.click();
    await delay(400);
  }

  // Switch to dark mode
  const darkToggle = await page.$('button[aria-label="Switch to dark mode"]');
  if (darkToggle) {
    await darkToggle.click();
    await delay(500);
  }

  const darkPath = path.join(ARTIFACT_DIR, "pwa-removed-enlarged-logo-1375x715-dark.png");
  await page.screenshot({ path: darkPath });
  console.log(`Saved: ${darkPath}`);

  await browser.close();

  const totalChecks = results.reduce((acc, r) => acc + r.checks.length, 0);
  const passedChecks = results.reduce((acc, r) => acc + r.checks.filter(c => c.pass).length, 0);

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} checks passed!`);
  console.log(`========================================`);

  // Write verification JSON report for review
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "layout-verification-results.json"),
    JSON.stringify(results, null, 2)
  );
}

verify().catch(console.error);
