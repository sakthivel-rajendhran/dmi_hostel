import { z } from "zod";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

// Student ID Regex Schema (e.g. CSE-3-001)
export const studentIdSchema = z
  .string()
  .trim()
  .min(1, "Student ID is required")
  .regex(
    /^[A-Z]{2,6}-[1-4]-\d{3}$/,
    "Use the format DEPT-YEAR-NUMBER, e.g. CSE-3-001"
  );

// Gmail / Official Staff Email Schema
export const gmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .toLowerCase();

// Name Schema (Letters, spaces, dots, apostrophes, 3-50 chars)
export const nameSchema = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(50, "Name cannot exceed 50 characters")
  .regex(/^[a-zA-Z\s.']+$/, "Letters, spaces, dots and apostrophes only");

// Indian Mobile Phone Schema (10 digits starting with 6-9)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const indianPhoneSchema = phoneSchema;

export const optionalIndianPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
  .or(z.literal(""))
  .optional();

// University Register / Roll Number Schema (6-15 uppercase alphanumeric chars)
export const regNoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6, "Register number must be at least 6 characters")
  .max(15, "Register number cannot exceed 15 characters")
  .regex(/^[A-Z0-9]{6,15}$/, "Register number must be 6–15 alphanumeric characters");

/**
 * Floor configuration map helper
 */
const FLOOR_PREFIX_MAP = {
  GF: { prefix: "G", label: "Ground Floor", min: 1, max: 30 },
  F1: { prefix: "1", label: "1st Floor", min: 101, max: 130 },
  F2: { prefix: "2", label: "2nd Floor", min: 201, max: 230 },
  F3: { prefix: "3", label: "3rd Floor", min: 301, max: 330 },
  F4: { prefix: "4", label: "4th Floor", min: 401, max: 430 },
};

/**
 * Returns floor label corresponding to a room number prefix
 * @param {string} roomNo e.g. "G05", "101", "204", "304", "412"
 */
export function getFloorForRoom(roomNo = "") {
  const clean = roomNo.trim().toUpperCase();
  if (!clean) return null;
  const p = clean.charAt(0);
  if (p === "G") return "Ground Floor";
  if (p === "1") return "1st Floor";
  if (p === "2") return "2nd Floor";
  if (p === "3") return "3rd Floor";
  if (p === "4") return "4th Floor";
  return null;
}

/**
 * Computes Academic Batch from Year (e.g. Year 3 in 2026 -> "2024 – 2028")
 * @param {number|string} year
 * @param {number} [currentYear=2026]
 * @param {number} [courseDuration=4]
 * @returns {string}
 */
export function computeBatch(year, currentYear = 2026, courseDuration = 4) {
  let curr = Number(currentYear);
  let duration = Number(courseDuration);
  if (!curr || curr < 100) {
    duration = curr || 4;
    curr = 2026;
  }
  const y = Number(year) || 1;
  const startYear = curr - (y - 1);
  const endYear = startYear + (duration || 4);
  return `${startYear} – ${endYear}`;
}

export const roomNoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "Room number is required")
  .max(10, "Room number cannot exceed 10 characters");

export const step1Schema = z.object({
  name: nameSchema,
  email: gmailSchema,
  roomNo: roomNoSchema,
  phone: indianPhoneSchema,
  dept: z.enum(["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AI&DS"], {
    message: "Select your engineering department",
  }),
  year: z.coerce.number().min(1).max(4),
});

/**
 * Validates that room number matches the specific floor
 * @param {string} floor e.g. "GF", "F2", "F3", "F4"
 * @param {string} room e.g. "304"
 */
export function validateRoomMatchesFloor(floor, room) {
  if (!floor || !room) return { valid: false, error: "Floor and room are required" };
  const cleanRoom = room.trim().toUpperCase();
  const info = FLOOR_PREFIX_MAP[floor];
  if (!info) return { valid: false, error: "Invalid floor selected" };

  if (!cleanRoom.startsWith(info.prefix)) {
    const actualFloor = getFloorForRoom(cleanRoom);
    return {
      valid: false,
      error: actualFloor
        ? `Room ${cleanRoom} is on the ${actualFloor}`
        : `Room must start with ${info.prefix} for ${info.label}`,
    };
  }

  // Check numeric range
  if (info.prefix === "G") {
    const num = parseInt(cleanRoom.substring(1), 10);
    if (isNaN(num) || num < 1 || num > 30) {
      return { valid: false, error: "Ground Floor rooms must be between G01 and G30" };
    }
  } else {
    const num = parseInt(cleanRoom, 10);
    if (isNaN(num) || num < info.min || num > info.max) {
      return { valid: false, error: `Room number must be between ${info.min} and ${info.max}` };
    }
  }

  return { valid: true };
}

