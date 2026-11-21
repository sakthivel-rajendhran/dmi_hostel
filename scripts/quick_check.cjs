const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('http://127.0.0.1:3000/login');
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
      token: "mock-jwt-student-quick",
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
    localStorage.setItem("dmi_auth_user", JSON.stringify(studentUser));
    localStorage.setItem("dmi_auth_role", "student");
    localStorage.setItem("theme", "light");
  });

  await page.goto('http://127.0.0.1:3000/student/profile');
  await page.waitForSelector('input[name="fatherPhone"]');

  const info = await page.evaluate(() => {
    return {
      title: document.title,
      isDark: document.documentElement.classList.contains('dark'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      fatherName: document.querySelector('input[name="fatherName"]')?.value,
      fatherPhone: document.querySelector('input[name="fatherPhone"]')?.value,
      hasVanilla: document.body.innerHTML.includes('#F6F0DF') || document.body.innerHTML.includes('#f6f0df'),
      hasBlueberry: document.body.innerHTML.includes('#3446A5') || document.body.innerHTML.includes('#3446a5'),
    };
  });

  console.log('STUDENT PROFILE CHECK:', JSON.stringify(info, null, 2));
  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
