import { query } from "@/lib/db/mysql.js";

/**
 * Normalizes department string into standard uppercase code.
 * Handles variations such as "AIDS" vs "AI&DS", "AIML" vs "AI&ML", etc.
 */
export function normalizeDepartment(dept) {
  if (!dept) return "CSE";
  const clean = String(dept).trim().toUpperCase().replace(/[\s\-_]+/g, "");

  if (clean.includes("AIDS") || clean.includes("AI&DS") || clean.includes("DATA")) {
    return "AI&DS";
  }
  if (clean.includes("AIML") || clean.includes("AI&ML") || clean.includes("MACHINE")) {
    return "AI&ML";
  }
  if (clean.includes("CSE") || clean.includes("COMPUTER")) {
    return "CSE";
  }
  if (clean.includes("IT") || clean.includes("INFORMATION")) {
    return "IT";
  }
  if (clean.includes("CIVIL")) {
    return "CIVIL";
  }
  if (clean.includes("MECH")) {
    return "MECH";
  }
  if (clean.includes("EEE") || clean.includes("ELECTRICAL")) {
    return "EEE";
  }
  if (clean.includes("ECE") || clean.includes("ELECTRONIC")) {
    return "ECE";
  }

  return dept.trim().toUpperCase();
}

/**
 * Resolves the designated Staff and HOD reviewer user IDs for a Home Outpass
 * based on the student's academic year and department.
 *
 * Routing Rules:
 * - Year 1 (all departments): Handled by FY_STAFF and FY_HOD.
 * - Years 2, 3, 4: Handled by departmental Staff and HOD reviewers.
 *
 * @param {object} params
 * @param {string|number} params.year - Academic year (1, 2, 3, 4)
 * @param {string} params.department - Student department
 * @param {boolean} [params.verifyDb=true] - Whether to verify accounts in MySQL
 * @returns {Promise<{ staffUserId: string, hodUserId: string, department: string, year: number }>}
 */
export async function resolveHomeOutpassReviewers({ year, department, verifyDb = true }) {
  const numYear = parseInt(year, 10);
  const normDept = normalizeDepartment(department);

  let staffUserId = null;
  let hodUserId = null;

  if (numYear === 1) {
    staffUserId = "FY_STAFF";
    hodUserId = "FY_HOD";
  } else if ([2, 3, 4].includes(numYear)) {
    switch (normDept) {
      case "CSE":
        staffUserId = "CSE_STAFF";
        hodUserId = "CSE_HOD";
        break;
      case "IT":
        staffUserId = "IT_STAFF";
        hodUserId = "IT_HOD";
        break;
      case "AI&DS":
        staffUserId = "AIDS_STAFF";
        hodUserId = "AIDS_HOD";
        break;
      case "AI&ML":
        staffUserId = "AIML_STAFF";
        hodUserId = "AIML_HOD";
        break;
      case "CIVIL":
        staffUserId = "CIVIL_STAFF";
        hodUserId = "CIVIL_HOD";
        break;
      case "MECH":
        staffUserId = "MECH_STAFF";
        hodUserId = "MECH_HOD";
        break;
      default:
        throw new Error(
          `Reviewer configuration missing: No reviewer mapping configured for department '${department}' (normalized: '${normDept}').`
        );
    }
  } else {
    throw new Error(
      `Reviewer configuration missing: Invalid academic year '${year}'. Must be 1, 2, 3, or 4.`
    );
  }

  if (verifyDb) {
    const rows = await query(
      "SELECT id, role, status, account_status FROM users WHERE id IN (?, ?) AND status = 'active'",
      [staffUserId, hodUserId]
    );

    const foundStaff = rows.find((r) => r.id === staffUserId);
    const foundHod = rows.find((r) => r.id === hodUserId);

    if (!foundStaff) {
      throw new Error(
        `Configured staff reviewer '${staffUserId}' is either inactive or does not exist in the database.`
      );
    }
    if (!foundHod) {
      throw new Error(
        `Configured HOD reviewer '${hodUserId}' is either inactive or does not exist in the database.`
      );
    }
  }

  return {
    staffUserId,
    hodUserId,
    department: normDept,
    year: numYear,
  };
}
