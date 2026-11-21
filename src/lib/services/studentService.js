/**
 * Student Service
 * Manages student resident records, directory listing, room allocation, registration, and profile completeness.
 */

import { MOCK_STUDENTS, MOCK_USERS, MOCK_PASSES, MOCK_ROOMS, STORAGE_KEYS, getPersistentMock, setPersistentMock } from "@/lib/mock/index.js";
import { simulateLatency, successResponse, errorResponse, paginate } from "./base.js";
import { generateStudentId } from "@/lib/utils/student-id.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { PASS_STATUSES } from "@/config/status.js";
import { ROLES } from "@/config/roles.js";
import { getCurrentSession } from "./authService.js";
import { getPolicy } from "@/lib/services/settingsService.js";
import { computeBatch, validateRoomMatchesFloor, getRegisterSchema, getFloorForRoom } from "@/lib/validators.js";
import { notificationService } from "./notificationService.js";

/**
 * List students with search, filters and pagination
 */
export async function listStudents({ page = 1, pageSize = 10, search = "", department = "", year = "", floor = "", status = "accepted" } = {}) {
  // 1. Query MySQL API if in browser
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (department) params.set("department", department);
      if (year) params.set("year", String(year));
      if (search) params.set("search", search);
      if (floor) params.set("floor", floor);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const paginationMeta = paginate(json.data, page, pageSize);
          return successResponse(paginationMeta.items, {
            total: paginationMeta.total,
            page: paginationMeta.page,
            pageSize: paginationMeta.pageSize,
            totalPages: paginationMeta.totalPages,
          });
        }
      }
    } catch (e) {
      console.warn("Could not fetch students from MySQL /api/students, falling back:", e);
    }
  }

  await simulateLatency(150, 300);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);

  let filtered = [...students];

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.regNo && s.regNo.toLowerCase().includes(q)) ||
        (s.regNumber && s.regNumber.toLowerCase().includes(q)) ||
        (s.room && s.room.toLowerCase().includes(q)) ||
        (s.roomNo && s.roomNo.toLowerCase().includes(q))
    );
  }

  if (department) {
    filtered = filtered.filter((s) => s.department === department || s.dept === department);
  }

  if (year) {
    filtered = filtered.filter((s) => String(s.year) === String(year));
  }

  if (floor) {
    filtered = filtered.filter((s) => s.floor === floor);
  }

  const paginationMeta = paginate(filtered, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
  });
}

/**
 * Retrieve student by ID or Student Number
 * @param {string} studentId
 */
