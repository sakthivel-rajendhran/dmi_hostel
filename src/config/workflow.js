/**
 * DMI College Hostel Management PWA - Workflow Configuration
 * Global configuration parameters. Everything in the app reads from this file.
 */

export const WORKFLOW_CONFIG = {
  // Whether pass requires academic staff recommendation before warden approval
  requireStaffRecommendation: false,

  // Default initial password assigned to newly enrolled students
  defaultPassword: "DmiCE@1202",

  // Student ID generation format rule
  idFormat: "DEPT-YEAR-SEQ",

  // Number of sequence digits
  seqDigits: 3,

  // Home outpasses: Unlimited applications permitted at any time (no daily/monthly quota)
  maxHomePassesPerMonth: null,

  // Maximum permissible consecutive days for a single home outpass
  maxHomePassDays: 15,

  // Local outpass latest permissible return timestamp (24-hour format)
  localPassLatestReturnTime: "21:00",

  // Curfew grace period before pass is automatically flagged overdue
  curfewGracePeriodMinutes: 30,

  // Automated return curfew notification window (minutes before expected return)
  returnReminderMinutes: 30,

  // Authorized staff email domain whitelist
  allowedStaffEmailDomains: ["gmail.com", "dmice.ac.in"],

  // Single Campus Gate Checkpoint
  gates: [
    {
      id: "MAIN",
      name: "Main Gate",
      lat: 12.845,
      lng: 79.95,
      description: "Primary entrance & security checkpoint on Palanchur Highway",
    },
  ],

  // Gate QR poster rotation rule
  gateQr: {
    rotation: "daily", // 'daily' | 'static'
    acceptPreviousDay: true, // Grace period accepting previous day's rotation
  },

  // GPS Geofence boundary verification for camera scanning
  geofence: {
    enabled: true,
    radiusMeters: 150,
    maxAccuracyMeters: 100,
  },

  // Exit window buffer: allows student to exit from departure time minus 15 min until expected return
  exitGraceMinutes: 15,

  // Session idle auto-logout timeout in minutes (with 60-second modal warning)
  idleTimeoutMinutes: 30,

  // Anti-double-scan deduplication window
  duplicateScanWindowSeconds: 30,

  // College departments supported
  departments: [
    { code: "CSE", name: "Computer Science & Engineering" },
    { code: "IT", name: "Information Technology" },
    { code: "AI&DS", name: "Artificial Intelligence & Data Science" },
    { code: "AI&ML", name: "Artificial Intelligence & Machine Learning" },
    { code: "CIVIL", name: "Civil Engineering" },
    { code: "MECH", name: "Mechanical Engineering" },
    { code: "EEE", name: "Electrical and Electronics Engineering" },
    { code: "ECE", name: "Electronics and Communication Engineering" },
  ],

  // Academic programmes
  programmes: ["B.E.", "B.Tech", "M.E.", "MBA", "MCA", "Diploma"],

  // Academic years
  years: [1, 2, 3, 4],

  // Building Floors Specification (One hostel building with 4 floors)
  floors: [
    { id: "GF", label: "Ground Floor", short: "Ground", roomPrefix: "G" },
    { id: "F2", label: "2nd Floor", short: "2nd", roomPrefix: "2" },
    { id: "F3", label: "3rd Floor", short: "3rd", roomPrefix: "3" },
    { id: "F4", label: "4th Floor", short: "4th", roomPrefix: "4" },
  ],

  // Capacity & Rooms per floor
  roomsPerFloor: 30,
  roomCapacity: 4,

  // Operation 1: Switchable Room Allocation Mode ('student_enters' | 'warden_allocates')
  roomAllocationMode: "warden_allocates",

  // Photo Upload Policy & Size limits
  photoPolicy: "crop_confirm",
  maxPhotoBytes: 5242880, // 5 MB (5,242,880 bytes)
  photoMinPx: 200,
  photoAccept: ["image/jpeg", "image/png", "image/webp"],

  // Department insights thresholds (percentage)
  insightThresholds: {
    lateReturnAmber: 10,
    lateReturnRed: 20,
  },

  // Optional Module: Student Letter Approval (feature-flagged, OFF by default)
  studentLetters: {
    enabled: false,
    approverMode: "correspondent_only", // 'correspondent_only'
    letterApprovalRequired: false,
    requiredFor: ["home_over_days"],
    requiredHomeDays: 7,
    maxLetterBytes: 2097152, // 2 MB (2,097,152 bytes)
    accept: ["application/pdf", "image/jpeg", "image/png"],
    letterTypes: [
      { id: "long_leave", label: "Long leave / Extended Break" },
      { id: "medical", label: "Medical Leave / Hospitalization" },
      { id: "special_event", label: "Special Academic / Sports Duty" },
      { id: "other", label: "Other Special Permission" },
    ],
  },
};

export const DEPARTMENT_CODES = WORKFLOW_CONFIG.departments.map((d) => d.code);

export default WORKFLOW_CONFIG;
