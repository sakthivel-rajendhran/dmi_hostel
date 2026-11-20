import { MOCK_STUDENTS, MOCK_PASSES, MOCK_USERS, MOCK_SECURITY_LOGS, getPersistentMock, STORAGE_KEYS } from "@/lib/mock/index.js";
import { PASS_STATUSES } from "@/config/status.js";
import { ROLES } from "@/config/roles.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { getPolicy } from "./settingsService.js";
import { getCurrentSession } from "./authService.js";
import { simulateLatency, successResponse, paginate } from "./base.js";

/**
 * Helper to compute date range window boundaries
 * @param {string|object} range
 */
function getRangeWindow(range = "this_month") {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (typeof range === "object" && range?.start && range?.end) {
    return { start: new Date(range.start), end: new Date(range.end) };
  }

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "7days":
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case "this_semester":
      start = new Date(now.getTime() - 180 * 86400000); // 6 months
      break;
    case "this_month":
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
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
 * Summary analytics for a specific department (Staff / HOD)
 * @param {string} department
 */
export async function deptSummary(department = "CSE") {
  await simulateLatency(350, 600);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS).filter((s) => (s.department || s.dept) === department);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES).filter((p) => (p.department || p.dept) === department);

  return successResponse({
    department,
    totalStudents: students.length,
    activePasses: passes.filter((p) => p.status === "out" || p.status === "approved").length,
    pendingRecommendations: passes.filter((p) => p.status === "pending").length,
    approvalRate: "94.2%",
    monthlyTrend: [
      { month: "Jul", count: 18 },
      { month: "Aug", count: 24 },
      { month: "Sep", count: 32 },
      { month: "Oct", count: 28 },
      { month: "Nov", count: 35 },
    ],
  });
}

/**
 * Get full real-time department dashboard metrics, KPIs, needs attention list, and movements
 */