export async function getStudentById(studentId) {
  await simulateLatency(100, 200);

  // 1. Query MySQL profile API
  if (typeof window !== "undefined" && studentId) {
    try {
      const res = await fetch(`/api/student/profile?studentId=${encodeURIComponent(studentId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          return successResponse(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch student from MySQL API, trying fallback:", e);
    }
  }

  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const userMatch = users.find((u) => u.id === studentId || u.studentId === studentId);

  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const studentMatch = students.find((s) => s.id === studentId || s.studentId === studentId);

  if (!userMatch && !studentMatch) {
    return errorResponse("NOT_FOUND", "Student record not found.");
  }

  const base = studentMatch || {};
  const userObj = userMatch || {};

  const floor = userObj.floor !== undefined ? userObj.floor : (base.floor !== undefined ? base.floor : null);
  const floorConfig = WORKFLOW_CONFIG.floors.find((f) => f.id === floor);
  const floorLabel = floorConfig ? floorConfig.label : (userObj.floorLabel || base.floorLabel || null);

  const room = userObj.room !== undefined ? userObj.room : (userObj.roomNo !== undefined ? userObj.roomNo : (base.room !== undefined ? base.room : (base.roomNo !== undefined ? base.roomNo : null)));

  const merged = {
    ...base,
    ...userObj,
    floor,
    floorLabel,
    room,
    roomNo: room,
    roomNumber: room,
    regNo: userObj.regNo || base.regNo || userObj.regNumber || base.regNumber || "",
    regNumber: userObj.regNumber || base.regNumber || userObj.regNo || base.regNo || "",
    programme: userObj.programme || base.programme || "B.E.",
    section: userObj.section || base.section || "A",
    batch: userObj.batch || base.batch || computeBatch(userObj.year || base.year || 1),
    hostelVerification: userObj.hostelVerification || base.hostelVerification || (floor ? "verified" : "unallocated"),
    guardianName: userObj.guardianName !== undefined ? userObj.guardianName : base.guardianName || "",
    guardianPhone: userObj.guardianPhone !== undefined ? userObj.guardianPhone : base.guardianPhone || "",
    phone: userObj.phone !== undefined ? userObj.phone : base.phone || "",
    photo: userObj.photo || base.photo || userObj.photoDataUrl || base.photoDataUrl || null,
    photoDataUrl: userObj.photoDataUrl || base.photoDataUrl || userObj.photo || base.photo || null,
    bloodGroup: userObj.bloodGroup || base.bloodGroup || "O+ve",
    address: userObj.address !== undefined ? userObj.address : base.address || "",
    dob: userObj.dob || base.dob || "",
    avatar: userObj.avatar || base.avatar || "ST",
  };

  return successResponse(merged);
}

/**
 * Check if a Register Number is already registered
 * @param {object} params
 * @param {string} params.regNo
 * @param {string} [params.excludeStudentId]
 */
export async function checkRegNoAvailable({ regNo, excludeStudentId } = {}) {
  if (!regNo) return { available: true };
  const cleanRegNo = String(regNo).trim().toUpperCase();

  // Check MySQL first
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/check-reg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo: cleanRegNo, excludeStudentId }),
      });
      const data = await res.json();
      if (data && data.available === false) {
        return {
          available: false,
          error: data.error || "REGNO_EXISTS",
          message: data.message || "Register Number is already registered in MySQL.",
        };
      }
    } catch (e) {
      console.warn("Could not check MySQL for regNo, falling back:", e);
    }
  }

  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);

  const existsInStudents = students.some(
    (s) => (s.regNo === cleanRegNo || s.regNumber === cleanRegNo) && s.studentId !== excludeStudentId
  );
  const existsInUsers = users.some(
    (u) => (u.regNo === cleanRegNo || u.regNumber === cleanRegNo) && u.studentId !== excludeStudentId && u.id !== excludeStudentId
  );

  if (existsInStudents || existsInUsers) {
    return { available: false, error: "REGNO_EXISTS", message: "Register number is already registered." };
  }
  return { available: true };
}

/**
 * Check room availability and capacity
 * @param {object} params
 * @param {string} params.floor
 * @param {string} params.roomNo
 */
export async function checkRoomAvailability({ floor, roomNo } = {}) {
  if (!floor || !roomNo) {
    return { available: false, error: "MISSING_PARAMS", message: "Floor and Room Number required." };
  }

  const cleanRoom = String(roomNo).trim().toUpperCase();
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);

  // Count active students in this room
  const occupants = students.filter(
    (s) => s.floor === floor && (s.room === cleanRoom || s.roomNo === cleanRoom || s.roomNumber === cleanRoom)
  );

  const capacity = WORKFLOW_CONFIG.roomCapacity || 4;
  const count = occupants.length;

  if (count >= capacity) {
    return {
      available: false,
      occupied: count,
      capacity,
      error: "ROOM_FULL",
      message: `Room ${cleanRoom} is already at full capacity (${count}/${capacity} residents).`,
    };
  }

  return {
    available: true,
    occupied: count,
    capacity,
  };
}

/**
 * Check profile completeness for a student
 * Required fields: photo, phone, guardianName, guardianPhone, floor & room (unless unallocated)
 * @param {string} studentId
 */
export async function getProfileCompleteness(studentId) {
  await simulateLatency(50, 100);
  const res = await getStudentById(studentId);
  if (!res.ok) {
    return successResponse({
      complete: false,
      percentage: 0,
      missingFields: ["Profile Record"],
      missingFieldKeys: ["all"],
    });
  }

  const s = res.data;
  const missing = [];
  const missingKeys = [];

  // 1. Photo is required
  if (!s.photo && !s.photoDataUrl) {
    missing.push("Profile Photo");
    missingKeys.push("photo");
  }

  // 2. Phone
  if (!s.phone || String(s.phone).trim() === "") {
    missing.push("Phone Number");
    missingKeys.push("phone");
  }

  // 3. Guardian Name
  if (!s.guardianName || String(s.guardianName).trim() === "") {
    missing.push("Guardian Name");
    missingKeys.push("guardianName");
  }

  // 4. Guardian Phone
  if (!s.guardianPhone || String(s.guardianPhone).trim() === "") {
    missing.push("Guardian Phone");
    missingKeys.push("guardianPhone");
  }

  // 5. Home Address
  if (!s.address || String(s.address).trim() === "") {
    missing.push("Home Address");
    missingKeys.push("address");
  }

  // 6. Blood Group
  if (!s.bloodGroup || String(s.bloodGroup).trim() === "") {
    missing.push("Blood Group");
    missingKeys.push("bloodGroup");
  }

  const isUnallocated = s.hostelVerification === "unallocated";
  const totalRequired = 6;
  const filledCount = totalRequired - missing.length;
  const percentage = Math.max(0, Math.min(100, Math.round((filledCount / totalRequired) * 100)));

  return successResponse({
    complete: missing.length === 0,
    percentage,
    missingFields: missing,
    missingFieldKeys: missingKeys,
    isUnallocated,
  });
}

/**
 * Register a new student via the Sign-Up Wizard
 * Strictly enforces active roomAllocationMode and photo policy
 * @param {object} payload
 */
export async function registerStudent(payload) {
  await simulateLatency(300, 600);

  const policy = getPolicy();
  const hasRoomSelection = Boolean(payload?.floor && payload?.roomNo);
  const mode = hasRoomSelection ? (policy.roomAllocationMode || "student_enters") : "warden_allocates";

  // Validate payload against Zod schema
  const schema = getRegisterSchema(mode);
  const parseResult = schema.safeParse(payload);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return errorResponse("VALIDATION_ERROR", firstIssue ? firstIssue.message : "Invalid registration details.");
  }

  const data = parseResult.data;

  // 1. Check duplicate email
  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);

  const cleanEmail = data.email.trim().toLowerCase();
  const emailTaken = users.some((u) => u.email && u.email.toLowerCase() === cleanEmail) ||
    students.some((s) => s.email && s.email.toLowerCase() === cleanEmail);

  if (emailTaken) {
    return errorResponse("EMAIL_EXISTS", "An account with this email address already exists.");
  }

  // 2. Check duplicate Register Number
  const regNoCheck = await checkRegNoAvailable({ regNo: data.regNo });
  if (!regNoCheck.available) {
    return errorResponse("REGNO_EXISTS", regNoCheck.message || "This Register Number is already registered.");
  }

  // 3. Handle Hostel Allocation according to roomAllocationMode
  let floor = null;
  let floorLabel = null;
  let roomNo = data.roomNo ? String(data.roomNo).trim().toUpperCase() : null;
  let hostelVerification = roomNo ? "allocated" : "unallocated";

  if (roomNo) {
    floor = data.floor || getFloorForRoom(roomNo);
    const flConfig = WORKFLOW_CONFIG.floors?.find((f) => f.id === floor);
    floorLabel = flConfig ? flConfig.label : floor;
  } else if (hasRoomSelection && mode === "student_enters") {
    floor = data.floor;
    const flConfig = WORKFLOW_CONFIG.floors?.find((f) => f.id === floor);
    floorLabel = flConfig ? flConfig.label : floor;
    roomNo = data.roomNo;
    hostelVerification = "pending";
  } else {
    // Mode is warden_allocates and no room provided: floor & room null
    floor = null;
    floorLabel = null;
    roomNo = null;
    hostelVerification = "unallocated";
  }

  // 4. Save directly into MySQL database (Do NOT store in browser mock storage)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: cleanEmail,
          dept: data.dept,
          year: data.year,
          phone: data.phone || "",
          regNo: data.regNo,
          guardianName: data.guardianName || "",
          guardianPhone: data.guardianPhone || "",
          guardianRelation: data.guardianRelation || "Father",
          floor,
          roomNo,
          photoDataUrl: data.photoDataUrl || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return errorResponse(
          json.code || "REGISTRATION_FAILED",
          json.message || "Failed to create resident account in MySQL."
        );
      }

      // DO NOT store in browser localStorage. Return real MySQL database record.
      return successResponse(json.data);
    } catch (apiErr) {
      console.error("MySQL registration API failed:", apiErr);
      return errorResponse("NETWORK_ERROR", "Could not connect to MySQL database service.");
    }
  }

  // Server-side fallback: Generate Student ID (e.g. CSE-1-002)
  const existingIds = [
    ...students.map((s) => s.studentId || s.id),
    ...users.map((u) => u.studentId || u.id),
  ];

  const studentId = generateStudentId({
    dept: data.dept,
    year: data.year,
    existingIds,
  });

  const defaultPassword = WORKFLOW_CONFIG.defaultPassword;

  // 5. Construct full record
  const newStudent = {
    id: studentId,
    studentId,
    name: data.name.trim(),
    email: cleanEmail,
    department: data.dept,
    dept: data.dept,
    year: Number(data.year),
    programme: data.programme,
    section: data.section,
    batch,
    regNumber: data.regNo,
    regNo: data.regNo,
    floor,
    floorLabel,
    room: roomNo,
    roomNo,
    roomNumber: roomNo,
    bed: roomNo ? "Bed A" : null,
    hostelVerification,
    phone: data.phone ? String(data.phone).trim() : "",
    guardianName: data.guardianName ? String(data.guardianName).trim() : "",
    guardianPhone: data.guardianPhone ? String(data.guardianPhone).trim() : "",
    guardianRelation: data.guardianRelation || "Father",
    photo: data.photoDataUrl || null,
    photoDataUrl: data.photoDataUrl || null,
    avatar: data.name.slice(0, 2).toUpperCase(),
    status: "Active",
    role: "student",
    mustChangePassword: true,
    defaultPassword,
    createdAt: new Date().toISOString(),
  };

  return successResponse({
    studentId,
    defaultPassword,
    user: newStudent,
    mode,
  });
}

/**
 * Warden allocates or changes a student's room
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.floor
 * @param {string} params.roomNo
 * @param {string} [params.actor]
 */
export async function allocateRoom({ studentId, floor, roomNo, actor = "Chief Warden" } = {}) {
  await simulateLatency(200, 400);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  // Check room capacity
  const check = await checkRoomAvailability({ floor, roomNo });
  if (!check.available) {
    return errorResponse("ROOM_FULL", check.message || "Room is full.");
  }

  const flConfig = WORKFLOW_CONFIG.floors.find((f) => f.id === floor);
  const floorLabel = flConfig ? flConfig.label : floor;

  const patch = {
    floor,
    floorLabel,
    room: roomNo,
    roomNo,
    roomNumber: roomNo,
    hostelVerification: "verified",
  };

  const updateRes = await updateStudent(studentId, patch);
  if (!updateRes.ok) return updateRes;

  // Create notification
  try {
    await notificationService.createNotification({
      userId: studentId,
      studentId,
      type: "announcement",
      category: "room",
      title: "Hostel Room Allocated",
      message: `Your hostel room has been allocated: ${floorLabel}, Room ${roomNo}.`,
      author: actor,
    });
  } catch (e) {
    console.warn("Could not send room allocation notification:", e);
  }

  return updateRes;
}

/**
 * Update hostel verification status
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.status - 'verified' | 'pending' | 'unallocated' | 'needs_correction'
 * @param {string} [params.note]
 */
export async function setHostelVerification({ studentId, status, note } = {}) {
  await simulateLatency(150, 300);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  const patch = { hostelVerification: status };
  return updateStudent(studentId, patch);
}

/**
 * Enroll a new student, legacy helper
 */
export async function createStudent(studentData) {
  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  return registerStudent(studentData);
}

/**
 * Update an existing student record (Profile update)
 * Synchronizes with persistent users, students, and active session
 * @param {string} studentId
 * @param {object} patch
 */
export async function updateStudent(studentId, patch) {
  await simulateLatency(200, 400);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  if (callerRole === ROLES.PRINCIPAL || callerRole === ROLES.CORRESPONDENT) {
    return errorResponse("NOT_ALLOWED", "Principal and Correspondent have read-only oversight access.");
  }

  // Handle permanent photo upload to MySQL backend
  if (patch.photo || patch.photoDataUrl) {
    const rawPhoto = patch.photo || patch.photoDataUrl;
    if (typeof window !== "undefined" && rawPhoto && String(rawPhoto).startsWith("data:")) {
      try {
        const photoRes = await fetch("/api/student/profile/photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-student-id": studentId,
          },
          body: JSON.stringify({
            studentId,
            photoDataUrl: rawPhoto,
            fileName: "resident-photo.jpg",
          }),
        });
        const photoJson = await photoRes.json();
        if (photoJson.ok && photoJson.photoUrl) {
          patch.photo = photoJson.photoUrl;
          patch.photoUrl = photoJson.photoUrl;
          patch.photoDataUrl = photoJson.photoUrl;
        }
      } catch (err) {
        console.warn("Could not save photo to MySQL backend:", err);
      }
    }
  }

  // 1. Update in USERS
  const users = getPersistentMock(STORAGE_KEYS.USERS, MOCK_USERS);
  const userIdx = users.findIndex((u) => u.id === studentId || u.studentId === studentId);
  let updatedUser = null;

  if (userIdx !== -1) {
    const cur = users[userIdx];
    const floor = patch.floor !== undefined ? patch.floor : cur.floor;
    const flConfig = WORKFLOW_CONFIG.floors.find((f) => f.id === floor);
    const floorLabel = flConfig ? flConfig.label : (patch.floorLabel || cur.floorLabel || null);
    const room = patch.roomNo !== undefined ? patch.roomNo : (patch.room !== undefined ? patch.room : cur.room);

    updatedUser = {
      ...cur,
      ...patch,
      floor,
      floorLabel,
      room,
      roomNo: room,
      roomNumber: room,
      updatedAt: new Date().toISOString(),
    };
    users[userIdx] = updatedUser;
    setPersistentMock(STORAGE_KEYS.USERS, users);
  }

  // 2. Update in STUDENTS
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const studentIdx = students.findIndex((s) => s.id === studentId || s.studentId === studentId);
  let updatedStudent = null;

  if (studentIdx !== -1) {
    const cur = students[studentIdx];
    const floor = patch.floor !== undefined ? patch.floor : cur.floor;
    const flConfig = WORKFLOW_CONFIG.floors.find((f) => f.id === floor);
    const floorLabel = flConfig ? flConfig.label : (patch.floorLabel || cur.floorLabel || null);
    const room = patch.roomNo !== undefined ? patch.roomNo : (patch.room !== undefined ? patch.room : cur.room);

    updatedStudent = {
      ...cur,
      ...patch,
      floor,
      floorLabel,
      room,
      roomNo: room,
      roomNumber: room,
      updatedAt: new Date().toISOString(),
    };
    students[studentIdx] = updatedStudent;
    setPersistentMock(STORAGE_KEYS.STUDENTS, students);
  }

  const finalRecord = updatedUser || updatedStudent || { studentId, ...patch };

  // 3. Update localStorage session if current user matches
  if (typeof window !== "undefined") {
    try {
      const sessionRaw = localStorage.getItem("dmi_auth_session_v2");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.user && (session.user.studentId === studentId || session.user.id === studentId)) {
          session.user = { ...session.user, ...finalRecord };
          localStorage.setItem("dmi_auth_session_v2", JSON.stringify(session));
        }
      }
    } catch (e) {
      console.warn("Could not sync local session user:", e);
    }
  }

  return successResponse(finalRecord);
}

export const updateStudentProfile = updateStudent;

/**
 * Get aggregate statistics for students
 */
export async function getStudentStats() {
  await simulateLatency(150, 300);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  return successResponse({
    totalResidents: students.length,
    activeInside: Math.round(students.length * 0.82),
    currentlyOutside: Math.round(students.length * 0.18),
    totalRooms: 120,
    occupancyRate: "92%",
  });
}

/**
 * Helper to get current staff or hod user from session or fallback
 */
function getActiveStaffOrHod() {
  const session = getCurrentSession();
  if (session?.user && (session.user.role === ROLES.STAFF || session.user.role === ROLES.HOD)) {
    return session.user;
  }
  return MOCK_USERS.find((u) => u.role === ROLES.STAFF) || MOCK_USERS[3];
}

/**
 * List students scoped to active staff/hod department and assigned years
 */
export async function listForDepartment({ filters = {}, page = 1, pageSize = 20 } = {}) {
  await simulateLatency(150, 300);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";
  const isStaff = user.role === ROLES.STAFF;
  const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

  let students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/students?department=${encodeURIComponent(dept)}&status=accepted`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          students = json.data;
        }
      }
    } catch (e) {
      console.warn("Could not fetch department students from MySQL:", e);
    }
  }
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Department & Year scope
  let deptStudents = students.filter((s) => {
    const sDept = s.department || s.dept || "";
    if (sDept !== dept) return false;
    if (isStaff && assignedYears.length > 0) {
      return assignedYears.includes(Number(s.year));
    }
    return true;
  });

  // Calculate current month date bounds for home pass counts
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  // Enrich each student with campusStatus, homePassesUsed, lateReturnsCount
  const enriched = deptStudents.map((s) => {
    const studentPasses = passes.filter((p) => p.studentId === s.id || p.studentId === s.studentId);
    
    // Check active status
    const overduePass = studentPasses.find((p) => p.status === PASS_STATUSES.OVERDUE);
    const outPass = studentPasses.find((p) => p.status === PASS_STATUSES.OUT);

    let campusStatus = "in_campus";
    let activePass = null;
    if (overduePass) {
      campusStatus = "overdue";
      activePass = overduePass;
    } else if (outPass) {
      campusStatus = "out";
      activePass = outPass;
    }

    // Home passes used this month
    const homePassesThisMonth = studentPasses.filter((p) => {
      if ((p.type || "").toLowerCase() !== "home pass") return false;
      const passDate = new Date(p.appliedAt || p.departureTime || p.fromTime || 0);
      return (
        passDate.getFullYear() === currentYear &&
        passDate.getMonth() === currentMonth &&
        ["approved", "gate_pass_issued", "out", "returned", "overdue"].includes(p.status)
      );
    }).length;

    // Late returns in last 90 days
    const lateReturnsCount = studentPasses.filter((p) => {
      const passDate = new Date(p.actualReturnTime || p.appliedAt || 0);
      if (passDate < ninetyDaysAgo) return false;
      if (p.isLate || p.status === PASS_STATUSES.OVERDUE) return true;
      if (p.timeline && p.timeline.some((t) => t.status === "overdue" || (t.note && t.note.toLowerCase().includes("late")))) {
        return true;
      }
      return false;
    }).length;

    return {
      ...s,
      campusStatus,
      activePass,
      homePassesUsedThisMonth: homePassesThisMonth,
      lateReturnsCount: lateReturnsCount,
    };
  });

  let filtered = [...enriched];

  // Filters
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.regNo && s.regNo.toLowerCase().includes(q)) ||
        (s.room && s.room.toLowerCase().includes(q)) ||
        (s.roomNo && s.roomNo.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }

  if (filters.year && filters.year !== "all") {
    filtered = filtered.filter((s) => String(s.year) === String(filters.year));
  }

  if (filters.floor && filters.floor !== "all") {
    filtered = filtered.filter((s) => s.floor === filters.floor);
  }

  if (filters.campusStatus && filters.campusStatus !== "all") {
    filtered = filtered.filter((s) => s.campusStatus === filters.campusStatus);
  }

  if (filters.homePassesUsed && filters.homePassesUsed !== "all") {
    filtered = filtered.filter((s) => String(s.homePassesUsedThisMonth) === String(filters.homePassesUsed));
  }

  if (filters.lateReturns === "has_late") {
    filtered = filtered.filter((s) => s.lateReturnsCount > 0);
  } else if (filters.lateReturns === "repeat_late") {
    filtered = filtered.filter((s) => s.lateReturnsCount >= 2);
  }

  const paginationMeta = paginate(filtered, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
  });
}