// Student Photo Data URL Schema
export const photoSchema = z.preprocess(
  (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      if (typeof val.dataUrl === "string") return val.dataUrl;
      if (typeof val.url === "string") return val.url;
      if (typeof val.photo === "string") return val.photo;
      if (typeof val.photoUrl === "string") return val.photoUrl;
      if (typeof val.src === "string") return val.src;
      return "";
    }
    return "";
  },
  z
    .string({
      required_error: "Profile photo is required.",
      invalid_type_error: "Profile photo is required. Please choose or capture a photo.",
    })
    .min(1, "Profile photo is required.")
    .refine(
      (val) =>
        Boolean(
          val &&
          (val.startsWith("data:image/") ||
           val.startsWith("/api/") ||
           val.startsWith("http://") ||
           val.startsWith("https://") ||
           val.startsWith("blob:"))
        ),
      {
        message: "Valid resident photo is required.",
      }
    )
);

// Password Rules Schema
export const passwordRulesSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[a-z]/, "Must include at least one lowercase letter")
  .regex(/[0-9]/, "Must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Must include at least one special character")
  .refine(
    (val) => val !== WORKFLOW_CONFIG.defaultPassword,
    "New password cannot be the default password (DmiCE@1202)"
  );

/**
 * Evaluates password strength from 0 to 100 with label
 * @param {string} password
 */
export function getPasswordStrength(password = "") {
  let score = 0;
  if (!password) return { score: 0, label: "Empty", color: "bg-slate-300" };

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (password === WORKFLOW_CONFIG.defaultPassword) {
    return { score: 10, label: "Default Password (Invalid)", color: "bg-rose-500" };
  }

  if (score < 40) return { score, label: "Weak", color: "bg-rose-500" };
  if (score < 70) return { score, label: "Medium", color: "bg-amber-500" };
  return { score: Math.min(100, score), label: "Strong", color: "bg-emerald-500" };
}

export const loginSchema = z.object({
  role: z.enum(["student", "admin"]).optional(),
  tab: z.enum(["student", "staff"]).optional(),
  identifier: z.string().trim().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(true),
});

// Local Pass Form Schema
export const localPassSchema = z
  .object({
    date: z.string().min(1, "Outing date is required"),
    exitTime: z.string().min(1, "Exit time is required"),
    returnTime: z.string().min(1, "Return time is required"),
    destination: z
      .string()
      .trim()
      .min(3, "Destination must be at least 3 characters")
      .max(80, "Destination cannot exceed 80 characters"),
    reason: z
      .string()
      .trim()
      .min(10, "Please provide a reason of at least 10 characters")
      .max(300, "Reason cannot exceed 300 characters"),
    studentPhone: optionalIndianPhoneSchema,
    guardianPhone: optionalIndianPhoneSchema,
    isEmergency: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const p = data.studentPhone || data.guardianPhone;
      return Boolean(p && /^[6-9]\d{9}$/.test(p));
    },
    {
      message: "Valid 10-digit Indian mobile number is required",
      path: ["studentPhone"],
    }
  )
  .refine(
    (data) => {
      if (!data.exitTime || !data.returnTime) return true;
      return data.returnTime > data.exitTime;
    },
    {
      message: "Return time must be later than exit time",
      path: ["returnTime"],
    }
  )
  .refine(
    (data) => {
      if (!data.returnTime) return true;
      return data.returnTime <= (WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00");
    },
    {
      message: `Local pass return must be at or before ${WORKFLOW_CONFIG.localPassLatestReturnTime || "21:00"}`,
      path: ["returnTime"],
    }
  );

// Home Pass Form Schema
export const homePassSchema = z
  .object({
    fromDate: z.string().min(1, "Departure date is required"),
    exitTime: z.string().min(1, "Exit time is required"),
    toDate: z.string().min(1, "Return date is required"),
    returnTime: z.string().min(1, "Return time is required"),
    destination: z
      .string()
      .trim()
      .min(3, "Destination must be at least 3 characters")
      .max(80, "Destination cannot exceed 80 characters"),
    reason: z
      .string()
      .trim()
      .min(10, "Please provide a reason of at least 10 characters")
      .max(300, "Reason cannot exceed 300 characters"),
    studentPhone: optionalIndianPhoneSchema,
    guardianPhone: optionalIndianPhoneSchema,
    guardianConsent: z.boolean().refine((val) => val === true, {
      message: "Guardian confirmation is required for Home Pass",
    }),
    isEmergency: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const p = data.studentPhone || data.guardianPhone;
      return Boolean(p && /^[6-9]\d{9}$/.test(p));
    },
    {
      message: "Valid 10-digit Indian mobile number is required",
      path: ["studentPhone"],
    }
  )
  .refine(
    (data) => {
      if (!data.fromDate || !data.toDate) return true;
      return data.toDate >= data.fromDate;
    },
    {
      message: "Return date must be on or after departure date",
      path: ["toDate"],
    }
  )
  .refine(
    (data) => {
      if (!data.fromDate || !data.toDate) return true;
      const start = new Date(data.fromDate).getTime();
      const end = new Date(data.toDate).getTime();
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return diffDays <= (WORKFLOW_CONFIG.maxHomePassDays || 15);
    },
    {
      message: `Home pass duration cannot exceed ${WORKFLOW_CONFIG.maxHomePassDays || 15} days`,
      path: ["toDate"],
    }
  );

// Student Profile Form Schema (Updated for Unified Card, Additional Info & Optional Guardian)
export const studentProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  collegeEmail: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: indianPhoneSchema,
  department: z.string().optional(),
  year: z.any().optional(),
  regNo: z.string().optional(),
  roomNumber: z.string().trim().optional().nullable(),
  bloodGroup: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  fatherName: z.string().trim().min(2, "Father name must be at least 2 characters").max(50, "Max 50 characters"),
  fatherPhone: indianPhoneSchema,
  motherName: z.string().trim().min(2, "Mother name must be at least 2 characters").max(50, "Max 50 characters"),
  motherPhone: indianPhoneSchema,
  guardianName: z.string().trim().max(50).optional().or(z.literal("")),
  guardianPhone: optionalIndianPhoneSchema,
  floor: z.string().optional().nullable(),
  guardianRelation: z.string().optional(),
  guardianAltPhone: z.string().optional(),
});