export async function departmentDashboard() {
  await simulateLatency(200, 350);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";
  const isStaff = user.role === ROLES.STAFF;
  const assignedYears = Array.isArray(user.assignedYears) ? user.assignedYears : [];

  const allStudents = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const allPasses = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  // Scoped students
  const deptStudents = allStudents.filter((s) => {
    if ((s.department || s.dept) !== dept) return false;
    if (isStaff && assignedYears.length > 0) {
      return assignedYears.includes(Number(s.year));
    }
    return true;
  });

  // Scoped passes
  const deptPasses = allPasses.filter((p) => {
    if ((p.department || p.dept) !== dept) return false;
    if (isStaff && assignedYears.length > 0) {
      return assignedYears.includes(Number(p.year));
    }
    return true;
  });

  const studentIdSet = new Set(deptStudents.map((s) => s.id));

  // Compute live presence
  const overduePasses = deptPasses.filter((p) => p.status === PASS_STATUSES.OVERDUE);
  const outPasses = deptPasses.filter((p) => p.status === PASS_STATUSES.OUT);

  const outLocalPasses = outPasses.filter((p) => (p.type || "").toLowerCase().includes("local"));
  const outHomePasses = outPasses.filter((p) => (p.type || "").toLowerCase().includes("home"));

  const outStudentIds = new Set([...overduePasses, ...outPasses].map((p) => p.studentId));
  const inCampusCount = deptStudents.filter((s) => !outStudentIds.has(s.id)).length;

  const awaitingRecPasses = deptPasses.filter(
    (p) => p.status === PASS_STATUSES.PENDING && !(p.recommendations || []).some((r) => r.byId === user.id)
  );

  const emergencyPendingPasses = deptPasses.filter(
    (p) => p.emergency === true && p.status === PASS_STATUSES.PENDING
  );

  // Needs Attention list: overdue + emergency
  const needsAttention = [
    ...overduePasses.map((p) => {
      const student = deptStudents.find((s) => s.id === p.studentId) || {};
      return {
        id: p.id,
        type: "overdue",
        passId: p.id,
        passNumber: p.passNumber,
        studentName: p.studentName,
        studentId: p.studentId,
        year: p.year,
        room: p.room || p.roomNo || student.roomNo || "Room",
        floor: p.floorLabel || "Floor",
        destination: p.destination,
        phone: p.phone || student.phone || "+91 98765 00000",
        guardianPhone: p.guardianPhone || student.guardianPhone || "+91 98765 00001",
        expectedReturnTime: p.expectedReturnTime || p.toTime,
        departureTime: p.actualExitTime || p.departureTime,
      };
    }),
    ...emergencyPendingPasses.map((p) => {
      const student = deptStudents.find((s) => s.id === p.studentId) || {};
      return {
        id: p.id,
        type: "emergency",
        passId: p.id,
        passNumber: p.passNumber,
        studentName: p.studentName,
        studentId: p.studentId,
        year: p.year,
        room: p.room || p.roomNo || student.roomNo || "Room",
        floor: p.floorLabel || "Floor",
        destination: p.destination,
        reason: p.reason,
        phone: p.phone || student.phone || "+91 98765 00000",
        guardianPhone: p.guardianPhone || student.guardianPhone || "+91 98765 00001",
        appliedAt: p.appliedAt,
      };
    }),
  ];

  // Movements today (scoped)
  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const movements = deptPasses
    .filter((p) => {
      const exitDate = p.actualExitTime ? p.actualExitTime.slice(0, 10) : "";
      const returnDate = p.actualReturnTime ? p.actualReturnTime.slice(0, 10) : "";
      return exitDate === todayDateStr || returnDate === todayDateStr || p.status === PASS_STATUSES.OUT;
    })
    .map((p) => {
      const isReturned = p.status === PASS_STATUSES.RETURNED && p.actualReturnTime;
      return {
        id: `move-${p.id}`,
        passId: p.id,
        passNumber: p.passNumber,
        studentName: p.studentName,
        studentId: p.studentId,
        year: p.year,
        type: p.type,
        direction: isReturned ? "ENTRY" : "EXIT",
        timestamp: isReturned ? p.actualReturnTime : p.actualExitTime || p.fromTime,
        destination: p.destination,
        gate: "Main Gate (Palanchur)",
        isLate: p.isLate || p.status === PASS_STATUSES.OVERDUE,
      };
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 10);

  // HOD Month Overview Strip
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthPasses = deptPasses.filter((p) => {
    const d = new Date(p.appliedAt || p.fromTime || 0);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthReturned = monthPasses.filter((p) => p.status === PASS_STATUSES.RETURNED);
  const onTimeCount = monthReturned.filter((p) => !p.isLate).length;
  const onTimeRate = monthReturned.length > 0 ? Math.round((onTimeCount / monthReturned.length) * 100) : 98;

  return successResponse({
    userDept: dept,
    assignedYears,
    isStaff,
    kpis: {
      inScope: deptStudents.length,
      inCampus: inCampusCount,
      outLocal: outLocalPasses.length,
      outHome: outHomePasses.length,
      overdue: overduePasses.length,
      awaitingRecommendation: awaitingRecPasses.length,
    },
    needsAttention,
    movements,
    hodOverview: {
      monthTotalPasses: monthPasses.length || 28,
      onTimeReturnRate: `${onTimeRate}%`,
      topDestination: "Town Market & Hometown",
    },
  });
}

/**
 * Pollable movement feed for department students
 */
export async function departmentMovements() {
  const dashRes = await departmentDashboard();
  if (!dashRes.ok) return dashRes;
  return successResponse(dashRes.data.movements || []);
}

/**
 * In-depth departmental analytics for HOD
 * @param {object} params
 * @param {'this_month'|'last_month'|'this_semester'|'custom'} [params.range]
 */
export async function departmentAnalytics({ range = "this_month", customStart, customEnd } = {}) {
  await simulateLatency(250, 450);
  const user = getActiveStaffOrHod();
  const dept = user.dept || user.department || "CSE";

  const allStudents = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const allPasses = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const deptStudents = allStudents.filter((s) => (s.department || s.dept) === dept);
  const deptPasses = allPasses.filter((p) => (p.department || p.dept) === dept);

  // KPIs
  const totalRequests = deptPasses.length;
  const approvedPasses = deptPasses.filter((p) =>
    [PASS_STATUSES.APPROVED, PASS_STATUSES.GATE_PASS_ISSUED, PASS_STATUSES.OUT, PASS_STATUSES.RETURNED].includes(p.status)
  );
  const rejectedPasses = deptPasses.filter((p) => p.status === PASS_STATUSES.REJECTED);
  const overduePasses = deptPasses.filter((p) => p.status === PASS_STATUSES.OVERDUE || p.isLate);

  const approvalRate = totalRequests > 0 ? Math.round((approvedPasses.length / totalRequests) * 100) : 92;
  const rejectionRate = totalRequests > 0 ? Math.round((rejectedPasses.length / totalRequests) * 100) : 4;
  const lateRate = totalRequests > 0 ? Math.round((overduePasses.length / totalRequests) * 100) : 4;

  // Monthly trend (last 6 months)
  const monthlyTrend = [
    { month: "Jun", local: 24, home: 18, total: 42 },
    { month: "Jul", local: 32, home: 22, total: 54 },
    { month: "Aug", local: 40, home: 28, total: 68 },
    { month: "Sep", local: 36, home: 26, total: 62 },
    { month: "Oct", local: 45, home: 35, total: 80 },
    { month: "Nov", local: 38, home: 30, total: 68 },
  ];

  // Passes by year
  const passesByYear = [
    { year: "1st Year", count: deptPasses.filter((p) => Number(p.year) === 1).length || 14 },
    { year: "2nd Year", count: deptPasses.filter((p) => Number(p.year) === 2).length || 26 },
    { year: "3rd Year", count: deptPasses.filter((p) => Number(p.year) === 3).length || 42 },
    { year: "4th Year", count: deptPasses.filter((p) => Number(p.year) === 4).length || 38 },
  ];

  // Peak exit days
  const peakExitDays = [
    { day: "Mon", count: 12 },
    { day: "Tue", count: 8 },
    { day: "Wed", count: 15 },
    { day: "Thu", count: 14 },
    { day: "Fri", count: 48 },
    { day: "Sat", count: 56 },
    { day: "Sun", count: 32 },
  ];

  // Peak exit hours
  const peakExitHours = [
    { hour: "06:00", count: 4 },
    { hour: "08:00", count: 14 },
    { hour: "10:00", count: 8 },
    { hour: "12:00", count: 12 },
    { hour: "14:00", count: 22 },
    { hour: "16:00", count: 38 },
    { hour: "18:00", count: 42 },
    { hour: "20:00", count: 10 },
  ];

  // Status donut
  const statusDonut = [
    { name: "Approved / Issued", value: approvedPasses.length || 38, color: "#10B981" },
    { name: "Pending Review", value: deptPasses.filter((p) => p.status === PASS_STATUSES.PENDING).length || 6, color: "#F59E0B" },
    { name: "Returned On Time", value: deptPasses.filter((p) => p.status === PASS_STATUSES.RETURNED && !p.isLate).length || 28, color: "#0D9488" },
    { name: "Overdue / Late", value: overduePasses.length || 4, color: "#EF4444" },
    { name: "Rejected", value: rejectedPasses.length || 2, color: "#6B7280" },
  ];

  // Late returns trend
  const lateReturnsTrend = [
    { week: "Week 1", count: 1 },
    { week: "Week 2", count: 3 },
    { week: "Week 3", count: 2 },
    { week: "Week 4", count: 1 },
    { week: "Week 5", count: 4 },
    { week: "Week 6", count: 2 },
  ];

  // Frequent leavers (Top 10)
  const passCountByStudent = {};
  deptPasses.forEach((p) => {
    passCountByStudent[p.studentId] = (passCountByStudent[p.studentId] || 0) + 1;
  });

  const frequentLeavers = Object.entries(passCountByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([studentId, totalPasses]) => {
      const student = deptStudents.find((s) => s.id === studentId) || {};
      const studentPasses = deptPasses.filter((p) => p.studentId === studentId);
      const lateCount = studentPasses.filter((p) => p.isLate || p.status === PASS_STATUSES.OVERDUE).length;
      return {
        studentId,
        studentName: student.name || "Student Resident",
        year: student.year || 3,
        floor: student.floorLabel || "3rd Floor",
        room: student.roomNo || "304",
        totalPasses,
        localPasses: studentPasses.filter((p) => (p.type || "").toLowerCase().includes("local")).length,
        homePasses: studentPasses.filter((p) => (p.type || "").toLowerCase().includes("home")).length,
        lateCount,
      };
    });

  // Late return watchlist (>= 2 late returns in 90 days)
  const lateWatchlist = deptStudents
    .map((s) => {
      const sPasses = deptPasses.filter((p) => p.studentId === s.id);
      const lateCount = sPasses.filter((p) => p.isLate || p.status === PASS_STATUSES.OVERDUE).length;
      return {
        studentId: s.id,
        studentName: s.name,
        year: s.year,
        room: s.roomNo,
        floor: s.floorLabel,
        phone: s.phone,
        guardianPhone: s.guardianPhone,
        lateReturnsCount: lateCount,
        lastLateDate: sPasses.find((p) => p.isLate || p.status === PASS_STATUSES.OVERDUE)?.actualReturnTime || "2026-11-10",
      };
    })
    .filter((s) => s.lateReturnsCount >= 1)
    .sort((a, b) => b.lateReturnsCount - a.lateReturnsCount);

  // Staff activity
  const staffActivity = [
    {
      name: "Prof. Rajesh Sharma",
      role: "Faculty Advisor",
      assignedYears: "3rd Year",
      recommended: 32,
      notRecommended: 2,
      avgTurnaround: "1.4 hrs",
      pending: 3,
    },
    {
      name: "Prof. Anand Kumar",
      role: "Faculty Advisor",
      assignedYears: "1st & 2nd Year",
      recommended: 26,
      notRecommended: 1,
      avgTurnaround: "2.1 hrs",
      pending: 2,
    },
    {
      name: "Dr. Meenakshi Sundaram",
      role: "HOD",
      assignedYears: "All Years (CSE)",
      recommended: 18,
      notRecommended: 0,
      avgTurnaround: "0.8 hrs",
      pending: 1,
    },
  ];

  return successResponse({
    department: dept,
    range,
    kpis: {
      totalRequests,
      approvalRate: `${approvalRate}%`,
      rejectionRate: `${rejectionRate}%`,
      avgRecommendationTime: "1.6 hrs",
      lateReturnsRate: `${lateRate}%`,
      overdueIncidents: overduePasses.length,
      mostActiveYear: "3rd Year",
    },
    monthlyTrend,
    passesByYear,
    peakExitDays,
    peakExitHours,
    statusDonut,
    lateReturnsTrend,
    frequentLeavers,
    lateWatchlist,
    staffActivity,
  });
}

/**
 * Institutional campus-wide summary (Principal / Correspondent)
 */
export async function campusOverview({ range = "this_month" } = {}) {
  await simulateLatency(250, 450);
  const { start, end } = getRangeWindow(range);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);

  const policy = getPolicy();
  const roomsPerFloor = policy.roomsPerFloor || 30;
  const roomCapacity = policy.roomCapacity || 4;
  const totalCapacity = (policy.floors?.length || 4) * roomsPerFloor * roomCapacity; // 480 beds

  // Real-time status
  const overduePasses = passes.filter((p) => p.status === PASS_STATUSES.OVERDUE);
  const outPasses = passes.filter((p) => p.status === PASS_STATUSES.OUT);
  const outLocal = outPasses.filter((p) => (p.type || "").toLowerCase().includes("local")).length;
  const outHome = outPasses.filter((p) => (p.type || "").toLowerCase().includes("home")).length;

  const totalEnrolled = students.length;
  const totalOutside = overduePasses.length + outPasses.length;
  const inCampus = Math.max(0, totalEnrolled - totalOutside);
  const occupancyPct = Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100));

  // Range-scoped passes and late returns
  const passesInRange = passes.filter((p) => {
    const d = new Date(p.appliedAt || p.departureTime || 0);
    return d >= start && d <= end;
  });

  const lateInRange = passes.filter((p) => {
    const d = new Date(p.actualReturnTime || p.appliedAt || 0);
    return d >= start && d <= end && (p.isLate || p.status === PASS_STATUSES.OVERDUE);
  }).length;

  // KPIs with sparklines and deltas
  const kpis = {
    totalHostelStudents: {
      value: totalEnrolled,
      label: "Hostel Students",
      delta: "+5% vs last term",
      sparkline: [36, 37, 38, 38, 39, 40, 40],
    },
    inCampus: {
      value: inCampus,
      label: "Inside Campus",
      delta: `${Math.round((inCampus / totalEnrolled) * 100)}% of residents`,
      sparkline: [32, 34, 33, 35, 31, 33, inCampus],
    },
    outLocal: {
      value: outLocal,
      label: "Out (Local Pass)",
      delta: "Curfew 21:00",
      sparkline: [3, 4, 2, 5, 3, 2, outLocal],
    },
    outHome: {
      value: outHome,
      label: "Out (Home Pass)",
      delta: "Weekend leaves",
      sparkline: [2, 1, 3, 2, 4, 3, outHome],
    },
    overdueNow: {
      value: overduePasses.length,
      label: "Curfew Overdue Now",
      delta: overduePasses.length > 0 ? "Requires Warden Followup" : "All cleared",
      isAlert: overduePasses.length > 0,
      sparkline: [1, 2, 0, 1, 0, 1, overduePasses.length],
    },
    lateReturnsInRange: {
      value: lateInRange,
      label: "Late Returns in Range",
      delta: `${lateInRange > 0 ? "+2" : "0"} vs prev window`,
      sparkline: [2, 3, 4, 3, 5, 4, lateInRange],
    },
    passesInRange: {
      value: passesInRange.length,
      label: "Total Passes Issued",
      delta: "+12% activity",
      sparkline: [15, 20, 18, 22, 25, 28, passesInRange.length],
    },
    hostelOccupancy: {
      value: `${occupancyPct}%`,
      label: "Hostel Bed Occupancy",
      sublabel: `${totalEnrolled} / ${totalCapacity} Beds`,
      delta: "Optimal utilization",
      sparkline: [75, 78, 80, 82, 82, 83, occupancyPct],
    },
  };

  // 1. Movements by hour of day (0 to 23)
  const hourMap = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    exits: 0,
    entries: 0,
  }));
  logs.forEach((log) => {
    const d = new Date(log.timestamp || 0);
    const h = d.getHours();
    if (h >= 0 && h < 24) {
      if (log.type === "EXIT") hourMap[h].exits += 1;
      else hourMap[h].entries += 1;
    }
  });

  // 2. Movements by day of week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMap = daysOfWeek.map((d) => ({ day: d, exits: 0, entries: 0 }));
  logs.forEach((log) => {
    const d = new Date(log.timestamp || 0);
    const dayName = daysOfWeek[d.getDay()];
    const found = dayMap.find((x) => x.day === dayName);
    if (found) {
      if (log.type === "EXIT") found.exits += 1;
      else found.entries += 1;
    }
  });

  // 3. Passes stacked by month (Local vs Home with baseline)
  const passesStacked = [
    { period: "Jun", local: 28, home: 14, previousPeriod: 38 },
    { period: "Jul", local: 34, home: 18, previousPeriod: 46 },
    { period: "Aug", local: 42, home: 22, previousPeriod: 54 },
    { period: "Sep", local: 38, home: 19, previousPeriod: 52 },
    { period: "Oct", local: 45, home: 26, previousPeriod: 62 },
    { period: "Nov", local: 50, home: 30, previousPeriod: 68 },
  ];

  // 4. Status Donut
  const statusDonut = [
    { name: "In Campus", value: inCampus, color: "#10B981" },
    { name: "Local Pass", value: outLocal, color: "#0EA5E9" },
    { name: "Home Pass", value: outHome, color: "#8B5CF6" },
    { name: "Curfew Overdue", value: overduePasses.length, color: "#EF4444" },
  ];

  // 5. Floor Occupancy (4 horizontal bars)
  const floorOccupancy = (policy.floors || WORKFLOW_CONFIG.floors).map((fl) => {
    const floorStudents = students.filter((s) => s.floor === fl.id).length;
    const capacity = roomsPerFloor * roomCapacity; // 120 beds
    return {
      floorId: fl.id,
      floorLabel: fl.label,
      occupied: floorStudents,
      capacity,
      pct: Math.min(100, Math.round((floorStudents / capacity) * 100)),
    };
  });

  // 6. Principal Default: Department Comparison Bar
  const deptComparison = WORKFLOW_CONFIG.departments.map((d) => {
    const deptStudents = students.filter((s) => (s.department || s.dept) === d.code);
    const deptPasses = passesInRange.filter((p) => (p.department || p.dept) === d.code);
    const deptOut = passes.filter((p) => (p.department || p.dept) === d.code && (p.status === "out" || p.status === "overdue")).length;
    const deptLate = deptPasses.filter((p) => p.isLate || p.status === "overdue").length;
    const lateRate = deptPasses.length > 0 ? Math.round((deptLate / deptPasses.length) * 100) : 0;
    return {
      code: d.code,
      name: d.name,
      studentsCount: deptStudents.length,
      studentsOut: deptOut,
      lateReturnRate: lateRate,
    };
  });

  // 7. Frequent leavers strip
  const passCountByStudent = {};
  passesInRange.forEach((p) => {
    const sId = p.studentId;
    passCountByStudent[sId] = (passCountByStudent[sId] || 0) + 1;
  });
  const frequentLeavers = Object.entries(passCountByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sId, count]) => {
      const st = students.find((s) => s.studentId === sId || s.id === sId) || {};
      return {
        studentId: sId,
        name: st.name || sId,
        avatar: st.avatar || "ST",
        department: st.department || "CSE",
        year: st.year || 3,
        floorLabel: st.floorLabel || "3rd Floor",
        roomNo: st.roomNo || st.room || "304",
        passCount: count,
      };
    });

  // 8. Correspondent Default: Month-on-Month Trends & Emergency/Welfare Card
  const emergencyPassesCount = passesInRange.filter((p) => p.emergency).length;
  const medicalPassesCount = passesInRange.filter((p) => (p.reason || "").toLowerCase().includes("medic") || (p.reason || "").toLowerCase().includes("hospital") || (p.reason || "").toLowerCase().includes("clinic")).length;
  const longAbsenceCount = passes.filter((p) => {
    if (p.status !== PASS_STATUSES.OUT && p.status !== PASS_STATUSES.OVERDUE) return false;
    const dep = new Date(p.actualExitTime || p.departureTime || 0);
    const daysOut = (Date.now() - dep.getTime()) / 86400000;
    return daysOut > 3;
  }).length;

  const emergencyWelfare = {
    emergencyPasses: emergencyPassesCount,
    medicalPasses: medicalPassesCount,
    longAbsenceStudents: longAbsenceCount,
    parentNotificationRate: "99.4%",
    safetyAdherenceRate: "99.8%",
  };

  // 9. Needs Attention List (Read-only overdue students)
  const needsAttention = overduePasses.map((p) => {
    const st = students.find((s) => s.studentId === p.studentId || s.id === p.studentId) || {};
    const exp = new Date(p.expectedReturnTime || p.toTime || Date.now());
    const lateMinutes = Math.max(15, Math.round((Date.now() - exp.getTime()) / 60000));
    return {
      passId: p.id,
      studentId: p.studentId,
      name: p.studentName || st.name,
      avatar: p.studentAvatar || st.avatar,
      department: p.department || st.department,
      year: p.year || st.year,
      floorLabel: p.floorLabel || st.floorLabel,
      roomNo: p.roomNo || p.room || st.roomNo,
      guardianPhone: p.guardianPhone || st.guardianPhone,
      expectedReturn: p.expectedReturnTime,
      lateMinutes,
      destination: p.destination,
      reason: p.reason,
    };
  });

  // 10. Live campus gate activity (10 most recent)
  const recentActivity = logs.slice(0, 10).map((l) => ({
    id: l.id,
    passId: l.passId,
    studentId: l.studentId,
    studentName: l.studentName,
    department: l.department,
    type: l.type,
    movementType: l.type,
    gate: l.gate,
    timestamp: l.timestamp,
    isLate: l.isLate,
    isManualOverride: l.isManualOverride,
    overrideReason: l.overrideReason,
  }));

  return successResponse({
    range,
    kpis,
    movementsByHour: hourMap,
    movementsByDay: dayMap,
    passesStacked,
    statusDonut,
    floorOccupancy,
    deptComparison,
    frequentLeavers,
    emergencyWelfare,
    needsAttention,
    recentActivity,
  });
}

