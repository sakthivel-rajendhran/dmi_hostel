/**
 * Unit & Integration Tests for Phase 6 Section 1: Staff Accounts Management
 */

import { accountService } from "../src/lib/services/accountService.js";
import { authService } from "../src/lib/services/authService.js";
import { passService } from "../src/lib/services/passService.js";
import { ROLES } from "../src/config/roles.js";

async function run() {
  console.log("=======================================================");
  console.log("  PHASE 6 SECTION 1: STAFF ACCOUNTS TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  };

  // -------------------------------------------------------------------------
  // SUITE 1: Listing and Scope Filtering
  // -------------------------------------------------------------------------
  console.log("SUITE 1: Accounts List and Role Coverage");
  const listRes = await accountService.list();
  assert(listRes.ok, "accountService.list() returns success");
  assert(Array.isArray(listRes.data.items), "Items is array");
  assert(listRes.data.items.length >= 4, "Covers seeded staff and executive accounts");

  const rolesInList = new Set(listRes.data.items.map((a) => a.role));
  assert(rolesInList.has(ROLES.STAFF), "Contains Staff role");
  assert(rolesInList.has(ROLES.HOD), "Contains HOD role");
  assert(rolesInList.has(ROLES.PRINCIPAL), "Contains Principal role");
  assert(rolesInList.has(ROLES.CORRESPONDENT), "Contains Correspondent role");
  assert(!rolesInList.has(ROLES.STUDENT), "Excludes Student resident accounts");

  // -------------------------------------------------------------------------
  // SUITE 2: Account Creation Rules & Temporary Passwords
  // -------------------------------------------------------------------------
  console.log("\nSUITE 2: Validation, Constraints & Temp Passwords");

  // Invalid email
  const badEmailRes = await accountService.create({
    name: "Dr. Test User",
    gmail: "test.user@yahoo.com",
    role: ROLES.STAFF,
    department: "CSE",
  });
  assert(!badEmailRes.ok && badEmailRes.code === "VALIDATION_FAILED", "Rejects non-Gmail address");

  // Unique email constraint
  const dupEmailRes = await accountService.create({
    name: "Duplicate User",
    gmail: "staff.cse@gmail.com",
    role: ROLES.STAFF,
    department: "CSE",
  });
  assert(!dupEmailRes.ok && dupEmailRes.code === "EMAIL_EXISTS", "Rejects duplicate email with EMAIL_EXISTS");

  // Single HOD per department constraint
  const dupHodRes = await accountService.create({
    name: "Dr. Another HOD",
    gmail: "another.hod@gmail.com",
    role: ROLES.HOD,
    department: "CSE",
  });
  assert(!dupHodRes.ok && dupHodRes.code === "HOD_EXISTS", "Blocks second HOD for CSE with HOD_EXISTS");

  // Single Principal constraint
  const dupPrincipalRes = await accountService.create({
    name: "Dr. Second Principal",
    gmail: "second.principal@gmail.com",
    role: ROLES.PRINCIPAL,
  });
  assert(!dupPrincipalRes.ok && dupPrincipalRes.code === "PRINCIPAL_EXISTS", "Blocks second Principal with PRINCIPAL_EXISTS");

  // Single Correspondent constraint
  const dupCorrRes = await accountService.create({
    name: "Rev. Second Correspondent",
    gmail: "second.corr@gmail.com",
    role: ROLES.CORRESPONDENT,
  });
  assert(!dupCorrRes.ok && dupCorrRes.code === "CORRESPONDENT_EXISTS", "Blocks second Correspondent with CORRESPONDENT_EXISTS");

  // Valid Staff Account Creation
  const validStaffRes = await accountService.create({
    name: "prof. vinoth kumar",
    gmail: "vinoth.kumar.dmi@gmail.com",
    role: ROLES.STAFF,
    department: "ECE",
    assignedYears: [2, 4],
    designation: "Assistant Professor",
    phone: "9876543219",
  });
  assert(validStaffRes.ok, "Successfully creates valid Faculty Advisor account");
  assert(validStaffRes.data.account.name === "Prof. Vinoth Kumar", "Auto-formats name to Title Case");
  assert(validStaffRes.data.account.mustChangePassword === true, "Sets mustChangePassword to true");
  assert(validStaffRes.data.account.status === "Password change pending", "Status is Password change pending");
  assert(validStaffRes.data.tempPassword.startsWith("DMI-Temp#2026-"), "Generates valid temp password format");

  // -------------------------------------------------------------------------
  // SUITE 3: Login Enforcement with Temp Password and Disabled Account
  // -------------------------------------------------------------------------
  console.log("\nSUITE 3: Auth Integration (Disabled Accounts & First Login)");

  // Login with temporary password forces password change
  const tempLoginRes = await authService.login({
    role: "staff",
    identifier: "vinoth.kumar.dmi@gmail.com",
    password: validStaffRes.data.tempPassword,
  });
  assert(tempLoginRes.ok, "Can log in with temporary password");
  assert(tempLoginRes.data.mustChangePassword === true, "Session flags mustChangePassword: true");

  // Disable Account without reason fails
  const noReasonRes = await accountService.disable(validStaffRes.data.account.id, "   ");
  assert(!noReasonRes.ok && noReasonRes.code === "VALIDATION_FAILED", "Disable requires reason");

  // Disable Account with reason succeeds
  const disableRes = await accountService.disable(validStaffRes.data.account.id, "Medical leave hold");
  assert(disableRes.ok, "Disables account successfully");
  assert(disableRes.data.status === "Disabled", "Status is now Disabled");

  // Login with disabled account fails with ACCOUNT_DISABLED
  const disabledLoginRes = await authService.login({
    role: "staff",
    identifier: "vinoth.kumar.dmi@gmail.com",
    password: validStaffRes.data.tempPassword,
  });
  assert(!disabledLoginRes.ok && disabledLoginRes.code === "ACCOUNT_DISABLED", "Disabled account blocked from login with ACCOUNT_DISABLED");

  // Re-enable Account
  const enableRes = await accountService.enable(validStaffRes.data.account.id);
  assert(enableRes.ok, "Re-enables account successfully");

  // Reset Password generates new credentials
  const resetRes = await accountService.resetPassword(validStaffRes.data.account.id);
  assert(resetRes.ok, "Resets password successfully");
  assert(resetRes.data.tempPassword.startsWith("DMI-Temp#2026-"), "New temporary password generated");

  // Permanent password change removes forced flag
  const changeRes = await authService.changePassword(resetRes.data.tempPassword, "Permanent@2026");
  assert(changeRes.ok, "Permanent password change succeeds");

  // -------------------------------------------------------------------------
  // SUITE 4: Updating Assigned Years & Cohort Reactivity
  // -------------------------------------------------------------------------
  console.log("\nSUITE 4: Cohort Updates & Audit Trail");
  const updateRes = await accountService.update(validStaffRes.data.account.id, {
    assignedYears: [1, 3],
  });
  assert(updateRes.ok, "Updates assignedYears successfully");
  assert(JSON.stringify(updateRes.data.assignedYears) === JSON.stringify([1, 3]), "Cohort is now [1, 3]");

  // Audit Log Inspection
  const auditRes = await accountService.getAuditLog(10);
  assert(auditRes.ok, "Fetches audit log successfully");
  assert(auditRes.data.length >= 3, "Contains recorded audit entries");
  const actionsInAudit = auditRes.data.map((a) => a.action);
  assert(actionsInAudit.includes("CREATE_ACCOUNT"), "Audit trail contains CREATE_ACCOUNT");
  assert(actionsInAudit.includes("DISABLE_ACCOUNT"), "Audit trail contains DISABLE_ACCOUNT");
  assert(actionsInAudit.includes("ENABLE_ACCOUNT"), "Audit trail contains ENABLE_ACCOUNT");
  assert(actionsInAudit.includes("RESET_PASSWORD"), "Audit trail contains RESET_PASSWORD");

  console.log("\n=======================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

run();
