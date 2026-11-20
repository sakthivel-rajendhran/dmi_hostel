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
  step1Schema,
  getStep2Schema,
  step3Schema,
} from "@/lib/validators.js";
import { generateStudentId } from "@/lib/utils/student-id.js";

const DRAFT_STORAGE_KEY = "dmi_signup_draft_v2";

const STEPS = [
  { key: "account", label: "Account", shortLabel: "Account" },
  { key: "academic", label: "Academic & Hostel", shortLabel: "Academic" },
  { key: "photo", label: "Photo", shortLabel: "Photo" },
  { key: "review", label: "Review", shortLabel: "Review" },
];

export default function RegisterWizardPage() {
  const router = useRouter();
  const { policy } = usePolicy();

  // Wizard state: 0 = Account, 1 = Academic & Hostel, 2 = Photo, 3 = Review, 4 = Success
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
    dept: "CSE",
    year: 1,
    phone: "",
    // Step 2: Academic & Hostel
    regNo: "",
    programme: "B.E.",
    section: "A",
    floor: "GF",
    roomNo: "",
    // Step 3: Photo
    photoDataUrl: null,
    photoMeta: null,
  });

  // Dynamic preview Student ID
  const [previewId, setPreviewId] = useState("CSE-1-001");

  // Room verification state
  const [roomChecking, setRoomChecking] = useState(false);
  const [roomError, setRoomError] = useState(null);

  // 1. Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
        toast.info("Restored registration draft", { duration: 2500 });
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
      setPreviewId(`${formData.dept}-${formData.year}-001`);
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
      dept: formData.dept,
      year: formData.year,
      phone: formData.phone,
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
    setRoomError(null);

    const schema = getStep2Schema(policy.roomAllocationMode);
    const res = schema.safeParse({
      regNo: formData.regNo,
      programme: formData.programme,
      section: formData.section,
      floor: formData.floor,
      roomNo: formData.roomNo,
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

    // Check RegNo uniqueness
    const regCheck = await checkRegNoAvailable({ regNo: formData.regNo });
    if (!regCheck.available) {
      setErrors((prev) => ({ ...prev, regNo: regCheck.message || "Register Number already registered" }));
      return false;
    }

    // In student_enters mode, check room capacity
    if (policy.roomAllocationMode === "student_enters") {
      setRoomChecking(true);
      const roomCheck = await checkRoomAvailability({
        floor: formData.floor,
        roomNo: formData.roomNo.trim().toUpperCase(),
      });
      setRoomChecking(false);

      if (!roomCheck.available) {
        setRoomError(roomCheck.message || "Room is full");
        setErrors((prev) => ({ ...prev, roomNo: roomCheck.message || "Room is full" }));
        return false;
      }
    }

    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    setErrors({});
    const res = step3Schema.safeParse({
      photoDataUrl: formData.photoDataUrl,
    });

    if (!res.success) {
      const msg = res.error.issues[0]?.message || "Profile photo is required.";
      setErrors({ photoDataUrl: msg });
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (validateStep1()) setCurrentStep(1);
    } else if (currentStep === 1) {
      const valid = await validateStep2();
      if (valid) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep3()) setCurrentStep(3);
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
        dept: formData.dept,
        year: Number(formData.year),
        phone: formData.phone.trim(),
        regNo: formData.regNo.trim().toUpperCase(),
        programme: formData.programme,
        section: formData.section,
        floor: policy.roomAllocationMode === "student_enters" ? formData.floor : null,
        roomNo:
          policy.roomAllocationMode === "student_enters"
            ? formData.roomNo.trim().toUpperCase()
            : null,
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
        } else if (res.code === "ROOM_FULL") {
          setCurrentStep(1);
          setErrors({ roomNo: res.message });
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
        return "Academic & Hostel Details";
      case 2:
        return "Upload Resident Photo";
      case 3:
        return "Review & Confirm";
      case 4:
        return "Account Ready!";
      default:
        return "Student Registration";
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 0:
        return "Step 1 of 3: Enter your personal and academic credentials";
      case 1:
        return policy.roomAllocationMode === "student_enters"
          ? "Step 2 of 3: Provide registration number and choose your room"
          : "Step 2 of 3: Provide academic info (Room is allocated by Warden)";
      case 2:
        return `Step 3 of 3: ${
          policy.photoPolicy === "reject" ? "Strict ≤1 MB limit enforced" : "Up to 15 MB (auto-compressed)"
        }`;
      case 3:
        return "Verify your details before generating your Student ID";
      case 4:
        return "Your credentials are generated. Use your Student ID to log in.";
      default:
        return "";
    }
  };

  return (
    <div className="relative min-h-dvh lg:h-dvh lg:overflow-hidden w-full overflow-x-hidden flex flex-col lg:grid lg:grid-rows-[auto_minmax(0,1fr)]">
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

      {/* 3. Main Center Region: Centers fixed AuthCard strictly */}
      <main
        style={{
          paddingLeft: "clamp(20px, 3.5vw, 64px)",
          paddingRight: "clamp(20px, 3.5vw, 64px)",
          paddingBottom: "clamp(12px, 2vh, 24px)",
        }}
        className="relative z-20 min-h-0 w-full max-w-[1540px] mx-auto flex items-center justify-center flex-1"
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
          <div className="relative w-full h-full min-h-0 flex flex-col justify-between">
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
                  <span>Next: Academic & Hostel</span>
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

                  {/* Programme, Section, Batch */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Degree
                      </label>
                      <select
                        value={formData.programme}
                        onChange={(e) => handleChange("programme", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                      >
                        {(WORKFLOW_CONFIG.programmes || ["B.E.", "B.Tech", "M.E.", "MBA", "MCA"]).map(
                          (p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Section
                      </label>
                      <select
                        value={formData.section}
                        onChange={(e) => handleChange("section", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                      >
                        {["A", "B", "C", "D"].map((s) => (
                          <option key={s} value={s}>
                            Section {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Batch
                      </label>
                      <div className="w-full px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 text-center truncate">
                        {computeBatch(formData.year, 4)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hostel Allocation Section (Switchable by policy) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      2. Hostel Allocation
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {policy.roomAllocationMode === "student_enters"
                        ? "Resident Choice"
                        : "Warden Managed"}
                    </span>
                  </div>

                  {policy.roomAllocationMode === "student_enters" ? (
                    <div className="space-y-2.5">
                      {/* Floor Selection */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                          Select Floor <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {WORKFLOW_CONFIG.floors.map((fl) => {
                            const isSelected = formData.floor === fl.id;
                            return (
                              <button
                                key={fl.id}
                                type="button"
                                onClick={() => handleChange("floor", fl.id)}
                                className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                }`}
                              >
                                <span>{fl.label}</span>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {fl.roomPrefix}__
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Room Number Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Room Number <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formData.floor === "GF" ? "G01 – G30" : `${formData.floor === "F2" ? "201–230" : formData.floor === "F3" ? "301–330" : "401–430"}`}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formData.roomNo}
                          onChange={(e) => handleChange("roomNo", e.target.value.toUpperCase())}
                          onBlur={() => {
                            if (formData.roomNo && formData.floor) {
                              const check = validateRoomMatchesFloor(formData.floor, formData.roomNo);
                              if (!check.valid) {
                                setErrors((prev) => ({ ...prev, roomNo: check.error }));
                              }
                            }
                          }}
                          placeholder={formData.floor === "GF" ? "e.g. G04" : `${formData.floor.slice(1)}04`}
                          maxLength={4}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {errors.roomNo && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.roomNo}</p>
                        )}
                        {roomChecking && (
                          <p className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verifying room capacity...
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* warden_allocates mode */
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 dark:text-amber-300">
                        <strong className="block font-bold">Warden Allocation Active</strong>
                        <span>
                          Hostel rooms are assigned centrally by the Chief Warden. You will be
                          notified once your room is verified and allocated.
                        </span>
                      </div>
                    </div>
                  )}
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
                  value={formData.photoDataUrl}
                  onChange={(dataUrl, meta) => {
                    setFormData((prev) => ({
                      ...prev,
                      photoDataUrl: dataUrl,
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
                    <li>
                      {policy.photoPolicy === "reject"
                        ? "File must not exceed 1 MB"
                        : "Up to 15 MB accepted; compressed under 1 MB"}
                    </li>
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
                          {formData.email} • {formData.phone}
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

                  {/* Academic & Hostel Summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {formData.dept} • Year {formData.year} • Sec {formData.section}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                          Reg: {formData.regNo} •{" "}
                          {policy.roomAllocationMode === "student_enters"
                            ? `${formData.floor === "GF" ? "Ground Floor" : formData.floor === "F2" ? "2nd Floor" : formData.floor === "F3" ? "3rd Floor" : "4th Floor"}, Room ${formData.roomNo}`
                            : "Room: Awaiting Warden Allocation"}
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
                          {formData.photoMeta
                            ? `Compressed to ${formData.photoMeta.finalFormatted}`
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

            {/* ----------------- STEP 5: SUCCESS STATE ----------------- */}
            {currentStep === 4 && submissionSuccess && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 text-center py-1 flex flex-col justify-between h-full"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Registration Completed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
                    Your resident profile has been enrolled in the DMI Campus Hostel directory.
                  </p>
                </div>

                {/* ID Highlight Box */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/30 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Your Official Student ID:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-indigo-300 dark:border-indigo-700 shadow-sm">
                        {submissionSuccess.studentId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(submissionSuccess.studentId)}
                        className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition"
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

                  <div className="flex items-center justify-between pt-2 border-t border-indigo-200/40 dark:border-indigo-800/40 text-xs">
                    <span className="text-slate-500">Default Password:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {submissionSuccess.defaultPassword}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500">Allocation Status:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        submissionSuccess.mode === "student_enters"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {submissionSuccess.mode === "student_enters"
                        ? "Pending Warden Verification"
                        : "Awaiting Warden Allocation"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Note: On your first login you will be prompted to choose a permanent secure password.</span>
                </div>

                {/* Login Button */}
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
                >
                  Proceed to Login
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
