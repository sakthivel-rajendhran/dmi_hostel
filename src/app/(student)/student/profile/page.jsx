"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Camera,
  Pencil,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  ChevronRight,
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  MapPin,
  Shield,
  Building,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth.js";
import { useMyProfile, useProfileCompleteness, useUpdateProfile } from "@/hooks/queries/useStudents.js";
import { studentProfileSchema } from "@/lib/validators.js";
import { Button } from "@/components/ui/Button.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { ProfilePhotoCropModal } from "@/components/profile/ProfilePhotoCropModal.jsx";
import { validatePhotoFile } from "@/lib/utils/image.js";
import { calculateProfileCompletion } from "@/lib/utils/profileCompletion.js";
import { cn } from "@/lib/utils/cn.js";

const BLOOD_GROUPS = ["A+ve", "A-ve", "B+ve", "B-ve", "O+ve", "O-ve", "AB+ve", "AB-ve"];

const YEAR_DISPLAY_MAP = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
};

// Helper to format student display name: First name in Title Case + Surname initial with period
function formatStudentDisplayName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  const trimmed = rawName.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  }

  const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const surname = parts[parts.length - 1];
  const cleanSurname = surname.replace(/[^a-zA-Z]/g, "");
  if (!cleanSurname) {
    return trimmed;
  }
  const surnameInitial = cleanSurname.charAt(0).toUpperCase() + ".";
  return `${firstName} ${surnameInitial}`;
}

