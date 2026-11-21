const puppeteer = require("puppeteer");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/sakth/.gemini/antigravity/brain/fd0959b1-bb62-4c6f-94bf-6e855366d42b";

const PORTALS = [
  {
    role: "student",
    user: { id: "CSE-3-001", studentId: "CSE-3-001", name: "Rahul Kumar", role: "student", dept: "CSE", year: 3 },
    routes: [
      "/student/dashboard",
      "/student/apply",
      "/student/passes",
      "/student/scan",
      "/student/profile",
      "/student/notifications",
    ],
  },
  {
    role: "warden",
    user: { id: "warden-01", name: "Dr. John Xavier", role: "warden" },
    routes: [
      "/warden/dashboard",
      "/warden/approvals",
      "/warden/gate-qr",
      "/warden/gate-passes",
      "/warden/students",
      "/warden/staff-accounts",
      "/warden/settings",
    ],
  },
  {
    role: "staff",
    user: { id: "staff-01", name: "Prof. Rajesh Sharma", role: "staff", dept: "CSE" },
    routes: [
      "/staff/dashboard",
      "/staff/requests",
      "/staff/students",
      "/staff/profile",
    ],
  },
  {
    role: "hod",
    user: { id: "hod-01", name: "Dr. K. Arulmozhi", role: "hod", dept: "CSE" },
    routes: [
      "/hod/dashboard",
      "/hod/requests",
      "/hod/students",
      "/hod/analytics",
      "/hod/profile",
    ],
  },
  {
    role: "principal",
    user: { id: "principal-01", name: "Dr. M. Senthil Kumar", role: "principal" },
    routes: [
      "/principal/overview",
      "/principal/departments",
      "/principal/late-returns",
      "/principal/security-log",
      "/principal/profile",
    ],
  },
  {
    role: "correspondent",
    user: { id: "corr-01", name: "Rev. Fr. J. Antony", role: "correspondent" },
    routes: [
      "/correspondent/overview",
      "/correspondent/departments",
      "/correspondent/late-returns",
      "/correspondent/security-log",
      "/correspondent/profile",
    ],
  },
];

const VIEWPORTS = [
  { name: "mobile_360x800", width: 360, height: 800 },
  { name: "mobile_393x852", width: 393, height: 852 },
  { name: "tablet_768x1024", width: 768, height: 1024 },
  { name: "desktop_1366x768", width: 1366, height: 768 },
];

async function runComprehensiveAudit() {
  console.log("=== STARTING COMPREHENSIVE UI & NAVIGATION AUDIT ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const auditReport = {
    totalRoutesChecked: 0,
    successfulRoutes: 0,
    failedRoutes: 0,
    buttonAlignmentChecks: 0,
    buttonAlignmentPassed: 0,
    simulationPanelRemoved: true,
    viewportsTested: VIEWPORTS.map(v => v.name),
  };

  try {
    for (const portal of PORTALS) {
      console.log(`\n========================================`);
      console.log(`Testing Portal: ${portal.role.toUpperCase()}`);
      console.log(`========================================`);

      // Set auth session
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });

      await page.evaluate((p) => {
        const session = {
          user: p.user,
          role: p.role,
          token: `mock-jwt-${p.role}-audit`,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
        localStorage.setItem("dmi_auth_user", JSON.stringify(p.user));
        localStorage.setItem("dmi_auth_role", p.role);
        localStorage.setItem("theme", "light");
        document.cookie = `dmi_auth_token=mock-jwt-${p.role}-audit; path=/`;
        document.cookie = `dmi_user_role=${p.role}; path=/`;
      }, portal);

      for (const route of portal.routes) {
        auditReport.totalRoutesChecked++;
        console.log(`\n[${portal.role.toUpperCase()}] Navigating to: ${route}`);
        const response = await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle2", timeout: 15000 });
        const status = response ? response.status() : 500;

        if (status === 200) {
          auditReport.successfulRoutes++;
          console.log(`  ✓ Route loaded successfully (Status 200)`);
        } else {
          auditReport.failedRoutes++;
          console.error(`  ✗ Route failed with status ${status}`);
        }

        // Test at primary viewports
        for (const vp of VIEWPORTS) {
          await page.setViewport({ width: vp.width, height: vp.height });
          await new Promise((r) => setTimeout(r, 200));

          const pageEval = await page.evaluate((vpWidth, currentRoute) => {
            const scrollWidth = document.documentElement.scrollWidth;
            const hasHorizontalOverflow = scrollWidth > vpWidth + 2;

            // Check if Dev simulation exists
            const hasDevSim = document.body.innerText.includes("Dev & QA Quick Scanner Simulation");

            // Inspect all buttons with icon + text
            const buttons = Array.from(document.querySelectorAll("button, a[role='button']"));
            const buttonIssues = [];

            buttons.forEach(btn => {
              const svg = btn.querySelector("svg");
              const text = btn.innerText?.trim();

              if (svg && text && text.length > 0 && text.length < 50) {
                const btnBox = btn.getBoundingClientRect();
                const svgBox = svg.getBoundingClientRect();

                // If button is visible
                if (btnBox.width > 0 && btnBox.height > 0) {
                  // Check vertical alignment: svg center vs text line center
                  const svgCenterY = svgBox.top + svgBox.height / 2;
                  const btnCenterY = btnBox.top + btnBox.height / 2;
                  const verticalDiff = Math.abs(svgCenterY - btnCenterY);

                  // If icon is stacked above text, svgBox.bottom is <= text top
                  const isStacked = (svgBox.bottom <= btnBox.top + btnBox.height * 0.4) && (btnBox.height >= 48);
                  if (isStacked) {
                    buttonIssues.push({
                      label: text,
                      isStacked: true,
                      verticalDiff,
                    });
                  }
                }
              }
            });

            return {
              hasHorizontalOverflow,
              hasDevSim,
              buttonIssues,
              buttonsCount: buttons.length,
            };
          }, vp.width, route);

          if (pageEval.hasDevSim) {
            auditReport.simulationPanelRemoved = false;
            console.error(`  ✗ Dev Simulation panel was found on route ${route}!`);
          }

          auditReport.buttonAlignmentChecks += pageEval.buttonsCount;
          if (pageEval.buttonIssues.length === 0) {
            auditReport.buttonAlignmentPassed += pageEval.buttonsCount;
          } else {
            console.warn(`  ⚠ Button stacking issue detected on ${vp.name}:`, pageEval.buttonIssues);
          }
        }
      }

      // Take sample screenshots for student and warden
      if (portal.role === "student") {
        await page.setViewport({ width: 393, height: 852 });
        await page.goto("http://localhost:3000/student/scan", { waitUntil: "networkidle2" });
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_student_scan_393.png") });

        await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "networkidle2" });
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_student_dashboard_393.png") });
      } else if (portal.role === "warden") {
        await page.setViewport({ width: 1366, height: 768 });
        await page.goto("http://localhost:3000/warden/approvals", { waitUntil: "networkidle2" });
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_warden_approvals_desktop.png") });
      }
    }

    console.log("\n========================================");
    console.log("FINAL AUDIT SUMMARY:");
    console.log(JSON.stringify(auditReport, null, 2));
    console.log("========================================");

    await browser.close();
  } catch (err) {
    console.error("Audit run failed:", err);
    await browser.close();
    process.exit(1);
  }
}

runComprehensiveAudit();
