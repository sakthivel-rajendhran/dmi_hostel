/**
 * Comprehensive Automated Tests for:
 * 1. Block -> Floor Rename & Room Validation (GF, F2, F3, F4)
 * 2. Room Allocation Policy (student_enters vs warden_allocates)
 * 3. Photo Policy (auto_compress vs reject & <=1MB storage compliance)
 * 4. Sign-up Registration & Profile Completeness
 */

import {
  roomNoSchema,
  validateRoomMatchesFloor,
  computeBatch,
  getStep2Schema,
  getRegisterSchema,
} from "../src/lib/validators.js";
import { formatBytes, validatePhotoFile } from "../src/lib/utils/image.js";
import {
  checkRoomAvailability,
  checkRegNoAvailable,
  registerStudent,
  allocateRoom,
  getProfileCompleteness,
  getStudentById,
} from "../src/lib/services/studentService.js";
import { getPolicy, updatePolicy, resetPolicy } from "../src/lib/services/settingsService.js";
import { WORKFLOW_CONFIG } from "../src/config/workflow.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  SUITE 1: ROOM NUMBER & FLOOR PREFIX VALIDATION");
  console.log("=======================================================");

  // 1. Valid room numbers for all 4 floors
  const validCases = [
    { floor: "GF", room: "G01" },
    { floor: "GF", room: "G15" },
    { floor: "GF", room: "G30" },
    { floor: "F2", room: "201" },
    { floor: "F2", room: "215" },
    { floor: "F2", room: "230" },
    { floor: "F3", room: "301" },
    { floor: "F3", room: "315" },
    { floor: "F3", room: "330" },
    { floor: "F4", room: "401" },
    { floor: "F4", room: "415" },
    { floor: "F4", room: "430" },
  ];

  for (const c of validCases) {
    const res = validateRoomMatchesFloor(c.floor, c.room);
    assert(res.valid === true, `Valid room ${c.room} matches floor ${c.floor}`);
  }

  // 2. Out-of-range rooms (> 30)
  const outOfRange = [
    { floor: "GF", room: "G00" },
    { floor: "GF", room: "G31" },
    { floor: "GF", room: "G45" },
    { floor: "F2", room: "200" },
    { floor: "F2", room: "231" },
    { floor: "F3", room: "335" },
    { floor: "F4", room: "431" },
  ];

  for (const c of outOfRange) {
    const res = validateRoomMatchesFloor(c.floor, c.room);
    assert(res.valid === false, `Out of range room ${c.room} rejected on floor ${c.floor}`);
  }

  // 3. Prefix Mismatch Errors (e.g. 204 on 3rd floor)
  const mismatch1 = validateRoomMatchesFloor("F3", "204");
  assert(
    mismatch1.valid === false && mismatch1.error.includes("2nd Floor"),
    `Room 204 on 3rd Floor gives error: "${mismatch1.error}"`
  );

  const mismatch2 = validateRoomMatchesFloor("GF", "304");
  assert(
    mismatch2.valid === false && mismatch2.error.includes("3rd Floor"),
    `Room 304 on Ground Floor gives error: "${mismatch2.error}"`
  );

  const mismatch3 = validateRoomMatchesFloor("F2", "G05");
  assert(
    mismatch3.valid === false && mismatch3.error.includes("Ground Floor"),
    `Room G05 on 2nd Floor gives error: "${mismatch3.error}"`
  );

  console.log("\n=======================================================");
  console.log("  SUITE 2: ACADEMIC BATCH COMPUTATION");
  console.log("=======================================================");

  const batch1 = computeBatch(1);
  const batch2 = computeBatch(2);
  const batch3 = computeBatch(3);
  const batch4 = computeBatch(4);
  assert(batch1 === "2026 – 2030", `Computed 1st year batch: ${batch1}`);
  assert(batch3 === "2024 – 2028", `Computed 3rd year batch: ${batch3}`);

  console.log("\n=======================================================");
  console.log("  SUITE 3: ROOM CAPACITY & FULL ROOM CHECK");
  console.log("=======================================================");

  // Ground Floor room G05 was seeded with 4 students
  const fullCheck = await checkRoomAvailability({ floor: "GF", roomNo: "G05" });
  assert(
    fullCheck.available === false && fullCheck.error === "ROOM_FULL",
    `Room G05 is reported full (4/4): occupied=${fullCheck.occupied}`
  );

  // Available room check (e.g. G29 which has 0 students)
  const availCheck = await checkRoomAvailability({ floor: "GF", roomNo: "G29" });
  assert(availCheck.available === true, `Room G29 is available: occupied=${availCheck.occupied}`);

  console.log("\n=======================================================");
  console.log("  SUITE 4: REGISTER NUMBER UNIQUENESS CHECK");
  console.log("=======================================================");

  // Rahul Kumar's regNumber is 310622104045
  const regCheckExisting = await checkRegNoAvailable({ regNo: "310622104045" });
  assert(
    regCheckExisting.available === false && regCheckExisting.error === "REGNO_EXISTS",
    "Existing Register Number 310622104045 is rejected as duplicate"
  );

  const regCheckNew = await checkRegNoAvailable({ regNo: "310626104999" });
  assert(regCheckNew.available === true, "Fresh Register Number 310626104999 is accepted");

  console.log("\n=======================================================");
  console.log("  SUITE 5: PHOTO POLICY ENFORCEMENT");
  console.log("=======================================================");

  // Test mock file objects
  const mockValidJpg = { name: "avatar.jpg", type: "image/jpeg", size: 500000 };
  const mockExactLimit = { name: "avatar.jpg", type: "image/jpeg", size: 1048576 }; // 1 MB
  const mockOverLimit1Byte = { name: "avatar.jpg", type: "image/jpeg", size: 1048577 }; // 1 MB + 1
  const mockLargePhoto = { name: "selfie.png", type: "image/png", size: 6000000 }; // 6 MB
  const mockHugePhoto = { name: "raw.jpg", type: "image/jpeg", size: 20000000 }; // 20 MB
  const mockInvalidPdf = { name: "doc.pdf", type: "application/pdf", size: 500000 };

  // 1. In 'reject' mode:
  // Note: validatePhotoFile checks file.size and file.type first, then loadImage (if in browser)
  // Let's test the size logic:
  const reject1 = await validatePhotoFile(mockOverLimit1Byte, "reject");
  assert(reject1.valid === false && reject1.error.includes("too large"), "Reject mode rejects 1 MB + 1 byte");

  const rejectPdf = await validatePhotoFile(mockInvalidPdf, "reject");
  assert(rejectPdf.valid === false && rejectPdf.error.includes("JPG, PNG or WebP"), "Rejects invalid PDF file");

  // 2. In 'auto_compress' mode:
  const autoHuge = await validatePhotoFile(mockHugePhoto, "auto_compress");
  assert(autoHuge.valid === false && autoHuge.error.includes("15 MB"), "Auto-compress rejects file > 15 MB");

  console.log("\n=======================================================");
  console.log("  SUITE 6: SIGN-UP IN 'STUDENT_ENTERS' MODE");
  console.log("=======================================================");

  updatePolicy({ roomAllocationMode: "student_enters", photoPolicy: "auto_compress" });

  // 1. Try to register into full room G05
  const regFullAttempt = await registerStudent({
    name: "Sneha Test",
    email: "sneha.test@dmice.ac.in",
    dept: "CSE",
    year: 1,
    phone: "9876543211",
    regNo: "310626104888",
    programme: "B.E.",
    section: "A",
    floor: "GF",
    roomNo: "G05",
    photoDataUrl: "data:image/jpeg;base64,mockValidPhotoString",
  });
  assert(
    regFullAttempt.ok === false && regFullAttempt.code === "ROOM_FULL",
    `Registration rejected when room is full: ${regFullAttempt.message}`
  );

  // 2. Successful registration in available room G10
  const regSuccess = await registerStudent({
    name: "Pooja Test",
    email: "pooja.test@dmice.ac.in",
    dept: "CSE",
    year: 1,
    phone: "9876543212",
    regNo: "310626104889",
    programme: "B.E.",
    section: "A",
    floor: "GF",
    roomNo: "G10",
    photoDataUrl: "data:image/jpeg;base64,mockValidPhotoString",
  });
  assert(regSuccess.ok === true, `Student registered successfully with ID: ${regSuccess.data?.studentId}`);
  assert(regSuccess.data?.user?.floor === "GF", "Saved floor is 'GF'");
  assert(regSuccess.data?.user?.room === "G10", "Saved room is 'G10'");
  assert(regSuccess.data?.user?.hostelVerification === "pending", "Hostel verification is 'pending'");

  console.log("\n=======================================================");
  console.log("  SUITE 7: SIGN-UP IN 'WARDEN_ALLOCATES' MODE");
  console.log("=======================================================");

  updatePolicy({ roomAllocationMode: "warden_allocates" });

  const regWardenMode = await registerStudent({
    name: "Varun Test",
    email: "varun.test@dmice.ac.in",
    dept: "IT",
    year: 2,
    phone: "9876543213",
    regNo: "310626104890",
    programme: "B.Tech",
    section: "B",
    photoDataUrl: "data:image/jpeg;base64,mockValidPhotoString",
  });
  if (!regWardenMode.ok) console.log("regWardenMode error:", regWardenMode);
  assert(regWardenMode.ok === true, `Student registered in warden_allocates mode: ${regWardenMode.data?.studentId}`);
  assert(regWardenMode.data?.user?.floor === null, "Floor is forced null");
  assert(regWardenMode.data?.user?.room === null, "Room is forced null");
  assert(regWardenMode.data?.user?.hostelVerification === "unallocated", "Status is 'unallocated'");

  // Test Profile Completeness for this unallocated student
  const compUnallocated = await getProfileCompleteness(regWardenMode.data.studentId);
  assert(
    compUnallocated.data.isUnallocated === true,
    "Completeness recognizes student as unallocated"
  );
  assert(
    !compUnallocated.data.missingFields.includes("Floor"),
    "Floor is not penalized as missing when unallocated"
  );

  // Warden allocates a room to this student
  const allocRes = await allocateRoom({
    studentId: regWardenMode.data.studentId,
    floor: "F2",
    roomNo: "210",
  });
  assert(allocRes.ok === true, "Warden successfully allocates 2nd Floor Room 210");
  assert(allocRes.data?.floor === "F2", "Updated floor is 'F2'");
  assert(allocRes.data?.room === "210", "Updated room is '210'");
  assert(allocRes.data?.hostelVerification === "verified", "Updated verification is 'verified'");

  // Reset policy to default
  resetPolicy();

  console.log("\n=======================================================");
  console.log(`  ALL SUITES FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
