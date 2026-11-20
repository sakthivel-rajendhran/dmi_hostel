/**
 * Unit Tests for Phase 2: Student Portal Business Logic & Security
 * Tests QR payload generation, eligibility rules, and profile completeness.
 */

import { buildGateQrPayload, parseGateQr, isGateQrValid } from "../src/lib/utils/gateQr.js";
import { checkEligibility } from "../src/lib/services/passService.js";
import { getProfileCompleteness } from "../src/lib/services/studentService.js";
import { PASS_STATUSES } from "../src/config/status.js";
import { WORKFLOW_CONFIG } from "../src/config/workflow.js";

async function runTests() {
  console.log("==================================================");
  console.log("   DMI COLLEGE HOSTEL PWA - PHASE 2 UNIT TESTS    ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- SUITE 1: GATE QR CODE PROTOCOL ---
  console.log("Suite 1: Digital Gate QR Protocol (buildGateQrPayload & parseGateQrPayload)");

  const gatePayload = buildGateQrPayload("MAIN");
  assert(gatePayload.startsWith("DMIGATE1|"), "Payload starts with protocol prefix DMIGATE1|");
  assert(gatePayload.includes("MAIN"), "Payload contains correct Gate ID");

  const parsed = parseGateQr(gatePayload);
  assert(parsed.isValid === true, "parseGateQr validates authentic payload successfully");
  assert(parsed.gateId === "MAIN", "parseGateQr extracts gateId");

  const tamperedPayload = gatePayload.replace("MAIN", "GATE2");
  const tamperedParsed = parseGateQr(tamperedPayload);
  assert(tamperedParsed.isValid === false, "parseGateQr rejects tampered payload signature mismatch");

  // --- SUITE 2: PROFILE COMPLETENESS GATE ---
  console.log("\nSuite 2: Profile Completeness Gate");

  const rahulProfile = await getProfileCompleteness("CSE-3-001");
  assert(rahulProfile.ok === true, "getProfileCompleteness returns ok for CSE-3-001");
  assert(rahulProfile.data.percentage === 100, "CSE-3-001 profile is 100% complete");
  assert(rahulProfile.data.complete === true, "CSE-3-001 profile complete flag is true");
  assert(rahulProfile.data.missingFields.length === 0, "CSE-3-001 has 0 missing fields");

  const karthikProfile = await getProfileCompleteness("IT-2-004");
  assert(karthikProfile.ok === true, "getProfileCompleteness returns ok for IT-2-004");
  assert(karthikProfile.data.percentage < 100, `IT-2-004 profile is incomplete (${karthikProfile.data.percentage}%)`);
  assert(karthikProfile.data.complete === false, "IT-2-004 profile complete flag is false");
  assert(karthikProfile.data.missingFields.length > 0, "IT-2-004 identifies missing profile fields");

  // --- SUITE 3: PASS ELIGIBILITY RULES ---
  console.log("\nSuite 3: Pass Application Eligibility Rules");

  // Rule 1: Overdue pass blocks new application
  const overdueTest = await checkEligibility({
    studentId: "CSE-3-001", // Has pass 0006 with status OVERDUE
    type: "Local Pass",
    from: "2026-11-20T16:00:00.000Z",
    to: "2026-11-20T19:00:00.000Z",
  });
  assert(overdueTest.data.eligible === false, "Student with overdue pass is blocked from applying");
  assert(overdueTest.data.reasons.some((r) => r.toLowerCase().includes("overdue")), "Overdue reason message is clearly provided");

  // Rule 2: Local pass return after 21:00 (9:00 PM) is rejected
  const today = new Date();
  const lateLocalReturn = new Date(today);
  lateLocalReturn.setHours(21, 30, 0, 0); // 9:30 PM (after 9:00 PM cutoff)
  const exitLocal = new Date(today);
  exitLocal.setHours(16, 0, 0, 0);

  const curfewTest = await checkEligibility({
    studentId: "CSE-1-002",
    type: "Local Pass",
    from: exitLocal.toISOString(),
    to: lateLocalReturn.toISOString(),
  });
  assert(curfewTest.data.eligible === false, "Local pass return after 21:00 cutoff is blocked");
  assert(curfewTest.data.reasons.some((r) => r.includes("9:00 PM")), "Curfew message mentions 9:00 PM requirement");

  // Rule 3: Return time before exit time is rejected
  const invalidTimeOrder = await checkEligibility({
    studentId: "CSE-1-002",
    type: "Local Pass",
    from: "2026-11-20T18:00:00.000Z",
    to: "2026-11-20T16:00:00.000Z",
  });
  assert(invalidTimeOrder.data.eligible === false, "Return time earlier than departure time is blocked");

  // Rule 4: Home pass exceeding 15 days is rejected
  const fromHome = new Date("2026-11-20T10:00:00.000Z");
  const toHome18Days = new Date(fromHome.getTime() + 18 * 86400000); // 18 days (> 15 days)

  const maxDurationTest = await checkEligibility({
    studentId: "CSE-1-002",
    type: "Home Pass",
    from: fromHome.toISOString(),
    to: toHome18Days.toISOString(),
  });
  assert(maxDurationTest.data.eligible === false, "Home pass exceeding maxHomePassDays (15 days) is blocked");
  assert(maxDurationTest.data.reasons.some((r) => r.includes("15 days")), "Rejection explains 15 days limit");

  console.log("\n==================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
