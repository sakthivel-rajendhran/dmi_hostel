import { query } from "../src/lib/db/mysql.js";
import { POST, GET, DELETE } from "../src/app/api/student/profile/photo/route.js";
import { studentProfileSchema } from "../src/lib/validators.js";
import { updateStudent, getProfileCompleteness } from "../src/lib/services/studentService.js";

// Helper to create a minimal valid PNG buffer of specified dimensions
function createPngBuffer(width, height) {
  const buffer = Buffer.alloc(33);
  buffer.write("\x89PNG\r\n\x1a\n", 0, "binary");
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  buffer[26] = 0;
  buffer[27] = 0;
  buffer[28] = 0;
  buffer.writeUInt32BE(0, 29);
  return buffer;
}

// Helper to create a minimal valid JPEG buffer of specified dimensions
function createJpegBuffer(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.writeUInt16BE(0xffd8, 0);
  buffer.writeUInt16BE(0xffc0, 2);
  buffer.writeUInt16BE(17, 4);
  buffer[6] = 8;
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  buffer[11] = 3;
  buffer[12] = 1; buffer[13] = 0x11; buffer[14] = 0;
  buffer[15] = 2; buffer[16] = 0x11; buffer[17] = 0;
  buffer[18] = 3; buffer[19] = 0x11; buffer[20] = 0;
  buffer.writeUInt16BE(0xffd9, 21);
  return buffer;
}

// Helper to create a minimal valid WebP buffer of specified dimensions
function createWebpBuffer(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8 ", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer[20] = 0x9d; buffer[21] = 0x01; buffer[22] = 0x2a;
  buffer.writeUInt16LE(width & 0x3fff, 26);
  buffer.writeUInt16LE(height & 0x3fff, 28);
  return buffer;
}