// Helper to extract student initials for fallback avatar
function getInitials(rawName) {
  if (!rawName || typeof rawName !== "string") return "ST";
  const trimmed = rawName.trim();
  if (!trimmed) return "ST";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function StudentProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const studentId = user?.studentId || user?.id;

  const { data: profile, isLoading } = useMyProfile(studentId);
  const { data: completeness } = useProfileCompleteness(studentId);
  const updateMutation = useUpdateProfile();

  // Section Edit Modes
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [isEditingGuardian, setIsEditingGuardian] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(null); // 'profile' | 'parent' | 'guardian' | null

  // Photo Crop States
  const fileInputRef = useRef(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedCropFile, setSelectedCropFile] = useState(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Completion Breakdown Modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Form field refs for jump-to-field from completion modal
  const phoneRef = useRef(null);
  const dobRef = useRef(null);
  const bloodGroupRef = useRef(null);
  const addressRef = useRef(null);
  const fatherNameRef = useRef(null);
  const fatherPhoneRef = useRef(null);
  const motherNameRef = useRef(null);
  const motherPhoneRef = useRef(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm({
    resolver: zodResolver(studentProfileSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      dob: "",
      bloodGroup: "",
      address: "",
      fatherName: "",
      fatherPhone: "",
      motherName: "",
      motherPhone: "",
      guardianName: "",
      guardianPhone: "",
    },
  });

  // Populate form with existing student profile data
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || user?.name || "",
        phone: profile.phone || "",
        dob: profile.dob || "",
        bloodGroup: profile.bloodGroup || "",
        address: profile.address || "",
        fatherName: profile.fatherName || "",
        fatherPhone: profile.fatherPhone || "",
        motherName: profile.motherName || "",
        motherPhone: profile.motherPhone || "",
        guardianName: profile.guardianName || "",
        guardianPhone: profile.guardianPhone || "",
      });
    }
  }, [profile, user, reset]);

  // Form values watcher for real-time local completion calculation
  const watchedValues = watch();

  // 14-Field Profile Completion Calculation strictly from saved MySQL database record
  const completionStats = useMemo(() => {
    const stats = calculateProfileCompletion(profile || {});
    // Connect form field refs for the jump-to-field modal
    const refMap = {
      phone: phoneRef,
      dob: dobRef,
      bloodGroup: bloodGroupRef,
      address: addressRef,
      fatherName: fatherNameRef,
      fatherPhone: fatherPhoneRef,
      motherName: motherNameRef,
      motherPhone: motherPhoneRef,
    };
    const fieldsWithRefs = stats.fields.map((f) => ({
      ...f,
      ref: refMap[f.key] || null,
    }));
    return {
      ...stats,
      fields: fieldsWithRefs,
    };
  }, [profile]);

  // Handle Photo File Selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const validation = await validatePhotoFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedCropFile(file);
    setShowCropModal(true);
  };

  // Confirm Cropped Photo
  const handleConfirmCrop = (data) => {
    setPendingPhotoFile(data.blob);
    setPendingPhotoPreview(data.dataUrl);
    setShowCropModal(false);
    toast.success("Profile photo adjusted! Click Save to confirm changes.");
  };

  // Jump to specific field from completion modal
  const handleJumpToField = (fieldRef) => {
    setShowCompletionModal(false);
    if (fieldRef && fieldRef.current) {
      setIsEditingProfile(true);
      setIsEditingParent(true);
      setTimeout(() => {
        fieldRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        fieldRef.current.focus();
      }, 200);
    }
  };

  // Section 1: Save Student Profile & Name
  const handleSaveProfileSection = async () => {
    try {
      setIsSavingSection("profile");

      const cleanName = watchedValues.name ? String(watchedValues.name).trim() : "";
      if (!cleanName || cleanName.length < 2) {
        toast.error("Student name cannot be empty and must be at least 2 characters.");
        setIsSavingSection(null);
        return;
      }
      if (cleanName.length > 50) {
        toast.error("Student name cannot exceed 50 characters.");
        setIsSavingSection(null);
        return;
      }
      if (!/^[a-zA-Z\s.']+$/.test(cleanName)) {
        toast.error("Student name may only contain letters, spaces, dots, and apostrophes.");
        setIsSavingSection(null);
        return;
      }

      let finalPhotoUrl = profile?.photo || profile?.photoDataUrl || null;

      if (pendingPhotoFile) {
        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("studentId", studentId);

        const uploadRes = await fetch("/api/student/photo", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.ok) {
          throw new Error(uploadJson.message || "Failed to upload profile photo.");
        }
        finalPhotoUrl = uploadJson.url;
      }

      const patch = {
        name: cleanName,
        phone: watchedValues.phone?.trim() || "",
        dob: watchedValues.dob || "",
        bloodGroup: watchedValues.bloodGroup || "",
        address: watchedValues.address?.trim() || "",
      };

      if (finalPhotoUrl) {
        patch.photo = finalPhotoUrl;
        patch.photoDataUrl = finalPhotoUrl;
      }

      await updateMutation.mutateAsync({ studentId, patch });
      setPendingPhotoFile(null);
      setPendingPhotoPreview(null);
      setIsEditingProfile(false);
      toast.success("Student name and profile updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSavingSection(null);
      setIsUploadingPhoto(false);
    }
  };

  // Section 1: Cancel Student Profile
  const handleCancelProfileSection = () => {
    if (profile) {
      reset({
        ...watchedValues,
        name: profile.name || user?.name || "",
        phone: profile.phone || "",
        dob: profile.dob || "",
        bloodGroup: profile.bloodGroup || "",
        address: profile.address || "",
      });
    }
    setPendingPhotoFile(null);
    setPendingPhotoPreview(null);
    setIsEditingProfile(false);
  };

  // Section 2: Save Parent Details
  const handleSaveParentSection = async () => {
    try {
      setIsSavingSection("parent");
      const patch = {
        fatherName: watchedValues.fatherName?.trim() || "",
        fatherPhone: watchedValues.fatherPhone?.trim() || "",
        motherName: watchedValues.motherName?.trim() || "",
        motherPhone: watchedValues.motherPhone?.trim() || "",
      };

      await updateMutation.mutateAsync({ studentId, patch });
      setIsEditingParent(false);
      toast.success("Parent details updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update parent details.");
    } finally {
      setIsSavingSection(null);
    }
  };

  // Section 2: Cancel Parent Details
  const handleCancelParentSection = () => {
    if (profile) {
      reset({
        ...watchedValues,
        fatherName: profile.fatherName || "",
        fatherPhone: profile.fatherPhone || "",
        motherName: profile.motherName || "",
        motherPhone: profile.motherPhone || "",
      });
    }
    setIsEditingParent(false);
  };

  // Section 3: Save Guardian Details
  const handleSaveGuardianSection = async () => {
    try {
      setIsSavingSection("guardian");
      const patch = {
        guardianName: watchedValues.guardianName?.trim() || "",
        guardianPhone: watchedValues.guardianPhone?.trim() || "",
      };

      await updateMutation.mutateAsync({ studentId, patch });
      setIsEditingGuardian(false);
      toast.success("Guardian details updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update guardian details.");
    } finally {
      setIsSavingSection(null);
    }
  };

  // Section 3: Cancel Guardian Details
  const handleCancelGuardianSection = () => {
    if (profile) {
      reset({
        ...watchedValues,
        guardianName: profile.guardianName || "",
        guardianPhone: profile.guardianPhone || "",
      });
    }
    setIsEditingGuardian(false);
  };

  // Student Info variables
  const studentName = profile?.name || user?.name || "Student";
  const formattedDisplayName = useMemo(
    () => formatStudentDisplayName(studentName),
    [studentName]
  );
  const department = profile?.dept || profile?.department || "—";
  const academicYear =
    YEAR_DISPLAY_MAP[profile?.year] ||
    (profile?.year ? `${profile.year}th Year` : "—");
  const regNo = profile?.regNo || profile?.regNumber || "—";
  const roomNo = profile?.roomNumber || profile?.room || profile?.roomNo || "—";
  const studentUid = profile?.studentId || user?.studentId || studentId;
  const hasPhoto = Boolean(pendingPhotoPreview || profile?.photo || profile?.photoDataUrl);
  const studentInitials = useMemo(() => getInitials(studentName), [studentName]);
  const activePhoto =
    pendingPhotoPreview ||
    profile?.photo ||
    profile?.photoDataUrl ||
    "";

  // SVG Circular Ring Constants
  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~314.159
  const ringOffset = ringCircumference * (1 - completionStats.percentage / 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-28 md:pb-12 text-slate-800 select-none animate-in fade-in duration-300">
      
      {/* ========================================================= */}
      {/* 1. STUDENT PROFILE CARD (TWO SEPARATE AREAS: PHOTO & INFO)*/}
      {/* ========================================================= */}
      <div className="relative bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6 md:p-8 space-y-4">
        {/* Horizontal Layout: Left Side (Large Photo Area) + Right Side (Separate Student Details Container) */}
        <div className="flex flex-row items-center sm:items-stretch gap-3 sm:gap-6 md:gap-8">
          
          {/* ===================================================== */}
          {/* 1. LEFT SECTION: Large Circular Profile Photo         */}
          {/* Green-marked area reference (230-260px on desktop)   */}
          {/* ===================================================== */}
          <div className="flex flex-col items-center justify-center shrink-0 w-28 sm:w-44 md:w-56 lg:w-[260px] my-auto self-center">
            <div
              className={cn(
                "relative w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52 lg:w-[250px] lg:h-[250px] rounded-full overflow-hidden border-2 border-slate-200/90 bg-slate-100 shadow-sm flex items-center justify-center aspect-square group",
                isEditingProfile && "cursor-pointer"
              )}
              onClick={() => {
                if (isEditingProfile) {
                  fileInputRef.current?.click();
                } else {
                  setShowCompletionModal(true);
                }
              }}
              title={isEditingProfile ? "Click to change photo" : "Click to view completion details"}
            >
              {hasPhoto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activePhoto}
                  alt={formattedDisplayName}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div
                  data-testid="student-initials-fallback"
                  className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl sm:text-4xl lg:text-5xl select-none"
                >
                  {studentInitials}
                </div>
              )}

              {pendingPhotoPreview && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-extrabold bg-primary text-white shadow border border-white animate-pulse">
                  Pending
                </span>
              )}

              {/* Edit Mode Camera Overlay */}
              {isEditingProfile && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition opacity-90 hover:opacity-100">
                  <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow" />
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />
          </div>

          {/* ===================================================== */}
          {/* 2. RIGHT SECTION: Separate Student Details Container  */}
          {/* Red-marked area reference                             */}
          {/* ===================================================== */}
          <div className="flex-1 min-w-0 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xs flex flex-col justify-between">
            {isEditingProfile ? (
              /* Editable Mode Form */
              <div className="space-y-3">
                {/* 1. Student Name - EDITABLE INPUT */}
                <div className="pb-2 border-b border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">
                      {(watchedValues.name || "").length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    data-testid="student-name-input"
                    maxLength={50}
                    {...register("name")}
                    placeholder="Enter full student name"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-bold text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                  {errors.name && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* 2. Student Details - MIDDLE (Two-column grid) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Row 1: Year | Department */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Year
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-semibold cursor-not-allowed uppercase"
                    />
                  </div>

                  {/* Row 2: Mobile No. | U.ID */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Mobile No.
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      ref={phoneRef}
                      {...register("phone")}
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm font-semibold"
                      placeholder="10-digit mobile"
                    />
                    {errors.phone && (
                      <p className="text-[9px] font-bold text-red-500 mt-0.5">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      U.ID
                    </label>
                    <input
                      type="text"
                      value={studentUid}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-mono font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* Row 3: Room No. | B. Group */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Room No.
                    </label>
                    <input
                      type="text"
                      value={roomNo}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      B. Group
                    </label>
                    <select
                      ref={bloodGroupRef}
                      {...register("bloodGroup")}
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm font-semibold"
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4: Register No. | D.O.B. */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Register No.
                    </label>
                    <input
                      type="text"
                      value={regNo}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-[11px] sm:text-xs font-mono font-semibold cursor-not-allowed tracking-tight"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      D.O.B.
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      ref={dobRef}
                      {...register("dob")}
                      className="w-full px-1.5 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 text-[11px] sm:text-xs font-semibold"
                    />
                  </div>

                  {/* Row 5: Gender */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                      Gender
                    </label>
                    <input
                      type="text"
                      value={watchedValues.gender || profile?.gender || "—"}
                      readOnly
                      disabled
                      className="w-full px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100/80 text-slate-700 text-xs sm:text-sm font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 3. Address - BOTTOM */}
                <div className="pt-2 sm:pt-2.5 border-t border-slate-200/70">
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 mb-0.5 uppercase tracking-wider">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    ref={addressRef}
                    {...register("address")}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none leading-relaxed"
                    placeholder="Enter full address"
                  />
                  {errors.address && (
                    <p className="text-[9px] font-bold text-red-500 mt-0.5">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* Edit Mode Actions */}
                <div className="pt-2.5 border-t border-slate-200/70 flex flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCancelProfileSection}
                    disabled={isSavingSection === "profile"}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="button"
                    onClick={handleSaveProfileSection}
                    disabled={isSavingSection === "profile"}
                    loading={isSavingSection === "profile"}
                    leftIcon={isSavingSection === "profile" ? undefined : Save}
                    size="sm"
                    className="min-w-[90px] bg-primary hover:bg-primary-hover text-white font-bold"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              /* Clean Static Digital ID-Card Display */
              <div className="space-y-2.5 sm:space-y-3.5">
                {/* 1. Student Name - TOP with Edit Button at Top-Right of this section */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                  <h2
                    data-testid="student-display-name"
                    className="student-display-name text-base sm:text-xl md:text-2xl font-bold text-slate-900 leading-snug break-words"
                  >
                    {formattedDisplayName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    aria-label="Edit Student Profile"
                    title="Edit Student Profile"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Student Details - MIDDLE (Two-column grid) */}
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-2 sm:gap-x-5 sm:gap-y-3">
                  {/* Row 1: Year | Department */}
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Year
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {academicYear}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Department
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 uppercase">
                      {department}
                    </span>
                  </div>

                  {/* Row 2: Mobile No. | U.ID */}
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Mobile No.
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {watchedValues.phone || profile?.phone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      U.ID
                    </span>
                    <span className="text-xs sm:text-sm font-semibold font-mono text-slate-800">
                      {studentUid}
                    </span>
                  </div>

                  {/* Row 3: Room No. | B. Group */}
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Room No.
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {roomNo}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      B. Group
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      {watchedValues.bloodGroup || profile?.bloodGroup || "—"}
                    </span>
                  </div>

                  {/* Row 4: Register No. | D.O.B. */}
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Register No.
                    </span>
                    <span className="text-[11px] sm:text-xs md:text-sm font-semibold font-mono text-slate-800 tracking-tight whitespace-nowrap block">
                      {regNo}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      D.O.B.
                    </span>
                    <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-slate-800 whitespace-nowrap block">
                      {watchedValues.dob || profile?.dob || "—"}
                    </span>
                  </div>

                  {/* Row 5: Gender */}
                  {(profile?.gender || watchedValues.gender) && (
                    <div>
                      <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Gender
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800">
                        {watchedValues.gender || profile?.gender}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Address - BOTTOM */}
                <div className="pt-2.5 sm:pt-3 border-t border-slate-200/80">
                  <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                    Address
                  </span>
                  <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                    {watchedValues.address || profile?.address || "No address provided"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PARENT DETAILS CARD (COMPLETELY SEPARATE CARD)        */}
      {/* ========================================================= */}
      <div className="relative bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6 md:p-8 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100/80">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Parent Details
            </h3>
          </div>
          {!isEditingParent && (
            <button
              type="button"
              onClick={() => setIsEditingParent(true)}
              aria-label="Edit Parent Details"
              title="Edit Parent Details"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingParent ? (
          /* Editable Form Controls for Parents */
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Father Name
                </label>
                <input
                  type="text"
                  ref={fatherNameRef}
                  {...register("fatherName")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Father's full name"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Father Mobile No.
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  ref={fatherPhoneRef}
                  {...register("fatherPhone")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Mother Name
                </label>
                <input
                  type="text"
                  ref={motherNameRef}
                  {...register("motherName")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Mother's full name"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Mother Mobile No.
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  ref={motherPhoneRef}
                  {...register("motherPhone")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelParentSection}
                disabled={isSavingSection === "parent"}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={handleSaveParentSection}
                disabled={isSavingSection === "parent"}
                loading={isSavingSection === "parent"}
                leftIcon={isSavingSection === "parent" ? undefined : Save}
                size="sm"
                className="min-w-[90px] bg-primary hover:bg-primary-hover text-white font-bold"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          /* Static Plain Text Display */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Father Name
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.fatherName || profile?.fatherName || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Father Mobile No.
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.fatherPhone || profile?.fatherPhone || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Mother Name
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.motherName || profile?.motherName || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Mother Mobile No.
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.motherPhone || profile?.motherPhone || "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. GUARDIAN DETAILS CARD (SEPARATE CARD & OPTIONAL)      */}
      {/* ========================================================= */}
      <div className="relative bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden p-4 sm:p-6 md:p-8 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100/80">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Guardian Details (Optional)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
              Optional
            </span>
          </div>
          {!isEditingGuardian && (
            <button
              type="button"
              onClick={() => setIsEditingGuardian(true)}
              aria-label="Edit Guardian Details"
              title="Edit Guardian Details"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingGuardian ? (
          /* Editable Form Controls for Guardian */
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Guardian Name
                </label>
                <input
                  type="text"
                  {...register("guardianName")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="Guardian name (optional)"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 mb-0.5">
                  Guardian Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  {...register("guardianPhone")}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelGuardianSection}
                disabled={isSavingSection === "guardian"}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                onClick={handleSaveGuardianSection}
                disabled={isSavingSection === "guardian"}
                loading={isSavingSection === "guardian"}
                leftIcon={isSavingSection === "guardian" ? undefined : Save}
                size="sm"
                className="min-w-[90px] bg-primary hover:bg-primary-hover text-white font-bold"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          /* Static Plain Text Display */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Guardian Name
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.guardianName || profile?.guardianName || "— (Optional)"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Guardian Mobile No.
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                {watchedValues.guardianPhone || profile?.guardianPhone || "— (Optional)"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* COMPLETION BREAKDOWN MODAL                                */}
      {/* ========================================================= */}
      {showCompletionModal && (
        <Modal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          title="Profile Completion Status"
          className="max-w-md w-full"
        >
          <div className="space-y-4 pt-1 select-none">
            {/* Header progress recap */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      completionStats.is100Percent ? "text-emerald-500" : "text-primary"
                    }`}
                  />
                  Overall Completion
                </span>
                <span className="font-mono text-sm text-primary">
                  {completionStats.percentage}% ({completionStats.filledCount} / {completionStats.totalRequired})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    completionStats.is100Percent ? "bg-emerald-500" : "bg-primary"
                  }`}
                  style={{ width: `${completionStats.percentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {completionStats.is100Percent
                  ? "Your profile is 100% complete! All essential hostel resident fields are in place."
                  : "Complete all 14 required fields below to reach 100% profile status. Guardian details are optional."}
              </p>
            </div>

            {/* Checklist of all 14 fields */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {completionStats.fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {field.complete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`font-semibold truncate ${field.complete ? "text-slate-800" : "text-amber-800"}`}>
                        {field.label}
                      </p>
                      <span className="text-[10px] text-slate-400 block">{field.group}</span>
                    </div>
                  </div>

                  {!field.complete && field.ref && (
                    <button
                      type="button"
                      onClick={() => handleJumpToField(field.ref)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer shrink-0"
                    >
                      Fill In &rarr;
                    </button>
                  )}
                  {field.complete && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      Done
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletionModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* PHOTO CROP MODAL                                          */}
      {/* ========================================================= */}
      {showCropModal && selectedCropFile && (
        <ProfilePhotoCropModal
          isOpen={showCropModal}
          onClose={() => setShowCropModal(false)}
          file={selectedCropFile}
          onConfirm={handleConfirmCrop}
        />
      )}
    </div>
  );
}