// WIZARD SCHEMAS
// (Wizard Step 1: step1Schema is defined above with roomNo and phone)

// Wizard Step 2 Builder: Academic & Hostel Allocation
export function getStep2Schema(allocationMode = "warden_allocates") {
  let base = z.object({
    regNo: regNoSchema,
    guardianName: nameSchema,
    guardianRelation: z.enum(["Father", "Mother", "Guardian", "Other"]).default("Father"),
    guardianPhone: indianPhoneSchema,
    phone: z.string().optional(),
    guardian: z
      .object({
        name: nameSchema.optional(),
        relation: z.enum(["Father", "Mother", "Guardian", "Other"]).optional(),
        phone: phoneSchema.optional(),
      })
      .optional(),
    floor: z.string().optional().nullable(),
    roomNo: z.string().optional().nullable(),
  });

  return base.refine(
    (data) => {
      const studentPhone = data.phone ? data.phone.trim() : "";
      const guardPhone = data.guardianPhone ? data.guardianPhone.trim() : (data.guardian?.phone ? data.guardian.phone.trim() : "");
      if (studentPhone && guardPhone) {
        return studentPhone !== guardPhone;
      }
      return true;
    },
    {
      message: "Guardian phone number must differ from student mobile",
      path: ["guardianPhone"],
    }
  );
}

export const step2Schema = getStep2Schema("student_enters");

// Wizard Step 3: Student Photo
export const step3Schema = z.object({
  photoDataUrl: photoSchema,
});

// Unified Registration Schema
export function getRegisterSchema(allocationMode = "warden_allocates") {
  const step2 = getStep2Schema(allocationMode);

  return step1Schema
    .and(step2)
    .and(step3Schema)
    .and(
      z.object({
        termsAccepted: z.boolean().optional(),
      })
    );
}

export const registerSchema = getRegisterSchema("warden_allocates");

// Sign Up Schema (Alias for backwards compatibility)
export const signUpSchema = registerSchema;

// Password Reset Schemas
export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Student ID or Staff Email is required"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordRulesSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forceChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRulesSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password cannot be the current password",
    path: ["newPassword"],
  });

export default {
  studentIdSchema,
  gmailSchema,
  nameSchema,
  phoneSchema,
  indianPhoneSchema,
  regNoSchema,
  roomNoSchema,
  photoSchema,
  computeBatch,
  getFloorForRoom,
  validateRoomMatchesFloor,
  step1Schema,
  step2Schema,
  step3Schema,
  getStep2Schema,
  getRegisterSchema,
  registerSchema,
  passwordRulesSchema,
  getPasswordStrength,
  loginSchema,
  localPassSchema,
  homePassSchema,
  studentProfileSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  forceChangePasswordSchema,
};
