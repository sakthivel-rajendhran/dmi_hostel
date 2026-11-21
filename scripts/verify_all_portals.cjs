const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b';

async function run() {
  console.log('Starting verification of all 6 portals with Original Default Light Theme...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const portals = [
    { role: 'student', url: 'http://localhost:3000/student/dashboard', name: 'student_dashboard' },
    { role: 'student', url: 'http://localhost:3000/student/profile', name: 'student_profile' },
    { role: 'student', url: 'http://localhost:3000/student/scan', name: 'student_scan' },
    { role: 'warden', url: 'http://localhost:3000/warden/dashboard', name: 'warden_dashboard' },
    { role: 'staff', url: 'http://localhost:3000/staff/dashboard', name: 'staff_dashboard' },
    { role: 'hod', url: 'http://localhost:3000/hod/dashboard', name: 'hod_dashboard' },
    { role: 'principal', url: 'http://localhost:3000/principal/overview', name: 'principal_overview' },
    { role: 'correspondent', url: 'http://localhost:3000/correspondent/overview', name: 'correspondent_overview' },
  ];

  const results = [];

  for (const p of portals) {
    console.log(`\nTesting ${p.role.toUpperCase()} portal (${p.url})...`);

    // Go to login to set session
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    // Inject session for specific role
    await page.evaluate((role) => {
      const mockUsers = {
        student: { id: "CSE-3-001", studentId: "CSE-3-001", name: "Rahul Kumar", role: "student", dept: "CSE", year: 3 },
        warden: { id: "warden-01", name: "Chief Warden", role: "warden" },
        staff: { id: "staff-01", name: "Staff Advisor", role: "staff", dept: "CSE" },
        hod: { id: "hod-01", name: "Dr. K. Arulmozhi", role: "hod", dept: "CSE" },
        principal: { id: "principal-01", name: "Dr. A. Joseph", role: "principal" },
        correspondent: { id: "corr-01", name: "Rev. Fr. Correspondent", role: "correspondent" },
      };

      const user = mockUsers[role];
      const session = {
        user,
        role,
        token: `mock-jwt-${role}-test`,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
      localStorage.setItem("dmi_auth_user", JSON.stringify(user));
      localStorage.setItem("dmi_auth_role", role);
      localStorage.setItem("theme", "light");
    }, p.role);

    // Navigate to portal
    await page.goto(p.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Verify Theme & Color state
    const check = await page.evaluate(() => {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
      
      // Check for forbidden forced colors #F6F0DF or #3446A5 in inline or computed styles
      const innerHtml = document.body.innerHTML;
      const hasForcedVanilla = innerHtml.includes('#F6F0DF') || innerHtml.includes('#f6f0df');
      const hasForcedBlueberry = innerHtml.includes('#3446A5') || innerHtml.includes('#3446a5');

      return {
        isHtmlDark,
        bodyBg,
        htmlBg,
        hasForcedVanilla,
        hasForcedBlueberry,
      };
    });

    console.log(`- Results for ${p.name}:`, JSON.stringify(check));
    results.push({ portal: p.name, ...check });

    // Capture desktop screenshot
    const ssDesktop = path.join(ARTIFACT_DIR, `portal_${p.name}_desktop.png`);
    await page.screenshot({ path: ssDesktop });

    // If student profile or dashboard, also capture mobile & tablet
    if (p.name === 'student_profile' || p.name === 'warden_dashboard') {
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `portal_${p.name}_tablet.png`) });

      await page.setViewport({ width: 390, height: 844 });
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `portal_${p.name}_mobile.png`) });
    }
  }

  // Check Profile saving under original default light theme
  console.log('\nTesting Student Profile edit & save with restored light theme...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

  // Re-inject student session
  await page.evaluate(() => {
    const studentUser = {
      id: "CSE-3-001",
      studentId: "CSE-3-001",
      name: "Rahul Kumar",
      role: "student",
      phone: "9876543210",
      avatar: "RK",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
      dept: "CSE",
      year: 3,
      regNo: "310622104045",
      roomNo: "304",
      fatherName: "David Kumar",
      fatherPhone: "9876500001",
      motherName: "Mary Kumar",
      motherPhone: "9876500002",
      guardianName: "David Kumar",
      guardianPhone: "9876500001",
    };
    const session = {
      user: studentUser,
      role: "student",
      token: "mock-jwt-student-retest",
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
    localStorage.setItem("dmi_auth_user", JSON.stringify(studentUser));
    localStorage.setItem("dmi_auth_role", "student");
    localStorage.setItem("theme", "light");
  });

  await page.goto('http://localhost:3000/student/profile', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="fatherPhone"]');

  const fPhoneInput = await page.$('input[name="fatherPhone"]');
  await fPhoneInput.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await fPhoneInput.type('9876543211');

  const saveBtn = await page.$('button[type="submit"]');
  await saveBtn.click();
  await new Promise(r => setTimeout(r, 1500));

  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="fatherPhone"]');

  const reloadedPhone = await page.evaluate(() => {
    return document.querySelector('input[name="fatherPhone"]').value;
  });
  console.log(`Persisted Father Phone after save & reload: ${reloadedPhone}`);

  await browser.close();

  // Summary
  console.log('\n=============================================');
  console.log('PORTAL TEST SUMMARY:');
  const allLight = results.every(r => !r.isHtmlDark);
  const noVanilla = results.every(r => !r.hasForcedVanilla);
  const noBlueberry = results.every(r => !r.hasForcedBlueberry);

  console.log(`All Portals strictly Light Theme (no dark class): ${allLight}`);
  console.log(`No Forced Vanilla (#F6F0DF): ${noVanilla}`);
  console.log(`No Forced Blueberry (#3446A5): ${noBlueberry}`);
  console.log(`Profile Edit/Save: ${reloadedPhone === '9876543211' ? 'PASSED' : 'FAILED'}`);
  console.log('=============================================\n');

  if (!allLight || !noVanilla || !noBlueberry || reloadedPhone !== '9876543211') {
    throw new Error('Some verification assertions failed.');
  }
}

run().catch((err) => {
  console.error('Error during portal verification:', err);
  process.exit(1);
});