/**
 * Institutional 7-department comparison table, metric rankings & heatmap
 */
export async function departmentComparison({ range = "this_month" } = {}) {
  await simulateLatency(250, 450);
  const { start, end } = getRangeWindow(range);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const policy = getPolicy();
  const thresholds = policy.insightThresholds || { lateReturnAmber: 10, lateReturnRed: 20 };

  const departments = WORKFLOW_CONFIG.departments.map((d) => {
    const deptStudents = students.filter((s) => (s.department || s.dept) === d.code);
    const deptPasses = passes.filter((p) => {
      if ((p.department || p.dept) !== d.code) return false;
      const t = new Date(p.appliedAt || p.departureTime || 0);
      return t >= start && t <= end;
    });

    const inCampusCount = deptStudents.filter((s) => {
      const activePass = passes.find((p) => (p.studentId === s.studentId || p.studentId === s.id) && (p.status === "out" || p.status === "overdue"));
      return !activePass;
    }).length;

    const outCount = deptStudents.length - inCampusCount;
    const overdueCount = passes.filter((p) => (p.department || p.dept) === d.code && p.status === "overdue").length;

    const localCount = deptPasses.filter((p) => (p.type || "").toLowerCase().includes("local")).length;
    const homeCount = deptPasses.filter((p) => (p.type || "").toLowerCase().includes("home")).length;
    const totalDeptPasses = deptPasses.length || 1;

    const approvedCount = deptPasses.filter((p) => p.status !== "rejected" && p.status !== "cancelled").length;
    const approvalRate = Math.round((approvedCount / totalDeptPasses) * 100);

    const lateCount = deptPasses.filter((p) => p.isLate || p.status === "overdue").length;
    const lateRate = Math.round((lateCount / totalDeptPasses) * 100);

    const totalLateMinutes = deptPasses.filter((p) => p.isLate).reduce((sum, p) => sum + (p.lateMinutes || 30), 0);
    const avgLateness = lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;

    const emergencyCount = deptPasses.filter((p) => p.emergency).length;

    return {
      code: d.code,
      name: d.name,
      students: deptStudents.length,
      inCampus: inCampusCount,
      out: outCount,
      overdue: overdueCount,
      passesInRange: deptPasses.length,
      localShare: Math.round((localCount / totalDeptPasses) * 100),
      homeShare: Math.round((homeCount / totalDeptPasses) * 100),
      approvalRate,
      lateReturnRate: lateRate,
      avgLateness,
      emergencyPasses: emergencyCount,
      isAmber: lateRate >= thresholds.lateReturnAmber && lateRate < thresholds.lateReturnRed,
      isRed: lateRate >= thresholds.lateReturnRed,
    };
  });

  // Day x Department heatmap matrix
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmap = departments.map((dept) => {
    const dayCounts = {};
    days.forEach((day, idx) => {
      dayCounts[day] = Math.max(1, (dept.passesInRange + idx * 3) % 15);
    });
    return {
      dept: dept.code,
      ...dayCounts,
    };
  });

  return successResponse({
    range,
    thresholds,
    departments,
    heatmap,
  });
}

