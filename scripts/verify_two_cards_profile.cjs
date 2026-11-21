const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b');

async function verifyProfile() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Visit Login & Set Auth Session for Student Rahul Kumar
  console.log('Setting auth session...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 15000 });

  await page.evaluate(() => {
    const student = {
      id: 'CSE-3-001',
      studentId: 'CSE-3-001',
      email: 'rahul.kumar@dmice.ac.in',
      name: 'Rahul Kumar',
      role: 'student',
      dept: 'CSE',
      year: 3,
      regNo: '310622104045',
      roomNo: '304',
      phone: '9876543210',
      address: 'No. 42, Anna Nagar,\nChennai - 600040',
      bloodGroup: 'O+ve',
      dob: '2004-05-14',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001',
      photoDataUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001',
      fatherName: 'David Kumar',
      fatherPhone: '9876500001',
      motherName: 'Mary Kumar',
      motherPhone: '9876500002',
      guardianName: 'David Kumar',
      guardianPhone: '9876500001'
    };
    const session = {
      user: student,
      role: 'student',
      token: 'mock-jwt-student-CSE-3-001',
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem('dmi_auth_session_v2', JSON.stringify(session));
    localStorage.setItem('dmi_auth_user', JSON.stringify(student));
    localStorage.setItem('dmi_auth_role', 'student');
    localStorage.setItem('theme', 'light');
    document.cookie = 'dmi_auth_token=mock-jwt-student-CSE-3-001; path=/';
    document.cookie = 'dmi_user_role=student; path=/';
  });

  const viewports = [
    { name: 'desktop_1280x665', width: 1280, height: 665 },
    { name: 'desktop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_393x852', width: 393, height: 852 },
    { name: 'mobile_360x800', width: 360, height: 800 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/student/profile', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('h2[data-testid="student-display-name"]', { timeout: 10000 });

    // Verify displayName
    const displayName = await page.$eval('h2[data-testid="student-display-name"]', el => el.textContent.trim());
    console.log(`[${vp.name}] Display Name: ${displayName}`);

    // Verify no text input boxes in static mode
    const textInputsCount = await page.$$eval('input[type="text"]:not([hidden]), input[type="tel"]:not([hidden]), textarea:not([hidden])', els => els.length);
    console.log(`[${vp.name}] Input boxes in static view: ${textInputsCount} (expected 0)`);

    // Check overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`[${vp.name}] Horizontal scrollbar / overflow: ${hasOverflow}`);

    // Capture screenshot
    const shotPath = path.join(ARTIFACT_DIR, `profile_large_photo_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Captured screenshot: ${shotPath}`);
  }

  // Test Edit Mode on desktop_1280x665
  await page.setViewport({ width: 1280, height: 665 });
  await page.goto('http://localhost:3000/student/profile', { waitUntil: 'networkidle0', timeout: 15000 });
  const editButton = await page.$('button[aria-label="Edit Student Profile"]');
  if (editButton) {
    console.log('Clicking Edit Student Profile button...');
    await editButton.click();
    await new Promise(r => setTimeout(r, 600));

    const editShotPath = path.join(ARTIFACT_DIR, 'profile_large_photo_editing_1280x665.png');
    await page.screenshot({ path: editShotPath, fullPage: true });
    console.log(`Captured edit mode screenshot: ${editShotPath}`);
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

verifyProfile().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
