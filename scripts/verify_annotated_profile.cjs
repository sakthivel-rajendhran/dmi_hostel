const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";

async function verifyAnnotatedProfile() {
  console.log("=== STARTING ANNOTATED PROFILE & BUTTON ALIGNMENT VERIFICATION ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // 1. Visit Login & Set Auth Session for Student Rahul Kumar
    await page.setViewport({ width: 1366, height: 768 });
    console.log("Navigating to login to set session...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 15000 });

    await page.evaluate(() => {
      const student = {
        id: "CSE-3-001",
        studentId: "CSE-3-001",
        email: "rahul.kumar@dmice.ac.in",
        name: "Rahul Kumar",
        role: "student",
        dept: "CSE",
        year: 3,
        regNo: "310622104045",
        roomNo: "304",
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

    // Navigate to /student/profile
    console.log("Navigating to /student/profile...");
    await page.goto("http://localhost:3000/student/profile", { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Test Viewports:
    const viewports = [
      { name: "mobile_360x800", width: 360, height: 800, filename: "annotated_profile_mobile_360x800.png" },
      { name: "mobile_393x852", width: 393, height: 852, filename: "annotated_profile_mobile_393x852.png" },
      { name: "tablet_768x1024", width: 768, height: 1024, filename: "annotated_profile_tablet_768x1024.png" },
      { name: "desktop_1366x768", width: 1366, height: 768, filename: "annotated_profile_desktop_1366x768.png" },
    ];

    const results = {};

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 800));

      const evaluation = await page.evaluate((vpWidth) => {
        const bodyText = document.body.innerText;
        const scrollWidth = document.documentElement.scrollWidth;
        const hasHorizontalOverflow = scrollWidth > vpWidth + 2;

        // 1. Purple Area: Photo + Circular Ring + 100% Complete indicator
        const photoImg = document.querySelector('img[alt="Rahul Kumar"]');
        const photoCol = photoImg?.closest(".shrink-0");
        const rightCol = photoCol?.parentElement?.querySelector(".flex-1");
        const progressRing = photoCol?.querySelector("svg");
        const completionBadge = photoCol?.querySelector("button");

        const photoBox = photoImg?.getBoundingClientRect();
        const photoColBox = photoCol?.getBoundingClientRect();
        const rightColBox = rightCol?.getBoundingClientRect();

        let isSideBySide = false;
        if (photoColBox && rightColBox) {
          isSideBySide = photoColBox.right <= rightColBox.left + 5 && photoColBox.top < rightColBox.bottom;
        }

        // 2. Red Area: Student Name and Change Photo below photo & badge
        const nameHeading = photoCol?.querySelector("h2");
        const nameBox = nameHeading?.getBoundingClientRect();
        const badgeBox = completionBadge?.getBoundingClientRect();
        let isNameBelowBadge = false;
        if (nameBox && badgeBox) {
          isNameBelowBadge = nameBox.top >= badgeBox.bottom - 4;
        }

        const changePhotoBtn = photoCol?.querySelector('button[aria-label="Change Profile Photo"]');
        const changePhotoBox = changePhotoBtn?.getBoundingClientRect();
        let isChangePhotoBelowName = false;
        if (changePhotoBox && nameBox) {
          isChangePhotoBelowName = changePhotoBox.top >= nameBox.bottom - 4;
        }

        // 3. Green Area: 7 fields in 2 columns
        const gridContainer = rightCol?.querySelector(".grid");
        const gridInputs = gridContainer?.querySelectorAll("input, select");
        const gridLabels = Array.from(gridContainer?.querySelectorAll("label") || []).map(l => l.innerText.trim());

        // Check if student mobile number is full width (col-span-2)
        const phoneInput = rightCol?.querySelector('input[type="tel"]');
        const phoneColSpan2 = phoneInput?.parentElement?.classList.contains("col-span-2");

        // 4. Blue Area: Full-width address below top section
        const topSection = photoCol?.parentElement;
        const addressContainer = topSection?.nextElementSibling;
        const addressTextarea = addressContainer?.querySelector("textarea");
        const topSectionBox = topSection?.getBoundingClientRect();
        const addressBox = addressContainer?.getBoundingClientRect();

        let isAddressBelowTopSection = false;
        let isAddressFullWidth = false;
        if (topSectionBox && addressBox) {
          isAddressBelowTopSection = addressBox.top >= topSectionBox.bottom - 8;
          isAddressFullWidth = addressBox.width >= (topSectionBox.width - 10);
        }

        // 5. Button Alignment: Check Save Button inside bottom bar or anywhere
        const buttons = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Save"));
        let saveButtonAlignment = null;
        if (buttons.length > 0) {
          const btn = buttons[0];
          const btnComputed = window.getComputedStyle(btn);
          const icon = btn.querySelector("svg");
          const textSpan = btn.querySelector("span");
          
          let iconBox = icon?.getBoundingClientRect();
          let spanBox = textSpan?.getBoundingClientRect();
          let isSameLine = false;
          if (iconBox && spanBox) {
            // Check that top/bottom overlap significantly (horizontal line)
            const verticalDiff = Math.abs((iconBox.top + iconBox.height / 2) - (spanBox.top + spanBox.height / 2));
            isSameLine = verticalDiff <= 10 && iconBox.right <= spanBox.left + 15;
          }

          saveButtonAlignment = {
            found: true,
            display: btnComputed.display,
            flexDirection: btnComputed.flexDirection,
            whiteSpace: btnComputed.whiteSpace,
            isSameLine,
          };
        }

        return {
          hasHorizontalOverflow,
          scrollWidth,
          vpWidth,
          purpleArea: {
            hasPhoto: !!photoImg,
            photoWidth: photoBox?.width,
            photoHeight: photoBox?.height,
            hasProgressRing: !!progressRing,
            completionBadgeText: completionBadge?.innerText?.trim(),
          },
          redArea: {
            studentName: nameHeading?.innerText?.trim(),
            nameFontSize: window.getComputedStyle(nameHeading || document.body).fontSize,
            isNameBelowBadge,
            hasChangePhotoBtn: !!changePhotoBtn,
            isChangePhotoBelowName,
          },
          greenArea: {
            isSideBySide,
            fieldsCount: gridInputs?.length,
            labels: gridLabels,
            phoneColSpan2,
          },
          blueArea: {
            hasAddress: !!addressTextarea,
            isAddressBelowTopSection,
            isAddressFullWidth,
            addressWidth: addressBox?.width,
            topSectionWidth: topSectionBox?.width,
          },
          saveButtonAlignment,
        };
      }, vp.width);

      // Save screenshot
      const screenshotPath = path.join(ARTIFACT_DIR, vp.filename);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot: ${vp.filename}`);
      console.log("Evaluation:", JSON.stringify(evaluation, null, 2));

      results[vp.name] = evaluation;
    }

    // Now test /student/scan-qr as well for button alignment & payment style scanner
    console.log("\nNavigating to /student/scan-qr to check button alignment & QR scanner...");
    await page.setViewport({ width: 393, height: 852 });
    await page.goto("http://localhost:3000/student/scan-qr", { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const scanQrEval = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const buttonDetails = buttons.map(b => {
        const icon = b.querySelector("svg");
        const span = b.querySelector("span");
        const iconBox = icon?.getBoundingClientRect();
        const spanBox = span?.getBoundingClientRect();
        let isSameLine = false;
        if (iconBox && spanBox) {
          const verticalDiff = Math.abs((iconBox.top + iconBox.height / 2) - (spanBox.top + spanBox.height / 2));
          isSameLine = verticalDiff <= 10 && iconBox.right <= spanBox.left + 15;
        }
        return {
          text: b.innerText.trim(),
          hasIcon: !!icon,
          isSameLine,
        };
      });

      const qrFrame = document.querySelector(".relative") || document.body;
      return {
        buttonDetails,
        bodyHasScannerText: document.body.innerText.includes("QR") || document.body.innerText.includes("camera") || document.body.innerText.includes("Camera"),
      };
    });

    const qrScreenshotPath = path.join(ARTIFACT_DIR, "annotated_scan_qr_check.png");
    await page.screenshot({ path: qrScreenshotPath, fullPage: false });
    console.log("Scan QR evaluation:", JSON.stringify(scanQrEval, null, 2));

    await browser.close();
    console.log("\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Verification failed:", err);
    await browser.close();
    process.exit(1);
  }
}

verifyAnnotatedProfile();