/**
 * Detailed drill-down for a selected department
 * @param {object} params
 * @param {string} params.dept - Department code (e.g. 'CSE')
 * @param {string} [params.range]
 */
export async function departmentDrilldown({ dept = "CSE", range = "this_month" } = {}) {
  await simulateLatency(200, 400);
  const { start, end } = getRangeWindow(range);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS).filter(
    (s) => (s.department || s.dept) === dept
  );
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES).filter(
    (p) => (p.department || p.dept) === dept
  );

  const passesInRange = passes.filter((p) => {
    const t = new Date(p.appliedAt || p.departureTime || 0);
    return t >= start && t <= end;
  });

  // Year breakdown
  const yearBreakdown = [1, 2, 3, 4].map((yr) => {
    const yStudents = students.filter((s) => Number(s.year) === yr);
    const yPasses = passesInRange.filter((p) => Number(p.year) === yr);
    const yLate = yPasses.filter((p) => p.isLate || p.status === "overdue").length;
    return {
      year: yr,
      yearLabel: `${yr}${yr === 1 ? "st" : yr === 2 ? "nd" : yr === 3 ? "rd" : "th"} Year`,
      students: yStudents.length,
      passes: yPasses.length,
      lateReturns: yLate,
    };
  });

  // Top 10 frequent leavers
  const studentMap = {};
  passesInRange.forEach((p) => {
    studentMap[p.studentId] = (studentMap[p.studentId] || 0) + 1;
  });
  const frequentLeavers = Object.entries(studentMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sId, count]) => {
      const st = students.find((s) => s.studentId === sId || s.id === sId) || {};
      return {
        id: st.id || sId,
        studentId: sId,
        name: st.name || sId,
        avatar: st.avatar || "ST",
        year: st.year || 3,
        floorLabel: st.floorLabel || "3rd Floor",
        roomNo: st.roomNo || st.room || "304",
        phone: st.phone || st.guardianPhone,
        passCount: count,
      };
    });

  // Late return watchlist (students with >= 2 late returns in 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const lateByStudent = {};
  passes.forEach((p) => {
    const d = new Date(p.actualReturnTime || p.appliedAt || 0);
    if (d >= ninetyDaysAgo && (p.isLate || p.status === PASS_STATUSES.OVERDUE)) {
      if (!lateByStudent[p.studentId]) lateByStudent[p.studentId] = [];
      lateByStudent[p.studentId].push(p);
    }
  });

  const lateWatchlist = Object.entries(lateByStudent)
    .filter(([_, list]) => list.length >= 2)
    .map(([sId, list]) => {
      const st = students.find((s) => s.studentId === sId || s.id === sId) || {};
      return {
        id: st.id || sId,
        studentId: sId,
        name: st.name || sId,
        avatar: st.avatar || "ST",
        year: st.year || 3,
        floorLabel: st.floorLabel || "3rd Floor",
        roomNo: st.roomNo || st.room || "304",
        guardianPhone: st.guardianPhone,
        lateCount: list.length,
        dates: list.map((p) => p.actualReturnTime || p.expectedReturnTime),
      };
    });

  // Department staff recommendation activity
  const staffActivity = [
    {
      name: "Prof. Rajesh Sharma",
      role: "Faculty Advisor",
      reviewed: 38,
      recommended: 36,
      notRecommended: 2,
      avgTurnaround: "1.4 hrs",
    },
    {
      name: "Prof. Anand Kumar",
      role: "Faculty Advisor",
      reviewed: 29,
      recommended: 27,
      notRecommended: 2,
      avgTurnaround: "2.1 hrs",
    },
    {
      name: "Dr. Meenakshi Sundaram",
      role: "Head of Department",
      reviewed: 22,
      recommended: 22,
      notRecommended: 0,
      avgTurnaround: "0.8 hrs",
    },
  ];

  return successResponse({
    dept,
    deptName: (WORKFLOW_CONFIG.departments.find((d) => d.code === dept) || {}).name || dept,
    range,
    yearBreakdown,
    frequentLeavers,
    lateWatchlist,
    staffActivity,
  });
}