/**
 * Get student details scoped strictly to user department and assigned years
 */
export async function getByIdScoped(studentId) {
  await simulateLatency(100, 200);

  const session = getCurrentSession();
  const callerRole = session?.user?.role || session?.role;
  const isCampusWide =
    callerRole === ROLES.PRINCIPAL ||
    callerRole === ROLES.CORRESPONDENT ||
    callerRole === ROLES.WARDEN;

  const studentRes = await getStudentById(studentId);
  if (!studentRes.ok) return studentRes;

  const student = studentRes.data;

  if (!isCampusWide) {
    const user = getActiveStaffOrHod();
    const dept = user.dept || user.department || "CSE";
    const isStaff = user.role === ROLES.STAFF;
    const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

    const sDept = student.department || student.dept || "";
    if (sDept !== dept) {
      return errorResponse("NOT_ALLOWED", "Student record is out of your department scope.");
    }

    if (isStaff && assignedYears.length > 0 && !assignedYears.includes(Number(student.year))) {
      return errorResponse("NOT_ALLOWED", "Student belongs to an unassigned year.");
    }
  }

  // Enrich with pass history
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const studentPasses = passes
    .filter((p) => p.studentId === student.id || p.studentId === student.studentId)
    .sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));

  const overduePass = studentPasses.find((p) => p.status === PASS_STATUSES.OVERDUE);
  const outPass = studentPasses.find((p) => p.status === PASS_STATUSES.OUT);
  let campusStatus = "in_campus";
  if (overduePass) campusStatus = "overdue";
  else if (outPass) campusStatus = "out";

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const lateReturnsCount = studentPasses.filter((p) => {
    const passDate = new Date(p.actualReturnTime || p.appliedAt || 0);
    return passDate >= ninetyDaysAgo && (p.isLate || p.status === PASS_STATUSES.OVERDUE);
  }).length;

  return successResponse({
    ...student,
    campusStatus,
    activePass: overduePass || outPass || null,
    passes: studentPasses,
    lateReturnsCount,
  });
}

/**
 * Get room allocation list with optional floor filter
 */
export async function getRooms({ floor = "all" } = {}) {
  await simulateLatency(100, 200);
  const rooms = getPersistentMock(STORAGE_KEYS.ROOMS, MOCK_ROOMS);
  const filtered = floor === "all" ? rooms : rooms.filter((r) => r.floor === floor);
  return successResponse(filtered);
}

export const studentService = {
  listStudents,
  listForDepartment,
  getStudentById,
  getByIdScoped,
  checkRegNoAvailable,
  checkRoomAvailability,
  getProfileCompleteness,
  registerStudent,
  allocateRoom,
  setHostelVerification,
  createStudent,
  updateStudent,
  updateStudentProfile,
  getStudentStats,
  getRooms,
};

export default studentService;
