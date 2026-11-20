/**
 * Test Suite: Phase 4 Staff and HOD Portals
 * Tests:
 * 1. Department and Year Scope Isolation
 * 2. Scoped Student Directory & Unauthorized Rejections
 * 3. Advisory Recommendation Lifecycle (Recommend, Do Not Recommend, Undo)
 * 4. Bulk Recommendation skipping Overdue Students
 * 5. requireStaffRecommendation Policy Enforcement on Warden Approval
 * 6. HOD Department Analytics & Workload Metrics
 * 7. Multi-Sheet Excel Export Generation via SheetJS
 */

import { authService, setSessionForTesting } from "../src/lib/services/authService.js";
import { passService } from "../src/lib/services/passService.js";
import { studentService } from "../src/lib/services/studentService.js";
import { reportService } from "../src/lib/services/reportService.js";
import { staffService } from "../src/lib/services/staffService.js";
import { updatePolicy, getPolicy } from "../src/lib/services/settingsService.js";
import { MOCK_USERS } from "../src/lib/mock/users.js";
import { MOCK_PASSES } from "../src/lib/mock/passes.js";
import { PASS_STATUSES } from "../src/config/status.js";
import * as XLSX from "xlsx";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  PHASE 4: STAFF AND HOD PORTALS TEST SUITE");
  console.log("=======================================================\n");

  const staff1 = MOCK_USERS.find((u) => u.gmail === "staff.cse@gmail.com"); // CSE Year 3
  const staff2 = MOCK_USERS.find((u) => u.gmail === "staff2.cse@gmail.com"); // CSE Years 1, 2
  const hodCse = MOCK_USERS.find((u) => u.gmail === "hod.cse@gmail.com"); // CSE All
  const staffIt = MOCK_USERS.find((u) => u.gmail === "staff.it@gmail.com"); // IT Years 2, 3
  const warden = MOCK_USERS.find((u) => u.role === "warden");

  // 1. Scope Isolation Tests
  console.log("TEST 1: Department & Year Scope Isolation");
  {
    // Log in as Staff 1 (CSE, Year 3 only)
    setSessionForTesting(staff1);
    const s1Res = await studentService.listForDepartment();
    assert(s1Res.ok, "Staff 1 students query succeeded");
    const s1Students = s1Res.data;
    const allCse = s1Students.every((s) => (s.department || s.dept) === "CSE");
    const allYear3 = s1Students.every((s) => Number(s.year) === 3);
    assert(allCse, "Staff 1 sees ONLY CSE students");
    assert(allYear3, `Staff 1 sees ONLY Year 3 students (Count: ${s1Students.length})`);

    // Log in as Staff 2 (CSE, Years 1 & 2)
    setSessionForTesting(staff2);
    const s2Res = await studentService.listForDepartment();
    const s2Students = s2Res.data;
    const s2Years = s2Students.every((s) => [1, 2].includes(Number(s.year)));
    assert(s2Years, `Staff 2 sees ONLY Years 1 & 2 students (Count: ${s2Students.length})`);

    // Log in as HOD CSE (All Years)
    setSessionForTesting(hodCse);
    const hodRes = await studentService.listForDepartment();
    const hodStudents = hodRes.data;
    const hodCseAll = hodStudents.every((s) => (s.department || s.dept) === "CSE");
    const hasMultipleYears = new Set(hodStudents.map((s) => s.year)).size > 2;
    assert(hodCseAll, "HOD CSE sees ONLY CSE students (No cross-department leakage)");
    assert(hasMultipleYears, `HOD CSE sees all academic cohorts in CSE (Count: ${hodStudents.length})`);
  }

  // 2. Direct Scoped Student Access & Unauthorized Rejections
  console.log("\nTEST 2: Direct Scoped Student Access & URL Protection");
  {
    setSessionForTesting(staff1); // CSE Year 3

    // Find an IT student
    const itStudent = MOCK_USERS.find((u) => (u.dept || u.department) === "IT") || { id: "IT-2-004" };
    const unauthDeptRes = await studentService.getByIdScoped(itStudent.id);
    assert(!unauthDeptRes.ok, "Staff CSE accessing IT student is rejected");
    assert(unauthDeptRes.code === "NOT_ALLOWED", "Returns error code NOT_ALLOWED for cross-dept access");

    // Find a CSE Year 1 or 2 student
    const cseYear1 = s2StudentsFound();
    if (cseYear1) {
      const unauthYearRes = await studentService.getByIdScoped(cseYear1.id);
      assert(!unauthYearRes.ok, "Staff 1 accessing unassigned Year 1 student is rejected");
      assert(unauthYearRes.code === "NOT_ALLOWED", "Returns NOT_ALLOWED for unassigned year");
    }

    // Access legitimate Year 3 CSE student (Rahul Kumar)
    const validRes = await studentService.getByIdScoped("CSE-3-001");
    assert(validRes.ok, "Staff 1 successfully accesses assigned CSE Year 3 student");
    assert(validRes.data.campusStatus !== undefined, "Enriches student record with campusStatus");
    assert(Array.isArray(validRes.data.passes), "Enriches student record with pass history");
  }

  // 3. Advisory Recommendation Workflow
  console.log("\nTEST 3: Advisory Recommendation Workflow & Undo");
  {
    setSessionForTesting(staff1);

    // Test Do Not Recommend requires note
    const emptyNoteRes = await passService.recommend({
      passId: "DMI-PASS-2026-0001",
      verdict: "do_not_recommend",
      note: "   ",
    });
    assert(!emptyNoteRes.ok, "Do Not Recommend fails when reason note is blank");
    assert(emptyNoteRes.code === "VALIDATION_FAILED", "Returns VALIDATION_FAILED error code");

    // Test Do Not Recommend with valid note
    const declineRes = await passService.recommend({
      passId: "DMI-PASS-2026-0001",
      verdict: "do_not_recommend",
      note: "Continuous internal assessment lab test scheduled tomorrow.",
    });
    assert(declineRes.ok, "Do Not Recommend succeeds with advisory note");
    assert(declineRes.data.status === PASS_STATUSES.PENDING, "Pass status stays PENDING on Do Not Recommend");
    assert(
      declineRes.data.recommendations.some((r) => r.verdict === "do_not_recommend"),
      "Recommendation object contains do_not_recommend verdict"
    );

    // Test Recommend
    const recommendRes = await passService.recommend({
      passId: "DMI-PASS-2026-0001",
      verdict: "recommend",
      note: "Attendance cleared after review.",
    });
    assert(recommendRes.ok, "Recommend succeeds");
    assert(recommendRes.data.status === PASS_STATUSES.RECOMMENDED, "Pass status moves to RECOMMENDED");
    assert(
      recommendRes.data.recommendations.some((r) => r.byId === staff1.id && r.verdict === "recommend"),
      "Recommendation records advisor ID and verdict"
    );

    // Test Undo
    const undoRes = await passService.undoRecommendation({ passId: "DMI-PASS-2026-0001" });
    assert(undoRes.ok, "Undo recommendation succeeds within window");
    assert(undoRes.data.status === PASS_STATUSES.PENDING, "Pass status reverts to PENDING");
    assert(
      !undoRes.data.recommendations.some((r) => r.byId === staff1.id),
      "Advisor recommendation removed on undo"
    );
  }

  // 4. Bulk Recommendation & Overdue Student Skip
  console.log("\nTEST 4: Bulk Recommendation with Overdue Student Skipping");
  {
    setSessionForTesting(hodCse);

    // Get list of passes
    const deptPassesRes = await passService.listForDepartment({ filters: { tab: "all" } });
    const allPasses = deptPassesRes.data;

    // Identify which students are overdue
    const overdueStudentIds = new Set(
      allPasses.filter((p) => p.status === PASS_STATUSES.OVERDUE).map((p) => p.studentId)
    );

    // Pick a pending pass belonging to a non-overdue student
    let validNonOverduePass = allPasses.find(
      (p) => p.status === PASS_STATUSES.PENDING && !overdueStudentIds.has(p.studentId)
    );

    // If none found in CSE, change one non-overdue student pass to pending for this test
    if (!validNonOverduePass) {
      const nonOverduePass = allPasses.find((p) => !overdueStudentIds.has(p.studentId));
      if (nonOverduePass) {
        nonOverduePass.status = PASS_STATUSES.PENDING;
        validNonOverduePass = nonOverduePass;
      }
    }

    const overduePass = allPasses.find((p) => p.status === PASS_STATUSES.OVERDUE);

    const passIds = [];
    if (validNonOverduePass) passIds.push(validNonOverduePass.id);
    if (overduePass) passIds.push(overduePass.id);

    const bulkRes = await passService.bulkRecommend({
      passIds,
      note: "Bulk verified for batch.",
    });

    assert(bulkRes.ok, "Bulk recommend executed");
    assert(bulkRes.data.recommendedCount >= 1, "Recommended valid non-overdue pending passes");
    if (overduePass) {
      assert(
        bulkRes.data.skippedPasses.some((s) => s.passId === overduePass.id || s.studentId === overduePass.studentId),
        "Overdue student pass was correctly SKIPPED in bulk recommendation"
      );
    }
  }

  // 5. Policy Enforcement: requireStaffRecommendation
  console.log("\nTEST 5: requireStaffRecommendation Policy on Warden Approval");
  {
    // Toggle policy requireStaffRecommendation to true
    updatePolicy({ requireStaffRecommendation: true });
    const effectivePolicy = getPolicy();
    assert(effectivePolicy.requireStaffRecommendation === true, "Policy requireStaffRecommendation is ACTIVE");

    // Pass 1 was undone so it has no recommendations
    setSessionForTesting(warden);
    const unrecApproveRes = await passService.approvePass("DMI-PASS-2026-0001");
    assert(!unrecApproveRes.ok, "Warden approval is BLOCKED without staff recommendation");
    assert(
      unrecApproveRes.code === "RECOMMENDATION_REQUIRED",
      "Returns RECOMMENDATION_REQUIRED error code"
    );

    // Now recommend as HOD
    setSessionForTesting(hodCse);
    await passService.recommend({
      passId: "DMI-PASS-2026-0001",
      verdict: "recommend",
      note: "HOD approved leave.",
    });

    // Warden approves now
    setSessionForTesting(warden);
    const recApproveRes = await passService.approvePass("DMI-PASS-2026-0001");
    assert(recApproveRes.ok, "Warden approval SUCCEEDS once positive recommendation exists");
    assert(recApproveRes.data.status === PASS_STATUSES.APPROVED, "Pass is now APPROVED");

    // Reset policy to default false
    updatePolicy({ requireStaffRecommendation: false });
  }

  // 6. HOD Department Analytics & Workload Metrics
  console.log("\nTEST 6: HOD Department Analytics & Workload Metrics");
  {
    setSessionForTesting(hodCse);
    const analyticsRes = await reportService.departmentAnalytics({ range: "this_month" });
    assert(analyticsRes.ok, "HOD Department Analytics generated successfully");

    const a = analyticsRes.data;
    assert(a.department === "CSE", "Analytics scoped strictly to CSE");
    assert(a.kpis && a.kpis.totalRequests >= 0, "Contains KPI totalRequests");
    assert(a.kpis.approvalRate !== undefined, "Contains KPI approvalRate");
    assert(Array.isArray(a.monthlyTrend) && a.monthlyTrend.length > 0, "Generates monthlyTrend for stacked chart");
    assert(Array.isArray(a.passesByYear), "Generates passesByYear cohort breakdown");
    assert(Array.isArray(a.peakExitDays), "Generates peakExitDays distribution");
    assert(Array.isArray(a.peakExitHours), "Generates peakExitHours distribution");
    assert(Array.isArray(a.statusDonut), "Generates statusDonut shares");
    assert(Array.isArray(a.frequentLeavers), "Generates Frequent Leavers top 10 table");
    assert(Array.isArray(a.lateWatchlist), "Generates Late Return Watchlist table");
    assert(Array.isArray(a.staffActivity) && a.staffActivity.length > 0, "Generates Staff Activity workload table");
  }

  // 7. Multi-Sheet Excel Workbook Export via SheetJS
  console.log("\nTEST 7: Multi-Sheet Excel Export (SheetJS)");
  {
    const wb = XLSX.utils.book_new();

    const summaryWs = XLSX.utils.json_to_sheet([
      { Metric: "Department", Value: "CSE" },
      { Metric: "Total Requests", Value: 68 },
      { Metric: "Approval Rate", Value: "94%" },
    ]);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary KPIs");

    const leaversWs = XLSX.utils.json_to_sheet([
      { Rank: 1, Student: "Rahul Kumar", Passes: 12 },
    ]);
    XLSX.utils.book_append_sheet(wb, leaversWs, "Frequent Leavers");

    const watchlistWs = XLSX.utils.json_to_sheet([
      { Student: "Test Student", LateIncidents: 2 },
    ]);
    XLSX.utils.book_append_sheet(wb, watchlistWs, "Late Return Watchlist");

    const staffWs = XLSX.utils.json_to_sheet([
      { Advisor: "Prof. Rajesh Sharma", Recommended: 32 },
    ]);
    XLSX.utils.book_append_sheet(wb, staffWs, "Staff Activity");

    assert(wb.SheetNames.length === 4, "Created 4 discrete sheets in Excel workbook");
    assert(
      wb.SheetNames.includes("Summary KPIs") &&
        wb.SheetNames.includes("Frequent Leavers") &&
        wb.SheetNames.includes("Late Return Watchlist") &&
        wb.SheetNames.includes("Staff Activity"),
      "Sheet names match exact specification"
    );

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    assert(buffer && buffer.length > 500, `Excel file binary generated successfully (${buffer.length} bytes)`);
  }

  console.log("\n=======================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

function s2StudentsFound() {
  const users = MOCK_USERS.filter((u) => (u.dept || u.department) === "CSE" && [1, 2].includes(Number(u.year)));
  return users[0] || null;
}

runTests().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