/**
 * Summary metrics for Late Returns audit screen
 */
export async function lateSummary({ range = "this_month" } = {}) {
  await simulateLatency(200, 350);
  const { start, end } = getRangeWindow(range);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);

  const overdueNow = passes.filter((p) => p.status === PASS_STATUSES.OVERDUE);
  const lateInRange = passes.filter((p) => {
    const d = new Date(p.actualReturnTime || p.appliedAt || 0);
    return d >= start && d <= end && (p.isLate || p.status === PASS_STATUSES.OVERDUE);
  });

  const lateMinutesList = lateInRange.map((p) => p.lateMinutes || 35);
  const avgLateness = lateMinutesList.length > 0 ? Math.round(lateMinutesList.reduce((a, b) => a + b, 0) / lateMinutesList.length) : 0;
  const longestLateness = lateMinutesList.length > 0 ? Math.max(...lateMinutesList) : 0;

  // Repeat offenders in past 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const lateByStudent = {};
  passes.forEach((p) => {
    const d = new Date(p.actualReturnTime || p.appliedAt || 0);
    if (d >= ninetyDaysAgo && (p.isLate || p.status === PASS_STATUSES.OVERDUE)) {
      lateByStudent[p.studentId] = (lateByStudent[p.studentId] || 0) + 1;
    }
  });
  const repeatCount = Object.values(lateByStudent).filter((c) => c >= 2).length;

  const totalPassesInRange = passes.filter((p) => {
    const d = new Date(p.appliedAt || p.departureTime || 0);
    return d >= start && d <= end;
  }).length || 1;
  const lateRate = Math.round((lateInRange.length / totalPassesInRange) * 100);

  // Lateness trend points
  const trendLine = [
    { label: "Day 1", count: 2, avgMin: 22 },
    { label: "Day 3", count: 3, avgMin: 28 },
    { label: "Day 5", count: 5, avgMin: 40 },
    { label: "Day 7", count: 4, avgMin: 32 },
    { label: "Day 10", count: 6, avgMin: 45 },
    { label: "Day 14", count: 3, avgMin: 25 },
  ];

  // Distribution by expected return hour
  const byHourExpected = [
    { hour: "18:00", count: 2 },
    { hour: "19:00", count: 4 },
    { hour: "20:00", count: 7 },
    { hour: "21:00", count: 12 },
    { hour: "22:00", count: 5 },
  ];

  return successResponse({
    overdueNow: overdueNow.length,
    lateInRange: lateInRange.length,
    avgLateness,
    longestLateness,
    repeatOffendersCount: repeatCount,
    lateRate,
    trendLine,
    byHourExpected,
  });
}

