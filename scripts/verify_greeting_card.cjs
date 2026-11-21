const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b';

async function run() {
  console.log('--- Starting Student Greeting Card Verification ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper to login as student
  async function loginAsStudent() {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const student = {
        id: "CSE-3-001",
        studentId: "CSE-3-001",
        email: "rahul.kumar@dmice.ac.in",
        name: "Rahul Kumar",
        role: "student",
        dept: "CSE",
        department: "CSE",
        year: 3,
        regNo: "310622104045",
        roomNo: "304",
        floorLabel: "3rd Floor",
      };
      const session = {
        user: student,
        role: "student",
        token: "mock-jwt-student-CSE-3-001",
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
      localStorage.setItem("dmi_auth_user", JSON.stringify(student));
      localStorage.setItem("dmi_auth_role", "student");
      localStorage.setItem("theme", "light");
      document.cookie = "dmi_auth_token=mock-jwt-student-CSE-3-001; path=/";
      document.cookie = "dmi_user_role=student; path=/";
    });
  }

  await loginAsStudent();

  // 1. Test All 4 Time Periods
  const periods = [
    { id: 'morning', expected: 'Good Morning' },
    { id: 'afternoon', expected: 'Good Afternoon' },
    { id: 'evening', expected: 'Good Evening' },
    { id: 'night', expected: 'Good Night' }
  ];

  console.log('\n--- Testing Dynamic Time-Based Greetings ---');
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });

  for (const period of periods) {
    await page.goto(`http://localhost:3000/student/dashboard?timePeriod=${period.id}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="student-greeting-card"]', { timeout: 10000 });

    const cardInfo = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="student-greeting-card"]');
      const heading = document.querySelector('[data-testid="greeting-heading"]');
      const name = document.querySelector('[data-testid="student-name"]');
      const details = document.querySelector('[data-testid="student-details-line"]');
      const statusBadge = document.querySelector('[data-testid="student-status-badge"]');
      const avatarInCard = card ? card.querySelector('a[aria-label="View student profile"]') : null;
      const avatarInNav = document.querySelector('header a[href="/student/profile"], header [data-testid="user-avatar"], header button');

      const headingStyle = heading ? window.getComputedStyle(heading) : null;
      const nameStyle = name ? window.getComputedStyle(name) : null;
      const cardRect = card ? card.getBoundingClientRect() : null;

      return {
        exists: !!card,
        cardHeight: cardRect ? Math.round(cardRect.height) : null,
        period: card ? card.getAttribute('data-period') : null,
        greetingText: heading ? heading.innerText.trim() : null,
        headingFont: headingStyle ? headingStyle.fontFamily : null,
        headingFontSize: headingStyle ? headingStyle.fontSize : null,
        nameText: name ? name.innerText.trim() : null,
        nameFont: nameStyle ? nameStyle.fontFamily : null,
        nameFontSize: nameStyle ? nameStyle.fontSize : null,
        hasDetailsLine: !!details,
        detailsText: details ? details.innerText.trim() : null,
        statusText: statusBadge ? statusBadge.innerText.trim() : null,
        hasAvatarInCard: !!avatarInCard,
        hasAvatarInNav: !!avatarInNav,
      };
    });

    console.log(`[Period: ${period.id.toUpperCase()}]`);
    console.log(` - Greeting: "${cardInfo.greetingText}" (expected: "${period.expected}")`);
    console.log(` - Card Height: ${cardInfo.cardHeight}px`);
    console.log(` - Heading Font: ${cardInfo.headingFont} | Size: ${cardInfo.headingFontSize}`);
    console.log(` - Student Name: "${cardInfo.nameText}" | Size: ${cardInfo.nameFontSize}`);
    console.log(` - Academic Details Line: ${cardInfo.hasDetailsLine ? 'PRESENT' : 'REMOVED (PASS)'}`);
    console.log(` - Status: "${cardInfo.statusText}"`);
    console.log(` - Avatar inside card: ${cardInfo.hasAvatarInCard ? 'FOUND (FAIL)' : 'REMOVED (PASS)'}`);
    console.log(` - Avatar in Navbar: ${cardInfo.hasAvatarInNav ? 'PRESERVED (PASS)' : 'NOT FOUND'}`);

    const screenshotPath = path.join(ARTIFACTS_DIR, `greeting_card_${period.id}.png`);
    const cardHandle = await page.$('[data-testid="student-greeting-card"]');
    if (cardHandle) {
      await cardHandle.screenshot({ path: screenshotPath });
      console.log(` - Saved card screenshot: greeting_card_${period.id}.png`);
    }
  }

  // 2. Test Responsive Layouts across 4 Viewports
  const viewports = [
    { name: 'mobile_360x800', width: 360, height: 800 },
    { name: 'mobile_393x852', width: 393, height: 852 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'desktop_1366x768', width: 1366, height: 768 }
  ];

  console.log('\n--- Testing Responsive Viewports & Overflow ---');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.width < 768 ? 2 : 1 });
    await page.goto('http://localhost:3000/student/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="student-greeting-card"]');

    const metrics = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="student-greeting-card"]');
      const rect = card.getBoundingClientRect();
      const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;
      return {
        cardWidth: Math.round(rect.width),
        cardHeight: Math.round(rect.height),
        hasOverflow,
        scrollWidth: document.documentElement.scrollWidth,
        windowWidth: window.innerWidth
      };
    });

    console.log(`[Viewport: ${vp.name}] Card size: ${metrics.cardWidth}x${metrics.cardHeight}px | Overflow: ${metrics.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);

    const screenshotPath = path.join(ARTIFACTS_DIR, `greeting_card_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(` - Saved full viewport screenshot: greeting_card_${vp.name}.png`);
  }

  await browser.close();
  console.log('\n--- Verification completed successfully ---');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
