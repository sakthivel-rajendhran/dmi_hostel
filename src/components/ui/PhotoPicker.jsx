"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Upload, Trash2, RotateCw, ZoomIn, Check, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePolicy } from "@/hooks/usePolicy.js";
import {
  validatePhotoFile,
  loadImage,
  renderCroppedPhoto,
  formatBytes,
  getDataUrlSizeBytes,
} from "@/lib/utils/image.js";

/**
 * Square Photo Picker with Camera Capture, Auto/Manual Square Crop,
 * and Strict &le; 1 MB Policy Compliance.
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
  const { policy } = usePolicy();
  const fileInputRef = useRef(null);

  const [internalError, setInternalError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null); // { originalSize, finalSize }

  // Cropper state
  const [croppingImage, setCroppingImage] = useState(null); // HTMLImageElement
  const [croppingFile, setCroppingFile] = useState(null);
  const [zoom, setZoom] = useState(1);

  const displayError = externalError || internalError;

  const handleFileSelect = async (e) => {
    setInternalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";

    setIsProcessing(true);
    try {
      // 1. Validate file against active policy
      const validation = await validatePhotoFile(file, policy);
      if (!validation.valid) {
        setInternalError(validation.error);
        setIsProcessing(false);
        return;
      }

      // 2. Load image into memory for cropping
      const img = await loadImage(file);
      setCroppingFile(file);
      setCroppingImage(img);
      setZoom(1);
    } catch (err) {
      setInternalError(err.message || "Failed to process selected image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!croppingImage) return;
    setIsProcessing(true);
    setInternalError(null);

    try {
      // Calculate square center crop based on natural dimensions & zoom
      const natW = croppingImage.naturalWidth;
      const natH = croppingImage.naturalHeight;
      const minDim = Math.min(natW, natH);
      const cropSize = minDim / zoom;

      const cropX = Math.max(0, (natW - cropSize) / 2);
      const cropY = Math.max(0, (natH - cropSize) / 2);

      const targetPx = 400;

      const result = await renderCroppedPhoto(
        croppingImage,
        { sx: cropX, sy: cropY, sWidth: cropSize, sHeight: cropSize, outputSize: targetPx },
        croppingFile?.type || "image/jpeg"
      );

      const processedDataUrl = result.dataUrl;
      const finalBytes = result.sizeBytes;
      const originalBytes = croppingFile ? croppingFile.size : finalBytes;

      const meta = {
        originalSize: originalBytes,
        finalSize: finalBytes,
        originalFormatted: formatBytes(originalBytes),
        finalFormatted: formatBytes(finalBytes),
        width: targetPx,
        height: targetPx,
      };

      setMetaInfo(meta);
      setCroppingImage(null);
      setCroppingFile(null);

      if (onChange) {
        onChange(processedDataUrl, meta);
      }
    } catch (err) {
      setInternalError(err.message || "Failed to crop and compress photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCrop = () => {
    setCroppingImage(null);
    setCroppingFile(null);
    setInternalError(null);
  };

  const handleRemovePhoto = () => {
    setMetaInfo(null);
    setInternalError(null);
    if (onChange) {
      onChange(null, null);
    }
  };

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      {/* Label & Policy badge */}
      <div className="w-full flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {policy.photoPolicy === "reject" ? "Max 1 MB strict" : "Auto-compressed (≤1 MB)"}
        </span>
      </div>

      {/* Hidden file input supporting camera capture on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 1. Modal / Overlay Cropper if an image was picked */}
      {croppingImage ? (
        <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Adjust Square Crop & Zoom
          </p>

          <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md bg-black flex items-center justify-center">
            {/* Visual representation of the crop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={croppingImage.src}
              alt="Crop preview"
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.1s ease-out",
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
            {/* Square crop crosshair guide */}
            <div className="absolute inset-0 border border-white/40 pointer-events-none rounded-2xl" />
          </div>

          {/* Zoom Slider */}
          <div className="w-full max-w-[220px] flex items-center gap-2">
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Crop Action Buttons */}
          <div className="flex items-center gap-2 w-full max-w-[240px]">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCrop}
              className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              {isProcessing ? "Processing..." : "Done"}
            </button>
          </div>
        </div>
      ) : value ? (
        /* 2. Photo Chosen State (Preview + Stats + Actions) */
        <div className="w-full flex flex-col items-center">
          <div className="relative group">
            <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Student Profile"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Actions overlay */}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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

          {/* Size Info Badge */}
          {metaInfo && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span>
                {metaInfo.originalFormatted !== metaInfo.finalFormatted
                  ? `Original ${metaInfo.originalFormatted} → ${metaInfo.finalFormatted}`
                  : `Photo Size: ${metaInfo.finalFormatted}`}
              </span>
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Change Photo
            </button>
          </div>
        </div>
      ) : (
        /* 3. Empty Dropzone State */
        <div
          onClick={() => fileInputRef.current?.click()}
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
            JPG, PNG, WebP • Min 200x200 px
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