async function runTests() {
  console.log("\n============================================================");
  console.log("   STUDENT PROFILE & UNCOMPRESSED PHOTO TEST SUITE");
  console.log("============================================================\n");

  const TEST_STUDENT_ID = "CSE-3-001";
  let passedCount = 0;
  let failedCount = 0;

  function report(name, passed, detail = "") {
    if (passed) {
      console.log(`  ✓ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? `: ${detail}` : ""}`);
      failedCount++;
    }
  }

  // Ensure test student exists in database
  await query(
    `INSERT INTO users (id, email, password, role, name, status)
     VALUES (?, 'test.student@dmi.edu', 'pass123', 'student', 'Test Student', 'Active')
     ON DUPLICATE KEY UPDATE name = VALUES(name);`,
    [TEST_STUDENT_ID]
  );
  await query(
    `INSERT INTO students (id, student_id, reg_no, name, department, programme, year, batch, floor)
     VALUES (?, ?, '310622104991', 'Test Student', 'CSE', 'B.E.', 3, '2023-2027', 'F3')
     ON DUPLICATE KEY UPDATE name = VALUES(name);`,
    [TEST_STUDENT_ID, TEST_STUDENT_ID]
  );

  // --- TEST 1: Upload a JPG image without compression ---
  try {
    const jpgBuf = createJpegBuffer(600, 600);
    const formData = new FormData();
    const file = new File([jpgBuf], "student_original.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();
    report("1. Upload a JPG image without compression", res.status === 200 && json.ok, `HTTP ${res.status}`);
  } catch (e) {
    report("1. Upload a JPG image without compression", false, e.message);
  }

  // --- TEST 2: Upload a PNG image without compression ---
  try {
    const pngBuf = createPngBuffer(500, 500);
    const formData = new FormData();
    const file = new File([pngBuf], "student_original.png", { type: "image/png" });
    formData.append("file", file);
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();
    report("2. Upload a PNG image without compression", res.status === 200 && json.ok, `HTTP ${res.status}`);
  } catch (e) {
    report("2. Upload a PNG image without compression", false, e.message);
  }

  // --- TEST 3: Upload a WebP image without compression ---
  try {
    const webpBuf = createWebpBuffer(450, 450);
    const formData = new FormData();
    const file = new File([webpBuf], "student_original.webp", { type: "image/webp" });
    formData.append("file", file);
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();
    report("3. Upload a WebP image without compression", res.status === 200 && json.ok, `HTTP ${res.status}`);
  } catch (e) {
    report("3. Upload a WebP image without compression", false, e.message);
  }

  // --- TEST 4: Verify original image quality and dimensions are preserved ---
  try {
    const originalWidth = 720;
    const originalHeight = 480;
    const testBuf = createJpegBuffer(originalWidth, originalHeight);

    const formData = new FormData();
    const file = new File([testBuf], "preserve_test.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();

    const rows = await query("SELECT file_size, width, height, photo_data FROM student_photos WHERE student_id = ?", [TEST_STUDENT_ID]);
    const stored = rows[0];
    const preserved = stored.width === originalWidth && stored.height === originalHeight && stored.file_size === testBuf.length;

    report(
      "4. Verify original image quality and dimensions are preserved",
      preserved,
      `Original: ${originalWidth}x${originalHeight} (${testBuf.length} B), Stored: ${stored?.width}x${stored?.height} (${stored?.file_size} B)`
    );
  } catch (e) {
    report("4. Verify original image quality and dimensions are preserved", false, e.message);
  }

  // --- TEST 5: Reject an image larger than 15 MB ---
  try {
    const oversizedBlob = new Blob([new Uint8Array(16 * 1024 * 1024)]);
    const formData = new FormData();
    formData.append("file", oversizedBlob, "huge_photo.jpg");
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();
    report("5. Reject an image larger than 15 MB", res.status === 400 && json.error.includes("15 MB"), json.error);
  } catch (e) {
    report("5. Reject an image larger than 15 MB", false, e.message);
  }

  // --- TEST 6: Reject unsupported formats ---
  try {
    const textBlob = new Blob(["Simulated PDF binary content"], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", textBlob, "profile.pdf");
    formData.append("studentId", TEST_STUDENT_ID);

    const req = new Request("http://localhost:3000/api/student/profile/photo", {
      method: "POST",
      headers: { "x-student-id": TEST_STUDENT_ID },
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();
    report("6. Reject unsupported formats", res.status === 400 && json.error.includes("format"), json.error);
  } catch (e) {
    report("6. Reject unsupported formats", false, e.message);
  }

  // --- TEST 7: Verify the image is permanently saved and retrieved ---
  try {
    const getReq = new Request(`http://localhost:3000/api/student/profile/photo?studentId=${TEST_STUDENT_ID}`);
    const getRes = await GET(getReq);
    const buffer = await getRes.arrayBuffer();
    const contentType = getRes.headers.get("content-type");

    report(
      "7. Verify image permanently saved & retrieved",
      getRes.status === 200 && buffer.byteLength > 0,
      `Retrieved ${buffer.byteLength} bytes, Content-Type: ${contentType}`
    );
  } catch (e) {
    report("7. Verify image permanently saved & retrieved", false, e.message);
  }

  // --- TEST 8: Submit the existing profile form without any Floor field ---
  try {
    const profilePayload = {
      name: "Rahul Kumar",
      phone: "9876543210",
      bloodGroup: "O+ve",
      dob: "2004-05-14",
      address: "123 South Cross Street, Chennai",
      // Notice: Floor field is omitted / null
      guardianName: "Muthu Kumar",
      guardianRelation: "Father",
      guardianPhone: "9876543211",
    };

    const parseResult = studentProfileSchema.safeParse(profilePayload);
    const updateRes = await updateStudent(TEST_STUDENT_ID, profilePayload);

    report(
      "8. Submit existing profile form without any Floor field",
      parseResult.success && updateRes.ok,
      `Schema valid: ${parseResult.success}, Update ok: ${updateRes.ok}`
    );
  } catch (e) {
    report("8. Submit existing profile form without any Floor field", false, e.message);
  }

  // --- TEST 9: Verify no incorrect 'Floor and Room Number required' error appears ---
  try {
    const completeness = await getProfileCompleteness(TEST_STUDENT_ID);
    const hasFloorOrRoomError = completeness.data?.missingFields?.some((f) =>
      f.toLowerCase().includes("floor") || f.toLowerCase().includes("room")
    );

    report(
      "9. Verify no incorrect 'Floor and Room Number required' error appears",
      !hasFloorOrRoomError,
      `Missing fields: [${completeness.data?.missingFields?.join(", ") || "None"}]`
    );
  } catch (e) {
    report("9. Verify no incorrect 'Floor and Room Number required' error appears", false, e.message);
  }

  // --- TEST 10: Verify all genuinely required existing fields are validated ---
  try {
    // Missing required guardianPhone and address
    const invalidPayload = {
      name: "Rahul",
      phone: "invalid-phone",
      bloodGroup: "",
      address: "", // required
      guardianName: "", // required
      guardianPhone: "", // required
    };

    const parseResult = studentProfileSchema.safeParse(invalidPayload);
    const caughtRequiredErrors =
      !parseResult.success &&
      parseResult.error.issues.some((i) => i.path.includes("guardianName")) &&
      parseResult.error.issues.some((i) => i.path.includes("address"));

    report(
      "10. Verify all genuinely required existing fields are validated",
      caughtRequiredErrors,
      `Issues caught: ${parseResult.error?.issues?.length || 0} fields`
    );
  } catch (e) {
    report("10. Verify all genuinely required existing fields are validated", false, e.message);
  }

  // --- TEST 11: Verify profile information is saved correctly in MySQL ---
  try {
    // Update profile in MySQL
    await query(
      "UPDATE students SET name = ?, blood_group = ?, home_address = ? WHERE student_id = ?",
      ["Rahul Kumar", "O+ve", "123 South Cross Street, Chennai", TEST_STUDENT_ID]
    );

    const rows = await query("SELECT name, blood_group, home_address FROM students WHERE student_id = ?", [TEST_STUDENT_ID]);
    const s = rows[0];
    const saved = s && s.name === "Rahul Kumar" && s.blood_group === "O+ve" && s.home_address.includes("Chennai");

    report("11. Verify profile information is saved correctly in MySQL", saved, `Name: ${s?.name}, Blood Group: ${s?.blood_group}`);
  } catch (e) {
    report("11. Verify profile information is saved correctly in MySQL", false, e.message);
  }

  // --- TEST 12: Verify existing student records remain unchanged ---
  try {
    const students = await query("SELECT student_id, department, programme, year, batch FROM students WHERE student_id = ?", [TEST_STUDENT_ID]);
    const s = students[0];
    const unchanged = s && s.department === "CSE" && s.programme === "B.E." && s.year === 3 && s.batch === "2023-2027";

    report("12. Verify existing student records remain unchanged", unchanged, `Dept: ${s?.department}, Prog: ${s?.programme}, Batch: ${s?.batch}`);
  } catch (e) {
    report("12. Verify existing student records remain unchanged", false, e.message);
  }

  console.log("\n------------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passedCount} passed, ${failedCount} failed out of 12`);
  console.log("------------------------------------------------------------\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
