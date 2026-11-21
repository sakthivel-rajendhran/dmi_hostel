"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { formatBytes, renderCroppedPhoto, MAX_PROFILE_PHOTO_BYTES } from "@/lib/utils/image.js";
import { toast } from "sonner";

/**
 * WhatsApp-style Adjustable Circular Profile Photo Crop Modal
 *
 * Provides:
 * - Circular aperture with darkened backdrop mask
 * - Horizontal and vertical drag repositioning
 * - Zoom controls: slider, +/- buttons, mouse wheel, and touch pinch-to-zoom
 * - Bounded containment ensuring image covers the circle
 * - Live circular preview and file size indicator
 * - Cancel and Confirm Photo actions using project's default Light Theme tokens
 */
export function ProfilePhotoCropModal({
  isOpen,
  onClose,
  file,
  onConfirm,
}) {
  const [imageObj, setImageObj] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Touch pinch-to-zoom state
  const touchDistanceRef = useRef(null);
  const initialPinchZoomRef = useRef(1);

  // Canvas / container references
  const containerRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Standard crop aperture dimension (px)
  const CROP_DIAMETER = 260;

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImageObj(null);
      return;
    }

    let isMounted = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      if (!isMounted) return;
      setImageObj(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };

    img.onerror = () => {
      if (!isMounted) return;
      toast.error("Could not load image file.");
      onClose();
    };

    return () => {
      isMounted = false;
      URL.revokeObjectURL(url);
    };
  }, [file, onClose]);

  // Compute base scale and max offsets to maintain containment
  const getContainment = useCallback(
    (currentZoom) => {
      if (!imageObj) return { baseScale: 1, minX: 0, maxX: 0, minY: 0, maxY: 0, renderedW: 0, renderedH: 0 };

      const natW = imageObj.naturalWidth || 1;
      const natH = imageObj.naturalHeight || 1;

      // Base scale so smallest dimension covers crop diameter
      const baseScale = Math.max(CROP_DIAMETER / natW, CROP_DIAMETER / natH);
      const totalScale = baseScale * currentZoom;

      const renderedW = natW * totalScale;
      const renderedH = natH * totalScale;

      const maxOffsetX = Math.max(0, (renderedW - CROP_DIAMETER) / 2);
      const maxOffsetY = Math.max(0, (renderedH - CROP_DIAMETER) / 2);

      return {
        baseScale,
        totalScale,
        renderedW,
        renderedH,
        minX: -maxOffsetX,
        maxX: maxOffsetX,
        minY: -maxOffsetY,
        maxY: maxOffsetY,
      };
    },
    [imageObj, CROP_DIAMETER]
  );

  // Clamp offset to bounds
  const clampOffset = useCallback(
    (newOffset, currentZoom) => {
      const bounds = getContainment(currentZoom);
      return {
        x: Math.min(bounds.maxX, Math.max(bounds.minX, newOffset.x)),
        y: Math.min(bounds.maxY, Math.max(bounds.minY, newOffset.y)),
      };
    },
    [getContainment]
  );

  // Pointer drag events for smooth cross-device panning (Mouse & Touch)
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset({ ...offset });
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const desired = {
      x: initialOffset.x + deltaX,
      y: initialOffset.y + deltaY,
    };
    setOffset(clampOffset(desired, zoom));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Touch pinch-to-zoom support
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / touchDistanceRef.current;
      const newZoom = Math.min(3, Math.max(1, initialPinchZoomRef.current * ratio));
      setZoom(newZoom);
      setOffset((prev) => clampOffset(prev, newZoom));
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.min(3, Math.max(1, zoom + zoomStep));
    setZoom(newZoom);
    setOffset((prev) => clampOffset(prev, newZoom));
  };

  // Zoom button handlers
  const handleZoomChange = (newZoom) => {
    const clamped = Math.min(3, Math.max(1, newZoom));
    setZoom(clamped);
    setOffset((prev) => clampOffset(prev, clamped));
  };

  // Update live preview canvas
  useEffect(() => {
    if (!imageObj || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const previewSize = 72;
    canvas.width = previewSize;
    canvas.height = previewSize;

    const bounds = getContainment(zoom);
    const { totalScale } = bounds;

    // Convert circular crop center to image natural source coordinates
    const natW = imageObj.naturalWidth;
    const natH = imageObj.naturalHeight;

    const imgCenterX = natW / 2 - offset.x / totalScale;
    const imgCenterY = natH / 2 - offset.y / totalScale;
    const srcCropSize = CROP_DIAMETER / totalScale;

    const sx = imgCenterX - srcCropSize / 2;
    const sy = imgCenterY - srcCropSize / 2;

    ctx.clearRect(0, 0, previewSize, previewSize);

    // Circular clip on preview
    ctx.save();
    ctx.beginPath();
    ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageObj, sx, sy, srcCropSize, srcCropSize, 0, 0, previewSize, previewSize);
    ctx.restore();
  }, [imageObj, zoom, offset, getContainment]);

  // Handle Confirm Photo
  const handleConfirmCrop = async () => {
    if (!imageObj || !file) return;
    setIsProcessing(true);

    try {
      const bounds = getContainment(zoom);
      const { totalScale } = bounds;

      const natW = imageObj.naturalWidth;
      const natH = imageObj.naturalHeight;

      const imgCenterX = natW / 2 - offset.x / totalScale;
      const imgCenterY = natH / 2 - offset.y / totalScale;
      const srcCropSize = CROP_DIAMETER / totalScale;

      const sx = Math.max(0, imgCenterX - srcCropSize / 2);
      const sy = Math.max(0, imgCenterY - srcCropSize / 2);
      const sDim = Math.min(srcCropSize, natW - sx, natH - sy);

      // Render high-fidelity square crop without lossy compression
      const outputDimension = Math.min(800, Math.max(400, Math.round(sDim)));
      const result = await renderCroppedPhoto(
        imageObj,
        {
          sx,
          sy,
          sWidth: sDim,
          sHeight: sDim,
          outputSize: outputDimension,
        },
        file.type || "image/jpeg"
      );

      // Final size check: if larger than 5 MB, reject
      if (result.sizeBytes > MAX_PROFILE_PHOTO_BYTES) {
        toast.error("Image size must be 5 MB or less. Please select another image.");
        setIsProcessing(false);
        return;
      }

      // Convert Blob to File object for standard FormData upload
      const croppedFile = new File([result.blob], file.name || "profile.jpg", {
        type: file.type || "image/jpeg",
        lastModified: Date.now(),
      });

      onConfirm({
        file: croppedFile,
        blob: result.blob,
        dataUrl: result.dataUrl,
        sizeBytes: result.sizeBytes,
      });

      toast.success("Profile photo adjusted! Click 'Save Profile' to apply changes.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to finalize crop.");
    } finally {
      setIsProcessing(false);
    }
  };

  const bounds = getContainment(zoom);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Profile Photo"
      className="max-w-md w-full"
    >
      <div className="space-y-4 pt-1 select-none">
        {/* Instruction Subtitle */}
        <p className="text-xs text-slate-500 font-medium text-center">
          Drag to reposition and use the controls or pinch to zoom.
        </p>

        {/* Crop Viewport Container */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-[300px] sm:h-[320px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-200 shadow-inner"
        >
          {/* Image Layer */}
          {imageObj && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 flex items-center justify-center touch-none"
            >
              <img
                src={imageObj.src}
                alt="Crop subject"
                draggable={false}
                style={{
                  width: `${bounds.renderedW}px`,
                  height: `${bounds.renderedH}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  maxWidth: "none",
                  maxHeight: "none",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                className="transition-transform duration-75 will-change-transform"
              />
            </div>
          )}

          {/* WhatsApp-Style Darkened Backdrop with Circular Aperture */}
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle 130px at center, transparent 130px, rgba(15, 23, 42, 0.75) 131px)",
            }}
          >
            {/* Circular Border Guide */}
            <div
              style={{ width: `${CROP_DIAMETER}px`, height: `${CROP_DIAMETER}px` }}
              className="rounded-full border-2 border-primary shadow-2xl relative"
            >
              {/* Subtle crosshairs / orientation mark */}
              <div className="absolute inset-0 rounded-full border border-white/20" />
            </div>
          </div>
        </div>

        {/* Zoom Controls & Slider */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-4 h-4 text-primary" />
              Zoom
            </span>
            <span className="font-mono text-[11px] text-slate-500">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              disabled={zoom <= 1}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Zoom slider"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              disabled={zoom >= 3}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Circular Preview & File Size Details */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-primary overflow-hidden flex-shrink-0 bg-slate-200 shadow-sm">
              <canvas ref={previewCanvasRef} className="w-full h-full" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                Live Preview
              </span>
              <p className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                {file?.name || "photo.jpg"}
              </p>
              <span className="text-[11px] font-mono font-medium text-slate-500">
                {file?.size ? formatBytes(file.size) : "—"} (Max: 5 MB)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
            title="Reset position and zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Action Buttons: Cancel & Confirm Photo */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 active:scale-95 text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing || !imageObj}
            className="w-full h-11 px-4 rounded-xl bg-primary text-white hover:bg-primary-hover active:scale-95 text-xs font-bold tracking-wide shadow-md shadow-primary/20 transition-all duration-200 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            {isProcessing ? "Processing..." : "Confirm Photo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ProfilePhotoCropModal;
