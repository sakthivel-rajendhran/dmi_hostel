"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Trash2,
  RotateCw,
  AlertCircle,
  X,
  FlipHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validatePhotoFile,
  formatBytes,
  getDataUrlSizeBytes,
} from "@/lib/utils/image.js";

/**
 * Resident Photo Picker supporting Device File Upload and Live Camera Selfie.
 * Uploads original images up to 15 MB without automatic compression or quality loss.
 *
 * @param {object} props
 * @param {string|null} props.value - Data URL or image src
 * @param {Function} props.onChange - (dataUrl: string|null, meta?: object) => void
 * @param {string} [props.error] - Validation error message
 * @param {string} [props.label] - Field label
 * @param {boolean} [props.required]
 * @param {string} [props.className]
 */
export function PhotoPicker({
  value,
  onChange,
  error: externalError,
  label = "Profile Photo",
  required = true,
  className = "",
}) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const [internalError, setInternalError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);

  // Source selection modal (Device vs Live Camera)
  const [showSourceChoice, setShowSourceChoice] = useState(false);

  // Live Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [cameraLoading, setCameraLoading] = useState(false);

  const rawError = externalError || internalError;
  const displayError = typeof rawError === "string"
    ? (rawError.includes("expected string") || rawError.includes("received object") || rawError.includes("Invalid input")
        ? "Profile photo is required. Please choose or capture a photo."
        : rawError)
    : (rawError?.message?.includes?.("expected string") || rawError?.message?.includes?.("received object")
        ? "Profile photo is required. Please choose or capture a photo."
        : (rawError?.message || (rawError ? "Profile photo is required. Please choose or capture a photo." : null)));

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Connect stream to video element when camera is opened
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn("Video playback error:", err);
      });
    }
  }, [isCameraOpen, cameraStream]);

  // 1. Handle Device File Selection (Original uncompressed image)
  const handleFileSelect = async (e) => {
    setInternalError(null);
    setShowSourceChoice(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";

    setIsProcessing(true);
    try {
      const validation = await validatePhotoFile(file);
      if (!validation.valid) {
        setInternalError(validation.error);
        setIsProcessing(false);
        return;
      }

      // Read original untouched binary into Data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const meta = {
          fileSize: file.size,
          formattedSize: formatBytes(file.size),
          fileName: file.name,
          width: validation.width,
          height: validation.height,
        };
        setMetaInfo(meta);
        if (onChange) {
          onChange(dataUrl, meta);
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setInternalError("Failed to read image file from device.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setInternalError(err.message || "Failed to process selected image.");
      setIsProcessing(false);
    }
  };

  // 2. Start Live Camera
  const startCamera = async (facing = "user") => {
    setInternalError(null);
    setShowSourceChoice(false);
    setCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setInternalError("Camera access is not supported by this browser. Please upload from device.");
      setCameraLoading(false);
      return;
    }

    // Stop existing tracks if any
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setCameraFacing(facing);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setInternalError("Camera permission denied. Please allow camera access or choose a file from your device.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setInternalError("No camera detected. Please choose a file from your device.");
      } else {
        setInternalError("Unable to open camera. Please choose a file from your device.");
      }
    } finally {
      setCameraLoading(false);
    }
  };

  // 3. Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  // 4. Snap Photo from Camera Stream (High-res snapshot without compression)
  const captureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Mirror image for front-facing camera
    if (cameraFacing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.98);

    stopCamera();

    const sizeBytes = getDataUrlSizeBytes(dataUrl);
    const meta = {
      fileSize: sizeBytes,
      formattedSize: formatBytes(sizeBytes),
      fileName: "camera-selfie.jpg",
      width,
      height,
    };
    setMetaInfo(meta);
    if (onChange) {
      onChange(dataUrl, meta);
    }
  };

  // 5. Flip Camera (Front / Back)
  const flipCamera = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    startCamera(nextFacing);
  };

  const handleRemovePhoto = () => {
    setMetaInfo(null);
    setInternalError(null);
    if (onChange) {
      onChange(null, null);
    }
  };

  const triggerUploadClick = () => {
    setShowSourceChoice(true);
  };

  const displaySrc = typeof value === "string" ? value : (value?.dataUrl || value?.url || null);

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      {/* Label & Limit text */}
      <div className="w-full flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Maximum 15 MB
        </span>
      </div>

      {/* Hidden file input for device photo selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* MODAL 1: Choose Photo Source (Device vs Live Camera) */}
      {showSourceChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Select Photo Method
              </h3>
              <button
                type="button"
                onClick={() => setShowSourceChoice(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Option A: Upload from Device */}
              <button
                type="button"
                onClick={() => {
                  setShowSourceChoice(false);
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2.5 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Upload Photo
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  From Device Files
                </span>
              </button>

              {/* Option B: Camera Selfie */}
              <button
                type="button"
                onClick={() => startCamera("user")}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2.5 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Take Selfie
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Open Camera
                </span>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
              JPG, PNG, WebP • Maximum 15 MB • Minimum 200 × 200 px
            </p>
          </div>
        </div>
      )}

      {/* MODAL 2: Live Camera Viewfinder */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl flex flex-col items-center gap-4 text-white">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-400" /> Live Camera Selfie
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-full text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
              {cameraLoading && (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="text-xs">Initializing camera...</span>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  cameraFacing === "user" ? "-scale-x-100" : ""
                )}
              />

              {/* Viewfinder Guideline Oval */}
              <div className="absolute inset-0 border-2 border-indigo-400/40 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-60 border border-dashed border-white/50 rounded-full" />
              </div>
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-between w-full px-4">
              <button
                type="button"
                onClick={flipCamera}
                title="Switch camera"
                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={captureSelfie}
                className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Display: Chosen Photo vs Empty Dropzone */}
      {displaySrc ? (
        /* Photo Chosen State (Preview + Actions) */
        <div className="w-full flex flex-col items-center">
          <div className="relative group">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt="Student Resident Photo"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Actions overlay */}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <button
                type="button"
                onClick={triggerUploadClick}
                title="Change Photo"
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                title="Remove Photo"
                className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-700 text-white backdrop-blur-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={triggerUploadClick}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Change Photo
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State (Preserving exact layout) */
        <div
          onClick={triggerUploadClick}
          className={cn(
            "w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200",
            displayError
              ? "border-rose-400 bg-rose-50/40 dark:bg-rose-950/20"
              : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-900/40"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
            <Camera className="w-5 h-5" />
          </div>

          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Upload Resident Photo
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Click to browse or take camera selfie
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
            JPG, PNG, WebP • Maximum 15 MB • Minimum 200 × 200 px
          </span>
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="w-full mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

export default PhotoPicker;