/**
 * Detailed Late Returns report with 3 tabs and filtering
 */
export async function lateReturnsReport({
  filters = {},
  page = 1,
  pageSize = 15,
} = {}) {
  await simulateLatency(250, 450);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);

  const tab = filters.tab || "overdue_now"; // 'overdue_now' | 'history' | 'repeat_offenders'
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  let dataset = [];

  if (tab === "overdue_now") {
    dataset = passes.filter((p) => p.status === PASS_STATUSES.OVERDUE);
  } else if (tab === "repeat_offenders") {
    // Group by student
    const lateByStudent = {};
    passes.forEach((p) => {
      const d = new Date(p.actualReturnTime || p.appliedAt || 0);
      if (d >= ninetyDaysAgo && (p.isLate || p.status === PASS_STATUSES.OVERDUE)) {
        if (!lateByStudent[p.studentId]) lateByStudent[p.studentId] = [];
        lateByStudent[p.studentId].push(p);
      }
    });

    const repeatStudentIds = Object.entries(lateByStudent)
      .filter(([_, list]) => list.length >= 2)
      .map(([sId]) => sId);

    dataset = passes.filter((p) => repeatStudentIds.includes(p.studentId) && (p.isLate || p.status === PASS_STATUSES.OVERDUE));
  } else {
    // 'history'
    dataset = passes.filter((p) => p.isLate || p.status === PASS_STATUSES.OVERDUE);
  }

  // Apply filters
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    dataset = dataset.filter(
      (p) =>
        (p.studentName && p.studentName.toLowerCase().includes(q)) ||
        (p.studentId && p.studentId.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.destination && p.destination.toLowerCase().includes(q))
    );
  }

  if (filters.department && filters.department !== "all") {
    dataset = dataset.filter((p) => (p.department || p.dept) === filters.department);
  }

  if (filters.year && filters.year !== "all") {
    dataset = dataset.filter((p) => String(p.year) === String(filters.year));
  }

  if (filters.floor && filters.floor !== "all") {
    dataset = dataset.filter((p) => p.floor === filters.floor);
  }

  if (filters.passType && filters.passType !== "all") {
    dataset = dataset.filter((p) => (p.type || "").toLowerCase().includes(filters.passType.toLowerCase()));
  }

  if (filters.bucket && filters.bucket !== "all") {
    dataset = dataset.filter((p) => {
      const m = p.lateMinutes || 30;
      if (filters.bucket === "under_30") return m < 30;
      if (filters.bucket === "30_120") return m >= 30 && m <= 120;
      if (filters.bucket === "over_120") return m > 120;
      return true;
    });
  }

  // Enrich rows
  const enriched = dataset.map((p) => {
    const st = students.find((s) => s.studentId === p.studentId || s.id === p.studentId) || {};
    return {
      ...p,
      studentName: p.studentName || st.name,
      studentAvatar: p.studentAvatar || st.avatar,
      department: p.department || st.department,
      year: p.year || st.year,
      floor: p.floor || st.floor,
      floorLabel: p.floorLabel || st.floorLabel,
      roomNo: p.roomNo || p.room || st.roomNo,
      guardianPhone: p.guardianPhone || st.guardianPhone,
      isStillOut: p.status === PASS_STATUSES.OVERDUE || !p.actualReturnTime,
    };
  });

  const paginationMeta = paginate(enriched, page, pageSize);
  return successResponse(paginationMeta.items, {
    total: paginationMeta.total,
    page: paginationMeta.page,
    pageSize: paginationMeta.pageSize,
    totalPages: paginationMeta.totalPages,
    overdueCount: passes.filter((p) => p.status === PASS_STATUSES.OVERDUE).length,
  });
}

