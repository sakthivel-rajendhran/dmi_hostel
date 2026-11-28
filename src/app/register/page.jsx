"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  User,
  GraduationCap,
  Building2,
  Camera,
  FileText,
  ShieldCheck,
  Loader2,
  Info,
  Clock,
  ShieldAlert,
} from "lucide-react";

import { BackgroundScene } from "@/components/login/background-scene";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthCard } from "@/components/auth/AuthCard.jsx";
import { Stepper } from "@/components/ui/Stepper.jsx";
import { PhotoPicker } from "@/components/ui/PhotoPicker.jsx";
import { usePolicy } from "@/hooks/usePolicy.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import {
  registerStudent,
  checkRoomAvailability,
  checkRegNoAvailable,
} from "@/lib/services/studentService.js";
import {
  validateRoomMatchesFloor,
  computeBatch,
  getFloorForRoom,
  step1Schema,
  getStep2Schema,
  step3Schema,
} from "@/lib/validators.js";
import { generateStudentId } from "@/lib/utils/student-id.js";

const DRAFT_STORAGE_KEY = "dmi_signup_draft_v2";

const STEPS = [
  { key: "account", label: "Account", shortLabel: "Account" },
  { key: "academic", label: "Academic & Guardian", shortLabel: "Guardian" },
  { key: "photo", label: "Photo", shortLabel: "Photo" },
  { key: "review", label: "Review", shortLabel: "Review" },
];

