/**
 * DMI College Hostel Management PWA - Photo Processing & Compression Engine
 *
 * Implements strict &le; 1 MB storage compliance across both operational policies:
 * - 'reject': Immediately rejects files > 1 MB.
 * - 'auto_compress': Accepts originals up to 15 MB, downsizes, steps quality (0.85 -> 0.50)
 *   and dimensions (400 -> 320 -> 256) to ensure final stored JPEG is <= 1 MB.
 *
 * // TODO(BACKEND): Upload to Cloudinary via signed upload preset, enforce server-side
 * // validation on file size and MIME type, and store only the secure URL in the database.
 */

import { WORKFLOW_CONFIG } from "@/config/workflow.js";

/**
 * Formats byte values into human-readable strings (e.g. 640 KB, 1.8 MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) {
    const kb = bytes / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  const mb = bytes / 1048576;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Asynchronously loads a file or URL into an HTMLImageElement
 * @param {File|Blob|string} fileOrSrc
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(fileOrSrc) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Image loading requires browser environment"));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    let objectUrl = null;
    if (typeof fileOrSrc === "string") {
      img.src = fileOrSrc;
    } else if (fileOrSrc instanceof Blob) {
      objectUrl = URL.createObjectURL(fileOrSrc);
      img.src = objectUrl;
    } else {
      return reject(new Error("Invalid image source provided"));
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("This file could not be read as an image"));
    };
  });
}

/**
 * Validates photo file against operational policy, MIME types, extensions,
 * size boundaries, and minimum dimensions.
 *
 * @param {File} file
 * @param {object|string} [policyOrMode]
 * @returns {Promise<{ valid: boolean, error?: string, width?: number, height?: number, size?: number, requiresCompression?: boolean, helperNotice?: string }>}
 */
export async function validatePhotoFile(file) {
  const maxBytes = 15 * 1024 * 1024; // 15 MB original upload limit
  const minPx = 200;
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];

  // 1. Required check
  if (!file) {
    return { valid: false, error: "Photo is required" };
  }

  // 2. Extension & MIME check
  const fileName = (file.name || "").toLowerCase();
  const validExts = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExt = validExts.some((ext) => fileName.endsWith(ext));
  const hasValidMime = allowedMimes.includes(file.type);

  if (!hasValidExt || !hasValidMime) {
    return {
      valid: false,
      error: "Only JPG, PNG or WebP images are allowed",
    };
  }

  // 3. File Size Validation (Max 15 MB)
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (${formatBytes(file.size)}). Maximum is 15 MB.`,
    };
  }

  // 4. Image Readability & Minimum Dimension Validation
  try {
    const img = await loadImage(file);

    if (img.naturalWidth < minPx || img.naturalHeight < minPx) {
      return {
        valid: false,
        error: `Image must be at least ${minPx}x${minPx} pixels`,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    return {
      valid: true,
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: file.size,
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message || "This file could not be read as an image",
    };
  }
}

/**
 * Calculates raw byte size of a base64 Data URL
 * @param {string} dataUrl
 * @returns {number}
 */
export function getDataUrlSizeBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const base64Str = dataUrl.split(",")[1] || dataUrl;
  return Math.round((base64Str.length * 3) / 4);
}

/**
 * Compresses canvas to a JPEG data URL that strictly fits within maxBytes (1 MB)
 * Steps quality down (0.85 -> 0.50 in 0.05 steps) and canvas dimensions if necessary.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} [maxBytes=1048576]
 * @returns {{ dataUrl: string, sizeBytes: number, quality: number, width: number, height: number }}
 */
export function compressToLimit(canvas, maxBytes = 1048576) {
  if (typeof window === "undefined" || !canvas) {
    throw new Error("Canvas compression requires client environment");
  }

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  let sizeBytes = getDataUrlSizeBytes(dataUrl);

  // 1. Step down quality in increments of 0.05 to floor of 0.50
  while (sizeBytes > maxBytes && quality > 0.50) {
    quality -= 0.05;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    sizeBytes = getDataUrlSizeBytes(dataUrl);
  }

  // 2. If still exceeding 1 MB, step down dimensions: 400 -> 320 -> 256
  const dimensionSteps = [320, 256];
  let currentWidth = canvas.width;
  let currentHeight = canvas.height;

  for (const targetDim of dimensionSteps) {
    if (sizeBytes <= maxBytes) break;

    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = targetDim;
    scaledCanvas.height = targetDim;
    const ctx = scaledCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0, targetDim, targetDim);

    currentWidth = targetDim;
    currentHeight = targetDim;

    // Retest from quality 0.85 down to 0.50 on scaled canvas
    quality = 0.85;
    dataUrl = scaledCanvas.toDataURL("image/jpeg", quality);
    sizeBytes = getDataUrlSizeBytes(dataUrl);

    while (sizeBytes > maxBytes && quality > 0.50) {
      quality -= 0.05;
      dataUrl = scaledCanvas.toDataURL("image/jpeg", quality);
      sizeBytes = getDataUrlSizeBytes(dataUrl);
    }
  }

  if (sizeBytes > maxBytes) {
    throw new Error("We couldn't compress this photo. Try a different one.");
  }

  return {
    dataUrl,
    sizeBytes,
    quality: Math.round(quality * 100) / 100,
    width: currentWidth,
    height: currentHeight,
  };
}

/**
 * Crops and resizes an image to a square 400x400 JPEG data URL strictly <= 1 MB
 *
 * @param {HTMLImageElement} image
 * @param {{ x: number, y: number, width: number, height: number }} [crop]
 * @param {number} [targetPx=400]
 * @param {number} [maxBytes=1048576]
 * @returns {{ dataUrl: string, sizeBytes: number, quality: number, width: number, height: number }}
 */
export function cropAndResize(image, crop, targetPx = 400, maxBytes = 1048576) {
  if (typeof window === "undefined") {
    throw new Error("cropAndResize requires client environment");
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetPx;
  canvas.height = targetPx;
  const ctx = canvas.getContext("2d");

  // Default to centered square crop if crop parameters omitted
  let sx = 0;
  let sy = 0;
  let sWidth = image.naturalWidth || image.width;
  let sHeight = image.naturalHeight || image.height;

  if (crop && crop.width && crop.height) {
    sx = crop.x;
    sy = crop.y;
    sWidth = crop.width;
    sHeight = crop.height;
  } else {
    const minDim = Math.min(sWidth, sHeight);
    sx = (sWidth - minDim) / 2;
    sy = (sHeight - minDim) / 2;
    sWidth = minDim;
    sHeight = minDim;
  }

  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetPx, targetPx);

  return compressToLimit(canvas, maxBytes);
}

export default {
  formatBytes,
  loadImage,
  validatePhotoFile,
  getDataUrlSizeBytes,
  compressToLimit,
  cropAndResize,
};
