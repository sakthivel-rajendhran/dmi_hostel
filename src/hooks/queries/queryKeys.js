/**
 * TanStack React Query Cache Keys
 */

export const queryKeys = {
  auth: {
    session: ["auth", "session"],
  },
  students: {
    all: ["students"],
    list: (filters) => ["students", "list", filters],
    detail: (id) => ["students", "detail", id],
    completeness: (id) => ["students", "completeness", id],
    profile: (id) => ["students", "profile", id],
    stats: ["students", "stats"],
  },
  passes: {
    all: ["passes"],
    list: (filters) => ["passes", "list", filters],
    detail: (id) => ["passes", "detail", id],
    active: (studentId) => ["passes", "active", studentId],
    eligibility: (params) => ["passes", "eligibility", params],
    stats: ["passes", "stats"],
  },
  securityLogs: {
    all: ["security-logs"],
    list: (filters) => ["security-logs", "list", filters],
    stillOut: ["security-logs", "still-out"],
  },
  notifications: {
    all: ["notifications"],
    list: (filters) => ["notifications", "list", filters],
  },
  reports: {
    dept: (dept) => ["reports", "dept", dept],
    campus: ["reports", "campus"],
    lateReturns: ["reports", "late-returns"],
  },
  department: {
    dashboard: ["department", "dashboard"],
    movements: ["department", "movements"],
    students: (filters) => ["department", "students", filters],
    studentDetail: (id) => ["department", "students", "detail", id],
    recommendQueue: (filters) => ["department", "recommend-queue", filters],
    recommendStats: ["department", "recommend-stats"],
    analytics: (range) => ["department", "analytics", range],
    profile: ["department", "profile"],
    preferences: ["department", "preferences"],
  },
  oversight: {
    overview: (range) => ["oversight", "overview", range],
    deptComparison: (range) => ["oversight", "dept-comparison", range],
    deptDrilldown: (dept, range) => ["oversight", "dept-drilldown", dept, range],
    lateSummary: (range) => ["oversight", "late-summary", range],
    lateReturns: (filters) => ["oversight", "late-returns", filters],
    securityLog: (filters) => ["oversight", "security-log", filters],
  },
  letters: {
    all: ["letters"],
    list: (filters) => ["letters", "list", filters],
    detail: (id) => ["letters", "detail", id],
    stats: ["letters", "stats"],
  },
  accounts: {
    all: ["accounts"],
    list: (filters) => ["accounts", "list", filters],
    audit: ["accounts", "audit"],
  },
  rooms: {
    all: ["rooms"],
    list: (floor) => ["rooms", "list", floor],
  },
};
