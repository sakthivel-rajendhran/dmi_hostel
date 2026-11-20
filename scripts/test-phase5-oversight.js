/**
 * DMI College Hostel Management PWA - Phase 5 Test Suite
 * Comprehensive automated testing for Principal & Correspondent oversight, read-only guards,
 * date-range aggregations, late/repeat-offender rules, approver modes, letter file validations,
 * and LETTER_REQUIRED workflow enforcement.
 */

import { ROLES } from "../src/config/roles.js";
import { PASS_STATUSES, LETTER_STATUSES } from "../src/config/status.js";
import { WORKFLOW_CONFIG } from "../src/config/workflow.js";
import { setSessionForTesting } from "../src/lib/services/authService.js";
import { passService } from "../src/lib/services/passService.js";
import { studentService } from "../src/lib/services/studentService.js";
import { reportService } from "../src/lib/services/reportService.js";
import { letterService } from "../src/lib/services/letterService.js";
import { settingsService } from "../src/lib/services/settingsService.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("   DMI PWA - PHASE 5 OVERSIGHT & LETTERS TEST SUITE");
  console.log("========================================================\n");

  const principalUser = {
    id: "PRINCIPAL-001",
    name: "Dr. Joseph Lawrence",
    role: ROLES.PRINCIPAL,
    email: "principal.dmi@gmail.com",
    department: "Executive",
  };

  const correspondentUser = {
    id: "CORRESPONDENT-001",
    name: "Rev. Fr. Mary Antony",
    role: ROLES.CORRESPONDENT,
    email: "correspondent.dmi@gmail.com",
    department: "Trust Office",
  };

  const wardenUser = {
    id: "WARDEN-001",
    name: "Dr. John Xavier",
    role: ROLES.WARDEN,
    email: "warden.dmi@gmail.com",
  };

  const studentUser = {
    id: "CSE-3-001",
    studentId: "CSE-3-001",
    name: "Rahul Kumar",
    role: ROLES.STUDENT,
    department: "CSE",
    year: 3,
    floor: "F3",
    roomNo: "304",
  };

  // ==========================================
  // SUITE 1: READ-ONLY GUARDS
  // ==========================================
  console.log("Suite 1: Read-Only Enforcement for Principal and Correspondent");

  // As Principal
  setSessionForTesting(principalUser);

  let res = await passService.approvePass("DMI-PASS-2026-0001");
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal approvePass returns NOT_ALLOWED");

  res = await passService.rejectPass("DMI-PASS-2026-0001");
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal rejectPass returns NOT_ALLOWED");

  res = await passService.recommend({ passId: "DMI-PASS-2026-0001", verdict: "recommend" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal recommend returns NOT_ALLOWED");

  res = await passService.bulkRecommend({ passIds: ["DMI-PASS-2026-0001"] });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal bulkRecommend returns NOT_ALLOWED");

  res = await passService.issueGatePass("DMI-PASS-2026-0001");
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal issueGatePass returns NOT_ALLOWED");

  res = await passService.cancelPass("DMI-PASS-2026-0001");
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal cancelPass returns NOT_ALLOWED");

  res = await passService.applyPass({ studentId: "CSE-3-001", type: "Local Pass", reason: "Test" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal applyPass returns NOT_ALLOWED");

  res = await studentService.createStudent({ name: "New Student" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal studentService.createStudent returns NOT_ALLOWED");

  res = await studentService.updateStudent("CSE-3-001", { phone: "+91 99999 99999" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal studentService.updateStudent returns NOT_ALLOWED");

  res = await studentService.allocateRoom({ studentId: "CSE-3-001", floor: "F3", roomNo: "305" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal studentService.allocateRoom returns NOT_ALLOWED");

  res = await studentService.setHostelVerification({ studentId: "CSE-3-001", status: "verified" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Principal studentService.setHostelVerification returns NOT_ALLOWED");

  // As Correspondent
  setSessionForTesting(correspondentUser);

  res = await passService.approvePass("DMI-PASS-2026-0001");
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Correspondent approvePass returns NOT_ALLOWED");

  res = await studentService.allocateRoom({ studentId: "CSE-3-001", floor: "F3", roomNo: "305" });
  assert(res.ok === false && res.code === "NOT_ALLOWED", "Correspondent studentService.allocateRoom returns NOT_ALLOWED");

  // ==========================================
  // SUITE 2: CAMPUS-WIDE READ SCOPE
  // ==========================================
  console.log("\nSuite 2: Campus-Wide Read Scoping for Institutional Oversight");

  setSessionForTesting(principalUser);
  res = await studentService.getByIdScoped("CSE-3-001");
  assert(res.ok === true && res.data.studentId === "CSE-3-001", "Principal can read CSE students");

  res = await studentService.getByIdScoped("ECE-3-003");
  assert(res.ok === true && res.data.department === "ECE", "Principal can read ECE students campus-wide");

  res = await studentService.getByIdScoped("CIVIL-2-003");
  assert(res.ok === true && res.data.department === "CIVIL", "Principal can read CIVIL students campus-wide");

  // ==========================================
  // SUITE 3: DATE-RANGE AGGREGATIONS & OVERVIEW
  // ==========================================
  console.log("\nSuite 3: Campus Overview Date-Range Aggregations & KPIs");

  const todayOverview = await reportService.campusOverview({ range: "today" });
  assert(todayOverview.ok === true, "campusOverview for 'today' returns success");
  assert(todayOverview.data.kpis.totalHostelStudents.value > 0, "totalHostelStudents KPI exists");
  assert(Array.isArray(todayOverview.data.kpis.totalHostelStudents.sparkline), "Sparkline is array");
  assert(todayOverview.data.movementsByHour.length === 24, "movementsByHour has 24 hours");
  assert(todayOverview.data.floorOccupancy.length === 4, "floorOccupancy has 4 floors");

  const monthOverview = await reportService.campusOverview({ range: "this_month" });
  assert(monthOverview.ok === true, "campusOverview for 'this_month' returns success");
  assert(monthOverview.data.deptComparison.length === 7, "deptComparison covers all 7 departments");
  assert(monthOverview.data.passesStacked.length >= 5, "passesStacked covers month-on-month trend");

  const semesterOverview = await reportService.campusOverview({ range: "this_semester" });
  assert(semesterOverview.ok === true, "campusOverview for 'this_semester' returns success");

  // ==========================================
  // SUITE 4: DEPARTMENT COMPARISON & THRESHOLDS
  // ==========================================
  console.log("\nSuite 4: Department Comparison & Curfew Thresholds");

  const deptComp = await reportService.departmentComparison({ range: "this_month" });
  assert(deptComp.ok === true, "departmentComparison returns success");
  assert(deptComp.data.departments.length === 7, "Comparison table has 7 departments");

  const cseDept = deptComp.data.departments.find((d) => d.code === "CSE");
  assert(Boolean(cseDept), "CSE department present in comparison");
  assert(typeof cseDept.lateReturnRate === "number", "lateReturnRate is numeric");
  assert(typeof cseDept.approvalRate === "number", "approvalRate is numeric");

  const drilldown = await reportService.departmentDrilldown({ dept: "CSE", range: "this_month" });
  assert(drilldown.ok === true, "departmentDrilldown returns success");
  assert(drilldown.data.yearBreakdown.length === 4, "yearBreakdown covers 4 years");
  assert(Array.isArray(drilldown.data.staffActivity), "staffActivity breakdown exists");

  // ==========================================
  // SUITE 5: LATE RETURNS & REPEAT OFFENDERS
  // ==========================================
  console.log("\nSuite 5: Late Returns Audit & Repeat Offenders (>= 2 in 90 Days)");

  const lateSum = await reportService.lateSummary({ range: "this_month" });
  assert(lateSum.ok === true, "lateSummary returns success");
  assert(typeof lateSum.data.overdueNow === "number", "overdueNow count is numeric");
  assert(typeof lateSum.data.repeatOffendersCount === "number", "repeatOffendersCount is numeric");

  const overdueList = await reportService.lateReturnsReport({ filters: { tab: "overdue_now" } });
  assert(overdueList.ok === true, "lateReturnsReport for 'overdue_now' returns success");
  const overdueItems = overdueList.data || [];
  assert(overdueItems.every((p) => p.status === PASS_STATUSES.OVERDUE), "All items in overdue_now tab have OVERDUE status");

  const repeatList = await reportService.lateReturnsReport({ filters: { tab: "repeat_offenders" } });
  assert(repeatList.ok === true, "lateReturnsReport for 'repeat_offenders' returns success");

  // Bucket filter check
  const bucket30 = await reportService.lateReturnsReport({ filters: { tab: "history", bucket: "under_30" } });
  assert(bucket30.ok === true, "Bucket 'under_30' returns success");
  assert(bucket30.data.every((p) => (p.lateMinutes || 30) < 30), "under_30 bucket respects threshold");

  // ==========================================
  // SUITE 6: STUDENT LETTERS MODULE & FILE VALIDATION
  // ==========================================
  console.log("\nSuite 6: Student Letters File Validation Boundaries & Max Size");

  // Enable studentLetters in policy for testing
  settingsService.updatePolicy({
    studentLetters: {
      enabled: true,
      approverMode: "either",
      letterApprovalRequired: true,
      requiredHomeDays: 7,
      maxLetterBytes: 2097152, // 2 MB
      accept: ["application/pdf", "image/jpeg", "image/png"],
      letterTypes: WORKFLOW_CONFIG.studentLetters.letterTypes,
    },
  });

  setSessionForTesting(studentUser);

  // Exact 2 MB boundary test (2,097,152 bytes)
  res = await letterService.submit({
    type: "medical",
    subject: "Valid 2 MB Letter",
    details: "Valid boundary size test details for hospital leave.",
    fileName: "hospital_certificate.pdf",
    fileSize: 2097152, // Exactly 2 MB
    fileType: "application/pdf",
    fileDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==",
  });
  assert(res.ok === true, "File with exactly 2,097,152 bytes (2 MB) is ACCEPTED");

  // 1 byte over 2 MB boundary test (2,097,153 bytes)
  res = await letterService.submit({
    type: "medical",
    subject: "Oversized Letter",
    details: "Boundary violation test details.",
    fileName: "oversized.pdf",
    fileSize: 2097153, // 2 MB + 1 byte
    fileType: "application/pdf",
  });
  assert(res.ok === false && res.code === "LETTER_INVALID_FILE", "File with 2,097,153 bytes (>2 MB) is REJECTED with LETTER_INVALID_FILE");

  // 1.5 MB PDF test
  res = await letterService.submit({
    type: "special_event",
    subject: "Valid 1.5 MB PDF Document",
    details: "Attending state inter-collegiate innovation hackathon.",
    fileName: "hackathon_invite.pdf",
    fileSize: 1572864, // 1.5 MB
    fileType: "application/pdf",
    fileDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==",
  });
  assert(res.ok === true, "1.5 MB PDF file is ACCEPTED");

  // Invalid MIME / GIF test
  res = await letterService.submit({
    type: "special_event",
    subject: "Invalid GIF Document",
    details: "Attempting to upload an animated GIF document.",
    fileName: "letter_scan.gif",
    fileSize: 500000,
    fileType: "image/gif",
  });
  assert(res.ok === false && res.code === "LETTER_INVALID_FILE", "GIF image is REJECTED with LETTER_INVALID_FILE");

  // Subject length test (< 5 chars)
  res = await letterService.submit({
    type: "other",
    subject: "Help",
    details: "Details for test leave application.",
    fileName: "doc.pdf",
    fileSize: 10000,
    fileType: "application/pdf",
  });
  assert(res.ok === false && res.code === "VALIDATION_FAILED", "Subject < 5 chars is REJECTED with VALIDATION_FAILED");

  // ==========================================
  // SUITE 7: APPROVER MODES & EVALUATION
  // ==========================================
  console.log("\nSuite 7: Institutional ApproverMode Evaluation Logic");

  // Test 'either' mode
  let decisions = [{ byRole: ROLES.PRINCIPAL, verdict: "approve" }];
  let status = letterService.evaluateLetterStatus(decisions, "either");
  assert(status === LETTER_STATUSES.APPROVED, "Mode 'either': 1 Principal approval resolves to APPROVED");

  decisions = [{ byRole: ROLES.CORRESPONDENT, verdict: "approve" }];
  status = letterService.evaluateLetterStatus(decisions, "either");
  assert(status === LETTER_STATUSES.APPROVED, "Mode 'either': 1 Correspondent approval resolves to APPROVED");

  decisions = [
    { byRole: ROLES.PRINCIPAL, verdict: "decline" },
    { byRole: ROLES.CORRESPONDENT, verdict: "decline" },
  ];
  status = letterService.evaluateLetterStatus(decisions, "either");
  assert(status === LETTER_STATUSES.DECLINED, "Mode 'either': Both decline resolves to DECLINED");

  // Test 'both' mode
  decisions = [{ byRole: ROLES.PRINCIPAL, verdict: "approve" }];
  status = letterService.evaluateLetterStatus(decisions, "both");
  assert(status === LETTER_STATUSES.SUBMITTED, "Mode 'both': 1 Principal approval remains SUBMITTED (awaiting 2nd signoff)");

  decisions = [
    { byRole: ROLES.PRINCIPAL, verdict: "approve" },
    { byRole: ROLES.CORRESPONDENT, verdict: "approve" },
  ];
  status = letterService.evaluateLetterStatus(decisions, "both");
  assert(status === LETTER_STATUSES.APPROVED, "Mode 'both': Both approvals resolve to APPROVED");

  decisions = [
    { byRole: ROLES.PRINCIPAL, verdict: "approve" },
    { byRole: ROLES.CORRESPONDENT, verdict: "decline" },
  ];
  status = letterService.evaluateLetterStatus(decisions, "both");
  assert(status === LETTER_STATUSES.DECLINED, "Mode 'both': 1 decline resolves to DECLINED");

  // Test 'principal_only' mode
  decisions = [{ byRole: ROLES.PRINCIPAL, verdict: "approve" }];
  status = letterService.evaluateLetterStatus(decisions, "principal_only");
  assert(status === LETTER_STATUSES.APPROVED, "Mode 'principal_only': Principal approval resolves to APPROVED");

  decisions = [{ byRole: ROLES.CORRESPONDENT, verdict: "approve" }];
  status = letterService.evaluateLetterStatus(decisions, "principal_only");
  assert(status === LETTER_STATUSES.SUBMITTED, "Mode 'principal_only': Correspondent decision ignored (remains SUBMITTED)");

  // Test 'correspondent_only' mode
  decisions = [{ byRole: ROLES.CORRESPONDENT, verdict: "approve" }];
  status = letterService.evaluateLetterStatus(decisions, "correspondent_only");
  assert(status === LETTER_STATUSES.APPROVED, "Mode 'correspondent_only': Correspondent approval resolves to APPROVED");

  // ==========================================
  // SUITE 8: LETTER_REQUIRED & PASS APPLICATION/APPROVAL
  // ==========================================
  console.log("\nSuite 8: LETTER_REQUIRED Pass Policy Enforcement");

  setSessionForTesting(studentUser);

  // Home Pass <= 7 days does NOT require letter
  res = await passService.applyPass({
    studentId: "CSE-3-001",
    type: "Home Pass",
    fromTime: "2026-11-20T10:00:00.000Z",
    toTime: "2026-11-24T18:00:00.000Z", // 4 days
    destination: "Home Town",
    reason: "Short family visit",
  });
  assert(res.ok === true, "Home Pass <= 7 days allowed without letter");

  // Home Pass > 7 days WITHOUT letter is BLOCKED
  res = await passService.applyPass({
    studentId: "CSE-3-001",
    type: "Home Pass",
    fromTime: "2026-11-20T10:00:00.000Z",
    toTime: "2026-11-30T18:00:00.000Z", // 10 days
    destination: "Hometown",
    reason: "Long family vacation",
  });
  assert(res.ok === false && res.code === "LETTER_REQUIRED", "Home Pass > 7 days without letter is BLOCKED with LETTER_REQUIRED");

  // Home Pass > 7 days WITH approved letter is ACCEPTED
  res = await passService.applyPass({
    studentId: "CSE-3-001",
    type: "Home Pass",
    fromTime: "2026-11-20T10:00:00.000Z",
    toTime: "2026-11-30T18:00:00.000Z", // 10 days
    destination: "Hometown",
    reason: "Long family vacation",
    letterId: "LTR-2026-0002", // Approved medical letter
  });
  assert(res.ok === true, "Home Pass > 7 days WITH approved letter is ACCEPTED");

  // Warden approvePass enforcement
  setSessionForTesting(wardenUser);

  // Inject a 10-day Home Pass without approved letter
  const { STORAGE_KEYS, getPersistentMock, setPersistentMock } = await import("../src/lib/mock/index.js");
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, []);
  passes.unshift({
    id: "DMI-PASS-LONG-TEST",
    passNumber: "DMI-PASS-LONG-TEST",
    studentId: "CSE-3-001",
    type: "Home Pass",
    departureTime: "2026-11-20T10:00:00.000Z",
    expectedReturnTime: "2026-11-30T18:00:00.000Z", // 10 days
    status: PASS_STATUSES.PENDING,
    letterId: null,
  });
  setPersistentMock(STORAGE_KEYS.PASSES, passes);

  res = await passService.approvePass("DMI-PASS-LONG-TEST");
  assert(res.ok === false && res.code === "LETTER_REQUIRED", "Warden cannot approve extended pass without approved letter (fails with LETTER_REQUIRED)");

  // ==========================================
  // SUITE 9: UNDO DECISION & MUTATIONS
  // ==========================================
  console.log("\nSuite 9: Decision Undo & Rollback Mechanism");

  setSessionForTesting(principalUser);

  // Principal decides on LTR-2026-0004
  res = await letterService.decide({
    letterId: "LTR-2026-0004",
    verdict: "approve",
    note: "Endorsed for testing.",
  });
  assert(res.ok === true && res.data.status === LETTER_STATUSES.APPROVED, "Principal approves LTR-2026-0004");

  // Undo decision
  res = await letterService.undoDecision({ letterId: "LTR-2026-0004" });
  assert(res.ok === true && res.data.status === LETTER_STATUSES.SUBMITTED, "undoDecision reverts letter status back to SUBMITTED");

  // ==========================================
  // SUITE 10: MULTI-SHEET EXPORT PAYLOADS
  // ==========================================
  console.log("\nSuite 10: Multi-Sheet Excel & CSV Export Verification");

  const campusExport = await reportService.exportReport({ type: "campus_summary" });
  assert(campusExport.ok === true, "Campus export returns success");
  assert(campusExport.data.sheets.length === 3, "Campus Excel export has 3 sheets (Summary, Departments, Late Returns)");
  assert(campusExport.data.filename.startsWith("DMI-Campus-Hostel-Report_"), "Filename matches required pattern");

  const securityExport = await reportService.exportReport({ type: "security_log" });
  assert(securityExport.ok === true, "Security log export returns success");
  assert(securityExport.data.filename.startsWith("DMI-Hostel-SecurityLog_"), "Security filename matches required pattern");

  // Reset policy to factory default (letters disabled)
  settingsService.resetPolicy();

  console.log("\n========================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
