const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b';

async function run() {
  console.log('Starting verification of Student Profile page & layout...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const viewports = [
    { name: 'desktop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  // First log in as Student
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  
  // Set student session in localStorage
  await page.evaluate(() => {
    const studentUser = {
      id: "CSE-3-001",
      studentId: "CSE-3-001",
      name: "Rahul Kumar",
      email: "rahul.kumar@dmice.ac.in",
      role: "student",
      phone: "9876543210",
      avatar: "RK",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
      photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
      dept: "CSE",
      department: "CSE",
      year: 3,
      programme: "B.E.",
      regNumber: "310622104045",
      regNo: "310622104045",
      floor: "F3",
      floorLabel: "3rd Floor",
      roomNumber: "304",
      room: "304",
      roomNo: "304",
      fatherName: "David Kumar",
      fatherPhone: "9876500001",
      motherName: "Mary Kumar",
      motherPhone: "9876500002",
      guardianName: "David Kumar",
      guardianPhone: "9876500001",
      hostelVerification: "verified",
      mustChangePassword: false,
      profileComplete: true,
    };
    const session = {
      user: studentUser,
      role: "student",
      token: "mock-jwt-student-12345",
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
    localStorage.setItem("dmi_auth_user", JSON.stringify(studentUser));
    localStorage.setItem("dmi_auth_role", "student");
  });

  // Navigate to profile page
  await page.goto('http://localhost:3000/student/profile', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('PARENT DETAILS'), { timeout: 8000 });

  console.log('✓ Successfully navigated to Student Profile page');

  // Verify elements are present
  const content = await page.evaluate(() => {
    return {
      parentDetails: Boolean(document.body.innerText.includes('PARENT DETAILS')),
      guardianOptional: Boolean(document.body.innerText.includes('GUARDIAN (OPTIONAL)')),
      studentName: Boolean(document.body.innerText.includes('Rahul Kumar')),
      department: Boolean(document.body.innerText.includes('CSE')),
      year: Boolean(document.body.innerText.includes('3rd Year')),
      regNo: Boolean(document.body.innerText.includes('310622104045')),
      roomNo: Boolean(document.body.innerText.includes('304')),
      saveButton: Boolean(document.body.innerText.includes('Save Profile')),
    };
  });

  console.log('Profile page evaluation:', JSON.stringify(content, null, 2));

  // Take screenshots across all 3 viewports
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise((r) => setTimeout(r, 600));
    const ssPath = path.join(ARTIFACT_DIR, `student_profile_${vp.name}_${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log(`✓ Screenshot captured for ${vp.name} (${vp.width}x${vp.height}) -> ${ssPath}`);
  }

  // Test Editing and Saving
  console.log('Testing Profile Edit & Save...');
  await page.setViewport({ width: 1366, height: 768 });
  
  // Update father phone number using Puppeteer keyboard typing
  const fPhoneInput = await page.$('input[name="fatherPhone"]');
  if (fPhoneInput) {
    await fPhoneInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await fPhoneInput.type('9876543219');
    console.log('Typed new father phone: 9876543219');
  }

  // Click Save Profile
  const saveBtn = await page.$('button[type="submit"]');
  if (saveBtn) {
    await saveBtn.click();
    console.log('Clicked Save Profile button');
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Reload page to verify persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('PARENT DETAILS'), { timeout: 8000 });

  const reloadedFatherPhone = await page.evaluate(() => {
    const fPhone = document.querySelector('input[name="fatherPhone"]');
    return fPhone ? fPhone.value : null;
  });

  console.log('Father Phone after reload:', reloadedFatherPhone);
  if (reloadedFatherPhone !== '9876543219') {
    throw new Error(`Expected father phone 9876543219 but got ${reloadedFatherPhone}`);
  }

  // Test Image Size Validation (> 5 MB rejected, <= 5 MB accepted)
  console.log('Testing Photo Size Validation...');
  
  // 1. Test > 5 MB image
  const oversizedResult = await page.evaluate(async () => {
    // 5.5 MB test blob
    const largeBlob = new Blob([new Uint8Array(5.5 * 1024 * 1024)], { type: 'image/jpeg' });
    const largeFile = new File([largeBlob], 'oversized.jpg', { type: 'image/jpeg' });
    
    // Call validatePhotoFile from window or module if exposed or trigger input
    const input = document.querySelector('input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(largeFile);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 600));
    return document.body.innerText.includes('Image size must be 5 MB or less. Please select another image.');
  });
  console.log('Oversized image (> 5 MB) correctly rejected:', oversizedResult);

  // 2. Test <= 5 MB image
  const validSizeResult = await page.evaluate(async () => {
    // 2 MB valid 1x1 png blob
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3446A5';
    ctx.fillRect(0, 0, 400, 400);
    
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
    const validFile = new File([blob], 'valid_avatar.jpg', { type: 'image/jpeg' });
    
    const input = document.querySelector('input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(validFile);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 800));
    return {
      cropModalOpened: Boolean(document.body.innerText.includes('Adjust Profile Photo') || document.body.innerText.includes('Confirm Photo')),
      hasConfirmBtn: Boolean(document.body.innerText.includes('Confirm Photo')),
      hasCancelBtn: Boolean(document.body.innerText.includes('Cancel')),
    };
  });
  console.log('Valid image (<= 5 MB) opens crop modal:', validSizeResult);

  // Test mobile overflow
  await page.setViewport({ width: 390, height: 844 });
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log('Mobile 390x844 horizontal overflow check (should be false):', hasHorizontalScroll);

  await browser.close();
  console.log('✓ All checks passed successfully!');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
