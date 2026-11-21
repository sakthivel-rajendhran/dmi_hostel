"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Home,
  Shield,
  Heart,
  Calendar,
  MapPin,
  Lock,
  Camera,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Moon,
  Sun,
  Laptop,
  LogOut,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth.js";
import { useMyProfile, useProfileCompleteness, useUpdateProfile } from "@/hooks/queries/useStudents.js";
import { useTheme } from "next-themes";
import { usePolicy } from "@/hooks/usePolicy.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { toTitleCase } from "@/lib/utils/string.js";
import { studentProfileSchema, computeBatch, validateRoomMatchesFloor } from "@/lib/validators.js";

import { Button } from "@/components/ui/Button.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm.jsx";
import { PhotoPicker } from "@/components/ui/PhotoPicker.jsx";
import { PushNotificationCard } from "@/components/common/PushNotificationCard.jsx";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt.jsx";

const BLOOD_GROUPS = ["A+ve", "A-ve", "B+ve", "B-ve", "O+ve", "O-ve", "AB+ve", "AB-ve"];

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { policy } = usePolicy();
  const studentId = user?.studentId || user?.id || "CSE-3-001";

  const { data: profile, isLoading } = useMyProfile(studentId);
  const { data: completeness } = useProfileCompleteness(studentId);
  const updateMutation = useUpdateProfile();

  // Dialogs
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [tempPhotoDataUrl, setTempPhotoDataUrl] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [lastPwdChange, setLastPwdChange] = useState("Recently updated");

  // Notification Preferences
  const [prefPassAlerts, setPrefPassAlerts] = useState(true);
  const [prefCurfewReminders, setPrefCurfewReminders] = useState(true);
  const [prefAnnouncements, setPrefAnnouncements] = useState(true);

  // Field refs for completeness bar focus jumps
  const phoneInputRef = useRef(null);
  const floorInputRef = useRef(null);
  const roomInputRef = useRef(null);
  const guardianNameRef = useRef(null);
  const guardianPhoneRef = useRef(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isDirty, errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentProfileSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      bloodGroup: "O+ve",
      dob: "2004-05-14",
      address: "",
      floor: "GF",
      roomNumber: "",
      guardianName: "",
      guardianRelation: "Father",
      guardianPhone: "",
      guardianAltPhone: "",
    },
  });

  const selectedFloor = watch("floor");
  const isHostelVerified = profile?.hostelVerification === "verified";
  const isWardenAllocation = policy.roomAllocationMode === "warden_allocates";

  // Populate form with profile data
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        phone: profile.phone || "",
        bloodGroup: profile.bloodGroup || "O+ve",
        dob: profile.dob || "2004-05-14",
        address: profile.address || "",
        floor: profile.floor || "GF",
        roomNumber: profile.roomNumber || profile.room || profile.roomNo || "",
        guardianName: profile.guardianName || "",
        guardianRelation: profile.guardianRelation || "Father",
        guardianPhone: profile.guardianPhone || "",
        guardianAltPhone: profile.guardianAltPhone || "",
      });
    }

    if (typeof window !== "undefined") {
      const lastChange = localStorage.getItem("dmi_last_pwd_change");
      if (lastChange) {
        setLastPwdChange(
          new Date(lastChange).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        );
      }
    }
  }, [profile, reset]);

  // Copy Student ID
  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(studentId);
      toast.success(`Copied Student ID: ${studentId}`);
    }
  };

  // Jump to missing field
  const handleJumpToField = (fieldKey) => {
    const refMap = {
      phone: phoneInputRef,
      floor: floorInputRef,
      roomNumber: roomInputRef,
      guardianName: guardianNameRef,
      guardianPhone: guardianPhoneRef,
    };
    const targetRef = refMap[fieldKey];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      targetRef.current.focus();
    }
  };

  // Auto Title Case Name on blur
  const handleNameBlur = (e) => {
    const titleCased = toTitleCase(e.target.value);
    setValue("name", titleCased, { shouldDirty: true, shouldValidate: true });
  };

  // Form Submit Handler
  const onSubmit = async (data) => {
    try {
      const flConfig = data.floor ? WORKFLOW_CONFIG.floors.find((f) => f.id === data.floor) : null;
      const floorLabel = flConfig ? flConfig.label : (data.floor || profile?.floorLabel || null);

      const patch = {
        ...data,
      };
      if (floorLabel) patch.floorLabel = floorLabel;
      if (data.roomNumber) {
        patch.room = data.roomNumber;
        patch.roomNo = data.roomNumber;
      }

      await updateMutation.mutateAsync({
        studentId,
        patch,
      });
      toast.success("Profile records updated successfully!");
      reset(data);
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    }
  };

  // Handle Photo Save
  const handleSavePhoto = async () => {
    if (!tempPhotoDataUrl) return;
    try {
      await updateMutation.mutateAsync({
        studentId,
        patch: {
          photo: tempPhotoDataUrl,
          photoDataUrl: tempPhotoDataUrl,
        },
      });
      setShowPhotoModal(false);
      setTempPhotoDataUrl(null);
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update photo.");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Hostel Verification Status Chip styling
  const renderVerificationChip = () => {
    const status = profile?.hostelVerification || (profile?.floor ? "verified" : "unallocated");
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
          <CheckCircle2 className="w-3 h-3" /> Hostel Verified
        </span>
      );
    }
    if (status === "unallocated") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/60">
          <Info className="w-3 h-3" /> Unallocated
        </span>
      );
    }
    if (status === "needs_correction") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300/60">
          <AlertTriangle className="w-3 h-3" /> Needs Correction
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60">
        <AlertTriangle className="w-3 h-3" /> Pending Verification
      </span>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-[calc(var(--tabbar-h)+1.5rem)] lg:pb-8 select-none animate-in fade-in duration-300">
      {/* 1. HERO IDENTITY CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary-light/5 to-transparent border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          {/* Avatar with Photo Upload Trigger */}
          <div className="relative group shrink-0">
            {profile?.photo || profile?.photoDataUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.photo || profile.photoDataUrl}
                  alt={profile?.name || "Student"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Avatar
                name={profile?.name || user?.name || "Rahul Kumar"}
                size="xl"
                status="online"
                className="ring-4 ring-primary/20 shadow-md"
              />
            )}

            <button
              type="button"
              onClick={() => {
                setTempPhotoDataUrl(null);
                setShowPhotoModal(true);
              }}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white hover:bg-primary-hover shadow-md transition transform active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {profile?.name || user?.name || "Rahul Kumar"}
              </h2>
              {renderVerificationChip()}
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-primary transition"
                title="Click to copy ID"
              >
                <span>{studentId}</span>
                <Copy className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              {profile?.department || "CSE"} • Year {profile?.year || 3} •{" "}
              {profile?.floorLabel && profile?.roomNo
                ? `${profile.floorLabel} • Room ${profile.roomNo}`
                : "Room: Awaiting Allocation"}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Completeness Bar */}
      {completeness && (
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Profile Completeness
            </span>
            <span className="font-mono text-primary">{completeness.percentage}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                completeness.percentage === 100
                  ? "bg-emerald-500"
                  : completeness.percentage > 50
                  ? "bg-primary"
                  : "bg-amber-500"
              }`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>

          {!completeness.complete && completeness.missingFields?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500">Missing fields:</span>
              {completeness.missingFields.map((field, i) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => handleJumpToField(completeness.missingFieldKeys?.[i])}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
                >
                  {field} &rarr;
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN FORM SECTIONS: 2-Column Responsive Layout on Desktop */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (6 cols on lg): Personal, Academic, Notifications */}
          <div className="space-y-5 lg:col-span-6">
            {/* PERSONAL DETAILS */}
            <Card className="p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Personal Information
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    onBlur={handleNameBlur}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Phone
                    </label>
                    <input
                      ref={(e) => {
                        register("phone").ref(e);
                        phoneInputRef.current = e;
                      }}
                      type="tel"
                      {...register("phone")}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blood Group
                    </label>
                    <select
                      {...register("bloodGroup")}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    {...register("address")}
                    placeholder="Door No, Street Name, City, Pincode"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </Card>

            {/* ACADEMIC RECORDS */}
            <Card className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Academic Records
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-slate-500 text-[11px] mb-1">Register Number</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    {profile?.regNo || profile?.regNumber || "310622104045"}
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 text-[11px] mb-1">Degree Programme</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    {profile?.programme || "B.E."}
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 text-[11px] mb-1">Department & Section</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    {profile?.department || "CSE"} - Sec {profile?.section || "A"}
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 text-[11px] mb-1">Academic Batch</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                    {profile?.batch || computeBatch(profile?.year || 3, 4)}
                  </div>
                </div>
              </div>
            </Card>

            {/* NOTIFICATION PREFERENCES */}
            <Card className="p-4 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Notification Settings
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Pass Approval Notifications</span>
                  <Switch checked={prefPassAlerts} onChange={setPrefPassAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Return Curfew Reminders</span>
                  <Switch checked={prefCurfewReminders} onChange={setPrefCurfewReminders} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Hostel Circulars & Notices</span>
                  <Switch checked={prefAnnouncements} onChange={setPrefAnnouncements} />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column (6 cols on lg): Hostel, Guardian, Security, PWA, Logout */}
          <div className="space-y-5 lg:col-span-6">
            {/* HOSTEL ACCOMMODATION */}
            <Card className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Hostel Accommodation
                  </h3>
                </div>
                {renderVerificationChip()}
              </div>

              {/* Conditional based on active policy */}
              {isWardenAllocation ? (
                /* Mode: warden_allocates */
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Hostel room allocations are assigned centrally by the Chief Warden. Contact the
                      warden office for allocation or transfer requests.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-500 text-[11px] mb-1">Allocated Floor</span>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                        {profile?.floorLabel || "Not allocated yet"}
                      </div>
                    </div>

                    <div>
                      <span className="block text-slate-500 text-[11px] mb-1">Allocated Room</span>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                        {profile?.roomNo || profile?.room || "Not allocated yet"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode: student_enters */
                <div className="space-y-3">
                  {isHostelVerified && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Hostel allocation verified by Warden. Room changes require warden approval.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Floor
                      </label>
                      <select
                        disabled={isHostelVerified}
                        ref={(e) => {
                          register("floor").ref(e);
                          floorInputRef.current = e;
                        }}
                        {...register("floor")}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      >
                        {WORKFLOW_CONFIG.floors.map((fl) => (
                          <option key={fl.id} value={fl.id}>
                            {fl.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Room Number
                      </label>
                      <input
                        disabled={isHostelVerified}
                        ref={(e) => {
                          register("roomNumber").ref(e);
                          roomInputRef.current = e;
                        }}
                        type="text"
                        placeholder={selectedFloor === "GF" ? "e.g. G04" : "e.g. 304"}
                        {...register("roomNumber")}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      />
                      {errors.roomNumber && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.roomNumber.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* GUARDIAN CONTACTS */}
            <Card className="p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Guardian Details
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guardian Name
                    </label>
                    <input
                      ref={(e) => {
                        register("guardianName").ref(e);
                        guardianNameRef.current = e;
                      }}
                      type="text"
                      {...register("guardianName")}
                      placeholder="Parent / Guardian Name"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {errors.guardianName && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.guardianName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship
                    </label>
                    <select
                      {...register("guardianRelation")}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Legal Guardian</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Guardian Phone
                    </label>
                    <input
                      ref={(e) => {
                        register("guardianPhone").ref(e);
                        guardianPhoneRef.current = e;
                      }}
                      type="tel"
                      {...register("guardianPhone")}
                      placeholder="Primary phone"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {errors.guardianPhone && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.guardianPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alt Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      {...register("guardianAltPhone")}
                      placeholder="Alternate phone"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* SECURITY & PASSWORD */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Account Security
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Last updated: {lastPwdChange}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPwdModal(true)}
                  className="text-xs font-semibold"
                >
                  Change Password
                </Button>
              </div>
            </Card>

            {/* PWA INSTALL & NOTIFICATIONS */}
            <PwaInstallPrompt variant="card" />
            <PushNotificationCard />

            {/* LOGOUT BUTTON */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowLogoutDialog(true)}
                leftIcon={LogOut}
                className="w-full text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Log Out of Student Account
              </Button>
            </div>
          </div>
        </div>

        {/* STICKY SAVE BAR */}
        {isDirty && (
          <div className="sticky bottom-[var(--tabbar-h)] md:bottom-4 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="text-xs">
              <span className="font-bold text-amber-600 dark:text-amber-400 block">
                Unsaved Changes
              </span>
              <span className="text-[10px] text-slate-500">
                Remember to save your updated records.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => reset()}
                leftIcon={RotateCcw}
                className="text-xs font-semibold"
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                leftIcon={Save}
                className="text-xs font-bold shadow-md"
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Photo Upload Modal (Supports camera, crop, and ≤1MB policy) */}
      <Modal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Update Profile Photo"
      >
        <div className="py-2 space-y-4">
          <PhotoPicker
            value={tempPhotoDataUrl || profile?.photo || profile?.photoDataUrl || null}
            onChange={(dataUrl) => setTempPhotoDataUrl(dataUrl)}
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPhotoModal(false)}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!tempPhotoDataUrl}
              onClick={handleSavePhoto}
              className="flex-1 text-xs font-bold"
            >
              Save Photo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPwdModal}
        onClose={() => setShowPwdModal(false)}
        title="Change Account Password"
      >
        <ChangePasswordForm
          onSuccess={() => setShowPwdModal(false)}
          onCancel={() => setShowPwdModal(false)}
        />
      </Modal>

      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
        title="Confirm Logout?"
        description="Are you sure you want to sign out from the DMI College Hostel Management PWA?"
        confirmText="Yes, Log Out"
        cancelText="Stay Logged In"
        variant="danger"
      />
    </div>
  );
}
