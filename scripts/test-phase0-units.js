/**
 * Phase 0 Unit Tests
 * Tests zero-collision student ID generator, string utilities, and permission evaluator.
 */

import { generateStudentId, parseStudentId } from "../src/lib/utils/student-id.js";
import { toTitleCase, getInitials } from "../src/lib/utils/string.js";
import { can, canAny, canAll, PERMISSIONS } from "../src/config/permissions.js";
import { ROLES } from "../src/config/roles.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log("\n==========================================");
console.log("RUNNING PHASE 0 UNIT TESTS");
console.log("==========================================\n");

// 1. Zero Collision Student ID Generator Test
console.log("[Test Suite 1] Student ID Generator & Parser");
{
  const generatedIds = new Set();
  const existingIds = [];
  const TOTAL_RUNS = 1000;

  for (let i = 0; i < TOTAL_RUNS; i++) {
    const id = generateStudentId({ dept: "CSE", year: 3, existingIds });
    existingIds.push(id);
    generatedIds.add(id);
  }

  assert(generatedIds.size === TOTAL_RUNS, `Generated 1000 unique IDs without collision (size: ${generatedIds.size})`);
  assert(existingIds[0] === "CSE-3-001", `First ID is formatted as CSE-3-001 (got: ${existingIds[0]})`);
  assert(existingIds[999] === "CSE-3-1000", `1000th ID is formatted as CSE-3-1000 (got: ${existingIds[999]})`);

  // Parser test
  const parsed = parseStudentId("ECE-2-042");
  assert(parsed.isValid === true, "parseStudentId detects valid format");
  assert(parsed.dept === "ECE", "parseStudentId extracts dept ECE");
  assert(parsed.year === 2, "parseStudentId extracts year 2");
  assert(parsed.seq === 42, "parseStudentId extracts seq 42");

  const invalid = parseStudentId("INVALID-ID");
  assert(invalid.isValid === false, "parseStudentId detects invalid format");
}

// 2. String Utilities Test
console.log("\n[Test Suite 2] String Utilities");
{
  assert(toTitleCase("rahul kumar") === "Rahul Kumar", "toTitleCase('rahul kumar') === 'Rahul Kumar'");
  assert(toTitleCase("CHIEF WARDEN") === "Chief Warden", "toTitleCase('CHIEF WARDEN') === 'Chief Warden'");
  assert(getInitials("Rahul Kumar") === "RK", "getInitials('Rahul Kumar') === 'RK'");
  assert(getInitials("Arumugam") === "A", "getInitials('Arumugam') === 'A'");
}

// 3. Permission Evaluation Matrix Test
console.log("\n[Test Suite 3] Role Permission Matrix Evaluator");
{
  const studentUser = { role: ROLES.STUDENT, studentId: "CSE-3-001" };
  const wardenUser = { role: ROLES.WARDEN, email: "warden@dmi.edu" };
  const staffUser = { role: ROLES.STAFF, dept: "CSE" };
  const hodUser = { role: ROLES.HOD, dept: "CSE" };
  const principalUser = { role: ROLES.PRINCIPAL };

  // Student permissions
  assert(can(studentUser, PERMISSIONS.PASS_APPLY) === true, "Student can apply for pass");
  assert(can(studentUser, PERMISSIONS.PASS_APPROVE) === false, "Student CANNOT approve pass");
  assert(can(studentUser, PERMISSIONS.STUDENTS_MANAGE) === false, "Student CANNOT manage students");

  // Warden permissions
  assert(can(wardenUser, PERMISSIONS.PASS_APPROVE) === true, "Warden can approve pass");
  assert(can(wardenUser, PERMISSIONS.PASS_ISSUE_GATE) === true, "Warden can issue gate pass");
  assert(can(wardenUser, PERMISSIONS.STUDENTS_VIEW_ALL) === true, "Warden can view all students");
  assert(can(wardenUser, PERMISSIONS.SECURITY_LOG_VIEW) === true, "Warden can view security log");

  // Staff permissions
  assert(can(staffUser, PERMISSIONS.PASS_RECOMMEND) === true, "Staff can recommend pass");
  assert(can(staffUser, PERMISSIONS.PASS_APPROVE) === false, "Staff CANNOT approve pass");
  assert(can(staffUser, PERMISSIONS.STUDENTS_VIEW_DEPT) === true, "Staff can view department students");

  // HOD permissions
  assert(can(hodUser, PERMISSIONS.PASS_RECOMMEND) === true, "HOD can recommend pass");
  assert(can(hodUser, PERMISSIONS.REPORTS_DEPT) === true, "HOD can view department reports");
  assert(can(hodUser, PERMISSIONS.PASS_APPROVE) === false, "HOD CANNOT approve pass");

  // Principal permissions
  assert(can(principalUser, PERMISSIONS.REPORTS_CAMPUS) === true, "Principal can view campus reports");
  assert(can(principalUser, PERMISSIONS.PASS_APPROVE) === false, "Principal CANNOT approve pass (read-only oversight)");

  // Warden Gate QR poster management permission
  assert(can(wardenUser, PERMISSIONS.GATEQR_MANAGE) === true, "Warden can manage and rotate gate QR");
  assert(can(studentUser, PERMISSIONS.GATEQR_MANAGE) === false, "Student CANNOT manage gate QR");

  // Multi permission checks
  assert(canAny(wardenUser, [PERMISSIONS.PASS_APPROVE, PERMISSIONS.PASS_APPLY]) === true, "canAny passes for Warden");
  assert(canAll(wardenUser, [PERMISSIONS.PASS_APPROVE, PERMISSIONS.PASS_ISSUE_GATE]) === true, "canAll passes for Warden");
}

console.log("\n==========================================");
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