/**
 * Export data payload ready for multi-sheet Excel and CSV
 * @param {object} params
 */
export async function exportReport({ type = "campus_summary", filters = {} } = {}) {
  await simulateLatency(300, 500);
  const students = getPersistentMock(STORAGE_KEYS.STUDENTS, MOCK_STUDENTS);
  const passes = getPersistentMock(STORAGE_KEYS.PASSES, MOCK_PASSES);
  const logs = getPersistentMock(STORAGE_KEYS.LOGS, MOCK_SECURITY_LOGS);

  const todayStr = new Date().toISOString().split("T")[0];

  if (type === "security_log") {
    const rows = logs.map((l) => ({
      "Timestamp": l.timestamp,
      "Log ID": l.id,
      "Pass ID": l.passId,
      "Movement": l.type,
      "Pass Type": l.passType || "Local Pass",
      "Student ID": l.studentId,
      "Student Name": l.studentName,
      "Department": l.department,
      "Year": l.year || 3,
      "Floor": l.floorLabel,
      "Room": l.roomNo || l.room,
      "Gate": l.gate,
      "Status": l.status,
      "Is Late": l.isLate ? "YES" : "NO",
      "Late Minutes": l.lateMinutes || 0,
      "Source": l.source,
      "Manual Override": l.isManualOverride ? "YES" : "NO",
      "Override Reason": l.overrideReason || "",
      "Verified By": l.verifiedBy,
    }));
    return successResponse({
      filename: `DMI-Hostel-SecurityLog_${todayStr}.xlsx`,
      csvFilename: `DMI-Hostel-SecurityLog_${todayStr}.csv`,
      rows,
      sheets: [{ name: "Security Movements", data: rows }],
    });
  }

  // Campus report multi-sheet (Summary, Departments, Late Returns)
  const summarySheet = [
    { Metric: "Total Enrolled Residents", Value: students.length },
    { Metric: "Currently Outside Campus", Value: passes.filter((p) => p.status === "out" || p.status === "overdue").length },
    { Metric: "Currently Overdue", Value: passes.filter((p) => p.status === "overdue").length },
    { Metric: "Total Passes Issued", Value: passes.length },
    { Metric: "Campus Bed Capacity", Value: 480 },
    { Metric: "Generated On", Value: new Date().toLocaleString() },
  ];

  const deptRes = await departmentComparison({ range: filters.range || "this_month" });
  const deptSheet = (deptRes.data?.departments || []).map((d) => ({
    "Department": d.name,
    "Code": d.code,
    "Hostellers": d.students,
    "In Campus": d.inCampus,
    "Out": d.out,
    "Curfew Overdue": d.overdue,
    "Passes in Range": d.passesInRange,
    "Local Share %": d.localShare,
    "Home Share %": d.homeShare,
    "Approval Rate %": d.approvalRate,
    "Late Return Rate %": d.lateReturnRate,
    "Avg Lateness (min)": d.avgLateness,
    "Emergency Passes": d.emergencyPasses,
  }));

  const lateSheet = passes
    .filter((p) => p.isLate || p.status === PASS_STATUSES.OVERDUE)
    .map((p) => ({
      "Pass ID": p.id,
      "Student ID": p.studentId,
      "Student Name": p.studentName,
      "Department": p.department,
      "Year": p.year,
      "Floor": p.floorLabel,
      "Room": p.roomNo || p.room,
      "Pass Type": p.type,
      "Expected Return": p.expectedReturnTime,
      "Actual Return": p.actualReturnTime || "STILL OUT",
      "Late By (Minutes)": p.lateMinutes || 35,
      "Status": p.status,
      "Guardian Phone": p.guardianPhone,
    }));

  return successResponse({
    filename: `DMI-Campus-Hostel-Report_${todayStr}.xlsx`,
    csvFilename: `DMI-Campus-Hostel-Report_${todayStr}.csv`,
    rows: lateSheet,
    sheets: [
      { name: "Summary", data: summarySheet },
      { name: "Departments", data: deptSheet },
      { name: "Late Returns", data: lateSheet },
    ],
  });
}

// Backwards-compatible aliases
export async function campusSummary() {
  const res = await campusOverview({ range: "this_month" });
  return res;
}

export async function lateReturns() {
  const res = await lateReturnsReport({ filters: { tab: "history" } });
  return res;
}

export const reportService = {
  deptSummary,
  departmentDashboard,
  departmentMovements,
  departmentAnalytics,
  campusOverview,
  departmentComparison,
  departmentDrilldown,
  lateSummary,
  lateReturnsReport,
  exportReport,
  campusSummary,
  lateReturns,
};

export default reportService;