export default function RegisterWizardPage() {
  const router = useRouter();
  const { policy } = usePolicy();

  // Wizard state: 0 = Account, 1 = Academic & Guardian, 2 = Photo, 3 = Review, 4 = Success
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null); // Result object
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});

  // Form draft state
  const [formData, setFormData] = useState({
    // Step 1: Account
    name: "",
    email: "",
    gender: "",
    dept: "CSE",
    year: 1,
    phone: "",
    // Step 2: Academic & Guardian
    regNo: "",
    guardianName: "",
    guardianRelation: "Father",
    guardianPhone: "",
    floor: null,
    roomNo: "",
    // Step 3: Photo
    photoDataUrl: null,
    photoMeta: null,
  });

  // Dynamic preview Student ID
  const [previewId, setPreviewId] = useState("CSE0101");

  // 1. Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.photoDataUrl && typeof parsed.photoDataUrl === "object") {
          parsed.photoDataUrl = parsed.photoDataUrl.dataUrl || parsed.photoDataUrl.url || null;
        }
        setFormData((prev) => ({ ...prev, ...parsed }));
        // Draft restored silently without popup notification
      }
    } catch (e) {
      console.warn("Could not load draft:", e);
    }
  }, []);

  // 2. Persist draft on changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentStep < 4) {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, currentStep]);

  // 3. Warn beforeunload if form has data
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentStep > 0 && currentStep < 4) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep]);

  // 4. Update preview student ID when dept or year changes
  useEffect(() => {
    try {
      const id = generateStudentId({
        dept: formData.dept,
        year: formData.year,
        existingIds: [],
      });
      setPreviewId(id);
    } catch {
      const yr = String(formData.year || 1).padStart(2, "0");
      setPreviewId(`${formData.dept}${yr}01`);
    }
  }, [formData.dept, formData.year]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(WORKFLOW_CONFIG.defaultPassword);
    setCopiedPass(true);
    toast.success("Default password copied to clipboard!");
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("Student ID copied!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    setErrors({});
    const res = step1Schema.safeParse({
      name: formData.name,
      email: formData.email,
      roomNo: formData.roomNo,
      dept: formData.dept,
      year: formData.year,
      phone: formData.phone,
      gender: formData.gender,
    });

    if (!res.success) {
      const fieldErrors = {};
      res.error.issues.forEach((issue) => {
        const key = issue.path[0] || "general";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = async () => {
    setErrors({});

    const schema = getStep2Schema();
    const res = schema.safeParse({
      regNo: formData.regNo,
      guardianName: formData.guardianName,
      guardianRelation: formData.guardianRelation,
      guardianPhone: formData.guardianPhone,
      phone: formData.phone,
    });

    if (!res.success) {
      const fieldErrors = {};
      res.error.issues.forEach((issue) => {
        const key = issue.path[0] || "general";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      const firstMsg = Object.values(fieldErrors)[0];
      if (firstMsg) toast.error(firstMsg);
      return false;
    }

    // Check RegNo uniqueness
    try {
      const regCheck = await checkRegNoAvailable({ regNo: formData.regNo });
      if (!regCheck.available) {
        const msg = regCheck.message || "Register Number already registered";
        setErrors((prev) => ({ ...prev, regNo: msg }));
        toast.error(msg);
        return false;
      }
    } catch (e) {
      console.warn("Could not check regNo availability:", e);
    }

    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    setErrors({});
    const rawPhoto = formData.photoDataUrl;
    const cleanPhoto = typeof rawPhoto === "string" ? rawPhoto : (rawPhoto?.dataUrl || null);

    const res = step3Schema.safeParse({
      photoDataUrl: cleanPhoto,
    });

    if (!res.success) {
      let msg = res.error.issues[0]?.message || "Profile photo is required.";
      if (msg.includes("expected string")) {
        msg = "Profile photo is required. Please choose or capture a photo.";
      }
      setErrors({ photoDataUrl: msg });
      toast.error(msg);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        if (validateStep1()) {
          setCurrentStep(1);
        } else {
          toast.error("Please fill in your personal details correctly.");
        }
      } else if (currentStep === 1) {
        const valid = await validateStep2();
        if (valid) setCurrentStep(2);
      } else if (currentStep === 2) {
        if (validateStep3()) setCurrentStep(3);
      }
    } catch (err) {
      console.error("handleNext error:", err);
      toast.error(err.message || "Could not proceed to next step");
    }
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Submit complete registration
  const handleSubmit = async () => {
    if (!termsAccepted) {
      toast.error("Please accept the Hostel Code of Conduct to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        gender: formData.gender,
        dept: formData.dept,
        year: Number(formData.year),
        phone: formData.phone.trim(),
        regNo: formData.regNo.trim().toUpperCase(),
        guardianName: (formData.guardianName || "").trim(),
        guardianRelation: formData.guardianRelation || "Father",
        guardianPhone: (formData.guardianPhone || "").trim(),
        floor: getFloorForRoom(formData.roomNo || "") || null,
        roomNo: (formData.roomNo || "").trim().toUpperCase() || null,
        photoDataUrl: formData.photoDataUrl,
      };

      const res = await registerStudent(payload);
      if (res.ok) {
        setSubmissionSuccess(res.data);
        setCurrentStep(4);
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        toast.success("Resident Account Created Successfully!");
      } else {
        toast.error(res.message || "Failed to create account.");
        if (res.code === "EMAIL_EXISTS") {
          setCurrentStep(0);
          setErrors({ email: res.message });
        } else if (res.code === "REGNO_EXISTS") {
          setCurrentStep(1);
          setErrors({ regNo: res.message });
        }
      }
    } catch (err) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step Header titles
  const getStepTitle = () => {
    switch (currentStep) {
      case 0:
        return "Create Resident Account";
      case 1:
        return "Academic & Guardian Details";
      case 2:
        return "Upload Resident Photo";
      case 3:
        return "Review & Confirm";
      case 4:
        return "Registration Submitted Successfully";
      default:
        return "Student Registration";
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 0:
        return "Step 1 of 4: Enter your personal and academic credentials";
      case 1:
        return "Step 2 of 4: Enter your register number & guardian details";
      case 2:
        return "Step 3 of 4: JPG, PNG, WebP • Maximum 15 MB • Minimum 200 × 200 px";
      case 3:
        return "Step 4 of 4: Verify your details before submitting registration";
      case 4:
        return "Your account is awaiting approval from the Hostel Warden. You will be able to log in after your registration has been approved.";
      default:
        return "";
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden flex flex-col">
      {/* 1. Vintage Vignette Background Scene */}
      <BackgroundScene />

      {/* 2. Top Header Bar */}
      <header
        style={{
          height: "clamp(60px, 9vh, 88px)",
          paddingLeft: "clamp(24px, 4vw, 64px)",
          paddingRight: "clamp(24px, 4vw, 64px)",
        }}
        className="relative z-30 w-full flex items-center justify-between pointer-events-auto flex-shrink-0"
      >
        <Link href="/" className="flex items-center gap-3 select-none flex-shrink-0 group">
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex-shrink-0 drop-shadow-md">
            <Image
              src="/images/dmi-foundations-logo.png"
              alt="DMI Foundations Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <div className="h-8 sm:h-9 w-[1.5px] bg-white/40" />
          <div className="flex flex-col text-white text-shadow-hero">
            <span className="text-base sm:text-xl font-extrabold tracking-tight leading-tight">
              DMI College
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-white/90 leading-tight tracking-wide">
              Hostel Management
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ThemeToggle />
        </div>
      </header>

      {/* 3. Main Center Region: Centers static AuthCard */}
      <main
        style={{
          paddingLeft: "clamp(16px, 3vw, 48px)",
          paddingRight: "clamp(16px, 3vw, 48px)",
          paddingBottom: "clamp(16px, 3vh, 32px)",
          paddingTop: "clamp(8px, 1.5vh, 20px)",
        }}
        className="relative z-20 w-full max-w-[1540px] mx-auto flex items-center justify-center flex-1"
      >
        <AuthCard
          title={getStepTitle()}
          subtitle={getStepSubtitle()}
          showBadge={currentStep !== 4}
          headerAction={
            currentStep < 4 ? (
              <Stepper
                steps={STEPS}
                currentStepIndex={currentStep}
                onStepClick={(targetIdx) => {
                  if (targetIdx < currentStep) setCurrentStep(targetIdx);
                }}
              />
            ) : null
          }
        >
          {/* Container holding all wizard step panels in a single grid cell */}
          <div className="relative w-full flex flex-col justify-between">
            {/* ----------------- STEP 1: ACCOUNT ----------------- */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pb-2"
              >
                {/* Full Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Alex Parker"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
                </div>

                {/* Personal Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="e.g. alex.parker@dmice.ac.in"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
                </div>

                {/* Room Number (Below Email) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roomNo || ""}
                    onChange={(e) => handleChange("roomNo", e.target.value.toUpperCase())}
                    placeholder="e.g. 101, 204, 304, or G05"
                    maxLength={10}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.roomNo && <p className="text-[11px] text-rose-500 mt-1">{errors.roomNo}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="10-digit mobile e.g. 9876543210"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
                </div>

                {/* Gender Field */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleChange("gender", "Male")}
                      className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        formData.gender === "Male"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        formData.gender === "Male" ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {formData.gender === "Male" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span>Male</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange("gender", "Female")}
                      className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        formData.gender === "Female"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-400 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        formData.gender === "Female" ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {formData.gender === "Female" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span>Female</span>
                    </button>
                  </div>
                  {errors.gender && <p className="text-[11px] text-rose-500 mt-1">{errors.gender}</p>}
                </div>

                {/* Dept and Year Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                      Department
                    </label>
                    <select
                      value={formData.dept}
                      onChange={(e) => handleChange("dept", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {WORKFLOW_CONFIG.departments.map((d) => {
                        const code = typeof d === "object" ? d.code : d;
                        const label = typeof d === "object" ? `${d.code} - ${d.name}` : d;
                        return (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                      Year of Study
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => handleChange("year", parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                </div>

                {/* Generated Student ID Preview & Default Password */}
                <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Generated Student ID:
                    </span>
                    <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs">
                      {previewId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-200/50 dark:border-indigo-800/30">
                    <span className="text-slate-600 dark:text-slate-400">Default Password:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {WORKFLOW_CONFIG.defaultPassword}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 rounded text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition"
                        title="Copy Password"
                      >
                        {copiedPass ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full mt-2 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
                >
                  <span>Next: Academic & Guardian</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Already registered?{" "}
                  <Link href="/" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ----------------- STEP 2: ACADEMIC & HOSTEL ----------------- */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pb-2"
              >
                {/* Academic Section */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    1. Academic Allocation
                  </span>

                  {/* Register Number */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                      Register Number (Anna University) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.regNo}
                      onChange={(e) => handleChange("regNo", e.target.value.toUpperCase())}
                      placeholder="e.g. 310622104045 (12 digits)"
                      maxLength={14}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.regNo && <p className="text-[11px] text-rose-500 mt-1">{errors.regNo}</p>}
                  </div>
                </div>

                {/* Guardian Details Section */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      2. Guardian Details
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      Outpass & Emergency Contact
                    </span>
                  </div>

                  {/* Guardian Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                      Parent / Guardian Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) => handleChange("guardianName", e.target.value)}
                      placeholder="e.g. David Kumar"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.guardianName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.guardianName}</p>
                    )}
                  </div>

                  {/* Relationship and Guardian Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Relationship <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.guardianRelation}
                        onChange={(e) => handleChange("guardianRelation", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.guardianRelation && (
                        <p className="text-[11px] text-rose-500 mt-1">{errors.guardianRelation}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Guardian Mobile <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={(e) =>
                          handleChange(
                            "guardianPhone",
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        placeholder="10-digit number"
                        maxLength={10}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {errors.guardianPhone && (
                        <p className="text-[11px] text-rose-500 mt-1">{errors.guardianPhone}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Hostel room will be allocated centrally by the Chief Warden upon check-in.
                    </span>
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
                  >
                    <span>Next: Resident Photo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ----------------- STEP 3: PHOTO ----------------- */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pb-2"
              >
                <PhotoPicker
                  value={typeof formData.photoDataUrl === "string" ? formData.photoDataUrl : formData.photoDataUrl?.dataUrl}
                  onChange={(dataUrl, meta) => {
                    const stringDataUrl = typeof dataUrl === "string" ? dataUrl : (dataUrl?.dataUrl || null);
                    setFormData((prev) => ({
                      ...prev,
                      photoDataUrl: stringDataUrl,
                      photoMeta: meta,
                    }));
                    if (errors.photoDataUrl) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.photoDataUrl;
                        return next;
                      });
                    }
                  }}
                  error={errors.photoDataUrl}
                  required
                />

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Photo Requirements:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Clear frontal headshot with face visible</li>
                    <li>Square aspect ratio (automatically adjusted)</li>
                    <li>JPG, PNG, WebP • Maximum 15 MB • Minimum 200 × 200 px</li>
                  </ul>
                </div>

                {/* Step 3 Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
                  >
                    <span>Next: Review Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ----------------- STEP 4: REVIEW & CONFIRM ----------------- */}
            {currentStep === 3 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pb-2"
              >
                <div className="space-y-2">
                  {/* Account Summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {formData.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {formData.email} • {formData.gender || "Gender"} • Room {formData.roomNo || "N/A"} • {formData.phone}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(0)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Academic & Guardian Summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {formData.dept} • Year {formData.year} • Reg: {formData.regNo}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                          Guardian: {formData.guardianName} ({formData.guardianRelation}) • {formData.guardianPhone}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Photo Summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {formData.photoDataUrl ? (
                        <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-indigo-400">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.photoDataUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Resident Photo
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                          {formData.photoMeta?.formattedSize
                            ? `Photo Size: ${formData.photoMeta.formattedSize}`
                            : "Photo ready"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Code of Conduct Acceptance */}
                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    I agree to abide by the DMI Hostel Rules, maintain campus curfew times, and verify
                    my details with the Chief Warden.
                  </span>
                </label>

                {/* Final Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !termsAccepted}
                    onClick={handleSubmit}
                    className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm & Register</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ----------------- STEP 5: REGISTRATION CONFIRMATION SCREEN ----------------- */}
            {currentStep === 4 && submissionSuccess && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-3.5 text-center py-2 flex flex-col justify-between h-full"
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-600 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2.5 shadow-sm">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Registration Submitted Successfully
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mt-1 leading-relaxed">
                    Your account is awaiting approval from the Hostel Warden. You will be able to log in after your registration has been approved.
                  </p>
                </div>

                {/* Status Indicator Banner */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-800 dark:text-amber-300">
                    PENDING WARDEN APPROVAL
                  </span>
                </div>

                {/* Student Details Summary Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Assigned Student ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs">
                        {submissionSuccess.studentId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(submissionSuccess.studentId)}
                        className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
                        title="Copy Student ID"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-500">Register Number:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {submissionSuccess.regNo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Student Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {submissionSuccess.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Department & Year:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {submissionSuccess.department} • Year {submissionSuccess.year}
                    </span>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300/90 text-left flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Your credentials have been securely stored in MySQL. You cannot log in until your registration is approved by the Hostel Warden.
                  </span>
                </div>

                {/* Return to Login Button */}
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Login</span>
                </button>
              </motion.div>
            )}
          </div>
        </AuthCard>
      </main>

      {/* Mobile Footer text */}
      <div className="lg:hidden relative z-20 px-6 pb-4 text-center text-white/90 select-none text-shadow-hero">
        <p className="font-caveat text-lg text-white/95 italic font-bold">
          &ldquo;DMI – Learn, Grow, Belong&rdquo;
        </p>
      </div>
    </div>
  );
}
