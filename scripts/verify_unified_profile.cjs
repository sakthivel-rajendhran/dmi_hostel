const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";

async function verifySketchRedesign() {
  console.log("=== STARTING SKETCH REDESIGN VERIFICATION ===");
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
      { name: "desktop_1366x768", width: 1366, height: 768, filename: "sketch_profile_desktop_1366x768.png" },
      { name: "tablet_768x1024", width: 768, height: 1024, filename: "sketch_profile_tablet_768x1024.png" },
      { name: "mobile_393x852", width: 393, height: 852, filename: "sketch_profile_mobile_393x852.png" },
      { name: "mobile_360x800", width: 360, height: 800, filename: "sketch_profile_mobile_360x800.png" },
    ];

    const results = {};

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 800));

      const evaluation = await page.evaluate((vpWidth) => {
        const bodyText = document.body.innerText;
        const lowerText = bodyText.toLowerCase();
        const scrollWidth = document.documentElement.scrollWidth;
        const hasHorizontalOverflow = scrollWidth > vpWidth + 2;

        // 1. Photo on Left, Student Info on Right
        const photoImg = document.querySelector('img[alt="Rahul Kumar"]');
        const photoCol = photoImg?.closest(".shrink-0");
        const rightCol = photoCol?.parentElement?.querySelector(".flex-1");

        let isPhotoLeft = false;
        let isSideBySide = false;
        let isNameBelowPhoto = false;

        if (photoCol && rightCol) {
          const pR = photoCol.getBoundingClientRect();
          const rR = rightCol.getBoundingClientRect();
          isPhotoLeft = pR.x < rR.x;
          isSideBySide = Math.abs(pR.y - rR.y) < 40;

          // 2. Student Name below Photo in Left Column
          const nameEl = photoCol.querySelector("h2");
          if (nameEl && photoImg) {
            const nR = nameEl.getBoundingClientRect();
            const imgR = photoImg.getBoundingClientRect();
            isNameBelowPhoto = nR.y > imgR.y;
          }
        }

        // 3. Right Column Fields (Matching sketch)
        const hasYear = lowerText.includes("year");
        const hasDept = lowerText.includes("department");
        const hasMobile = lowerText.includes("student mobile number");
        const hasRoom = lowerText.includes("room number");
        const hasBloodGroup = lowerText.includes("blood group");
        const hasRegNo = lowerText.includes("registration number");
        const hasDOB = lowerText.includes("date of birth");
        const hasAddress = lowerText.includes("address");

        // 4. Parent Details Rows
        const hasParentHeading = lowerText.includes("parent details");
        const hasFatherName = lowerText.includes("father name");
        const hasFatherMobile = lowerText.includes("father mobile number");
        const hasMotherName = lowerText.includes("mother name");
        const hasMotherMobile = lowerText.includes("mother mobile number");

        // 5. Guardian Details Row
        const hasGuardianHeading = lowerText.includes("guardian details (optional)");
        const hasGuardianName = lowerText.includes("guardian name");
        const hasGuardianMobile = lowerText.includes("guardian mobile number");

        // 6. Action Button Label
        const submitBtn = document.querySelector('button[type="submit"]');
        const isButtonLabelSave = submitBtn ? submitBtn.innerText.trim() === "Save" : false;

        // 7. Zero Pencil Icons
        const pencilCount = document.querySelectorAll("svg.lucide-pencil, [data-icon='pencil']").length;

        // 8. One unified form card
        const formCards = document.querySelectorAll("form > div");
        const isOneUnifiedCard = formCards.length === 1;

        return {
          hasHorizontalOverflow,
          scrollWidth,
          isPhotoLeft,
          isSideBySide,
          isNameBelowPhoto,
          hasYear,
          hasDept,
          hasMobile,
          hasRoom,
          hasBloodGroup,
          hasRegNo,
          hasDOB,
          hasAddress,
          hasParentHeading,
          hasFatherName,
          hasFatherMobile,
          hasMotherName,
          hasMotherMobile,
          hasGuardianHeading,
          hasGuardianName,
          hasGuardianMobile,
          isButtonLabelSave,
          pencilCount,
          isOneUnifiedCard,
        };
      }, vp.width);

      results[vp.name] = evaluation;
      console.log(`Results for ${vp.name}:`, JSON.stringify(evaluation, null, 2));

      // Capture screenshot
      const shotPath = path.join(ARTIFACT_DIR, vp.filename);
      await page.screenshot({ path: shotPath, fullPage: true });
      console.log(`Saved screenshot: ${shotPath}`);
    }

    // Test Save and Cancel Interactions
    console.log("\nTesting Save operation and Cancel interaction...");
    await page.setViewport({ width: 1366, height: 768 });

    // Focus input and type to trigger true React onChange
    const phoneInput = await page.$('input[name="phone"]');
    await phoneInput.click();
    await page.keyboard.press("Backspace");
    await page.keyboard.type("5");

    await new Promise((r) => setTimeout(r, 400));

    // Verify Cancel button appears
    const hasCancel = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return Boolean(btns.find((b) => b.innerText.includes("Cancel")));
    });
    console.log("Cancel button visible on dirty:", hasCancel);

    // Test Cancel button resets value
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Cancel"));
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Now test Save button submission
    await phoneInput.click();
    await page.keyboard.press("Backspace");
    await page.keyboard.type("0");
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1200));

    const saveSuccess = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes("Profile saved") || !document.querySelector("button:has-text('Cancel')");
    });
    console.log("Save operation executed successfully:", saveSuccess);

    console.log("\n=== SUMMARY OF ALL VIEWPORT TESTS ===");
    let allPassed = true;
    for (const [vpName, res] of Object.entries(results)) {
      const passed =
        !res.hasHorizontalOverflow &&
        res.isPhotoLeft &&
        res.isSideBySide &&
        res.isNameBelowPhoto &&
        res.hasYear &&
        res.hasDept &&
        res.hasMobile &&
        res.hasRoom &&
        res.hasBloodGroup &&
        res.hasRegNo &&
        res.hasDOB &&
        res.hasAddress &&
        res.hasParentHeading &&
        res.hasFatherName &&
        res.hasFatherMobile &&
        res.hasMotherName &&
        res.hasMotherMobile &&
        res.hasGuardianHeading &&
        res.hasGuardianName &&
        res.hasGuardianMobile &&
        res.isButtonLabelSave &&
        res.pencilCount === 0 &&
        res.isOneUnifiedCard;

      console.log(`${vpName}: ${passed ? "PASSED" : "FAILED"}`);
      if (!passed) allPassed = false;
    }

    if (allPassed && hasCancel && saveSuccess) {
      console.log("\n>>> ALL SKETCH REDESIGN TESTS PASSED WITH 100% SUCCESS! <<<");
    } else {
      console.error("\n>>> SOME TESTS FAILED! <<<");
    }
  } catch (err) {
    console.error("Verification failed with exception:", err);
  } finally {
    await browser.close();
  }
}

verifySketchRedesign();
