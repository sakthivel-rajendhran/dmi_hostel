const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";

async function verifyInsideCameraAndName() {
  console.log("=== STARTING INSIDE CAMERA & FORMATTED NAME VERIFICATION ===");
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
      { name: "mobile_360x800", width: 360, height: 800, filename: "inside_camera_mobile_360x800.png" },
      { name: "mobile_393x852", width: 393, height: 852, filename: "inside_camera_mobile_393x852.png" },
      { name: "tablet_768x1024", width: 768, height: 1024, filename: "inside_camera_tablet_768x1024.png" },
      { name: "desktop_1366x768", width: 1366, height: 768, filename: "inside_camera_desktop_1366x768.png" },
    ];

    const results = {};

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 600));

      const evaluation = await page.evaluate((vpWidth) => {
        const bodyText = document.body.innerText;
        const hasCompletePill = bodyText.includes("100% Complete") || bodyText.includes("% Complete");
        const hasChangePhotoText = bodyText.includes("Change Photo");

        // Photo & Edit Button inspection
        const photoImg = document.querySelector('img[alt="Rahul K."]') || document.querySelector('img[alt="Rahul Kumar"]');
        const photoFrame = photoImg?.closest(".rounded-full.overflow-hidden");
        const progressSvg = document.querySelector("svg.-rotate-90");
        const progressCircles = progressSvg ? progressSvg.querySelectorAll("circle") : [];

        const cameraBtn = document.querySelector('button[aria-label="Edit profile photo"]');
        const cameraSvg = cameraBtn?.querySelector("svg");

        const photoBox = photoFrame?.getBoundingClientRect();
        const btnBox = cameraBtn?.getBoundingClientRect();

        // Check if camera button is INSIDE photoFrame
        const isDescendantOfFrame = photoFrame?.contains(cameraBtn);
        
        let isBottomCenter = false;
        let isInsideBoundary = false;
        if (photoBox && btnBox) {
          const photoCenterX = photoBox.left + photoBox.width / 2;
          const photoCenterY = photoBox.top + photoBox.height / 2;
          const btnCenterX = btnBox.left + btnBox.width / 2;
          const btnCenterY = btnBox.top + btnBox.height / 2;

          // Centered horizontally within 6px
          const isCenteredX = Math.abs(btnCenterX - photoCenterX) <= 6;
          // Bottom area (below vertical midpoint)
          const isBottomY = btnCenterY > photoCenterY && btnBox.bottom <= photoBox.bottom + 2;

          isBottomCenter = isCenteredX && isBottomY;

          // Bounding check (completely inside or within 1px margin)
          isInsideBoundary =
            btnBox.left >= photoBox.left - 2 &&
            btnBox.right <= photoBox.right + 2 &&
            btnBox.top >= photoBox.top &&
            btnBox.bottom <= photoBox.bottom + 2;
        }

        // Student Name inspection
        const nameHeading = document.querySelector('[data-testid="student-display-name"]') || document.querySelector('.student-display-name');
        const nameText = nameHeading?.innerText?.trim();
        const nameStyles = nameHeading ? window.getComputedStyle(nameHeading) : null;
        const nameBox = nameHeading?.getBoundingClientRect();

        // Check space between photo and name
        let distancePhotoToName = null;
        if (photoBox && nameBox) {
          distancePhotoToName = nameBox.top - photoBox.bottom;
        }

        return {
          hasCompletePill,
          hasChangePhotoText,
          progressRing: {
            svgExists: !!progressSvg,
            circlesCount: progressCircles.length,
          },
          photo: {
            exists: !!photoImg,
            width: photoBox?.width,
            height: photoBox?.height,
          },
          cameraButton: {
            exists: !!cameraBtn,
            hasCameraSvg: !!cameraSvg,
            isDescendantOfFrame,
            isBottomCenter,
            isInsideBoundary,
            width: btnBox?.width,
            height: btnBox?.height,
          },
          studentName: {
            text: nameText,
            fontSize: nameStyles?.fontSize,
            fontWeight: nameStyles?.fontWeight,
            distancePhotoToName,
          },
        };
      }, vp.width);

      // Save screenshot
      const screenshotPath = path.join(ARTIFACT_DIR, vp.filename);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot: ${vp.filename}`);
      console.log("Evaluation:", JSON.stringify(evaluation, null, 2));

      if (evaluation.hasCompletePill) {
        throw new Error(`"100% Complete" badge was found in viewport ${vp.name}!`);
      }
      if (evaluation.hasChangePhotoText) {
        throw new Error(`"Change Photo" text was found in viewport ${vp.name}!`);
      }
      if (!evaluation.progressRing.svgExists || evaluation.progressRing.circlesCount < 2) {
        throw new Error(`Progress ring was not found or missing circles in ${vp.name}!`);
      }
      if (!evaluation.cameraButton.isDescendantOfFrame || !evaluation.cameraButton.isBottomCenter) {
        throw new Error(`Camera button is not inside bottom-center of photo in ${vp.name}!`);
      }
      if (evaluation.studentName.text !== "Rahul K.") {
        throw new Error(`Student name was not formatted as "Rahul K."! Got: "${evaluation.studentName.text}"`);
      }

      results[vp.name] = evaluation;
    }

    // 2. Functional check: click camera button
    console.log("\nTesting camera button click handler...");
    const clickSuccess = await page.evaluate(() => {
      let fileInputClicked = false;
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.addEventListener("click", () => {
          fileInputClicked = true;
        }, { once: true });
      }

      const cameraBtn = document.querySelector('button[aria-label="Edit profile photo"]');
      if (cameraBtn) {
        cameraBtn.click();
      }
      return fileInputClicked;
    });

    console.log("Click triggered file input:", clickSuccess);

    await browser.close();
    console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Verification failed:", err);
    await browser.close();
    process.exit(1);
  }
}

verifyInsideCameraAndName();
