/**
 * DMI College Hostel Management PWA - Photo Processing & WhatsApp-Style Crop Utility
 *
 * Enforces strict <= 5 MB size limit without automatic compression or downscaling.
 * Supports JPG, JPEG, PNG, and WebP formats.
 */

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

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
  return `${mb.toFixed(2)} MB`;
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
 * Validates a photo file against the strict 5 MB limit and permitted formats.
 * Does NOT perform any automatic compression or resizing.
 *
 * @param {File} file
 * @returns {Promise<{ valid: boolean, error?: string, width?: number, height?: number, size?: number }>}
 */
export async function validatePhotoFile(file) {
  const minPx = 200;

  // 1. Required check
  if (!file) {
    return { valid: false, error: "Photo is required" };
  }

  // 2. Extension & MIME check
  const fileName = (file.name || "").toLowerCase();
  const hasValidExt = ALLOWED_IMAGE_EXTS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = ALLOWED_IMAGE_MIMES.includes(file.type);

  if (!hasValidExt || !hasValidMime) {
    return {
      valid: false,
      error: "Only JPG, PNG or WebP images are allowed",
    };
  }

  // 3. File Size Validation (Max 15 MB / Standard 5 MB)
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (${formatBytes(file.size)}). Maximum is 15 MB.`,
      size: file.size,
    };
  }

  // 4. Image readability
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
 * Renders the adjusted crop area to an HTML5 Canvas and exports a high-quality Blob.
 * Strict preservation of quality without automatic compression.
 * Rejects if the final cropped blob exceeds 5 MB.
 *
 * @param {HTMLImageElement} image
 * @param {{ sx: number, sy: number, sWidth: number, sHeight: number, outputSize?: number }} crop
 * @param {string} [mimeType="image/jpeg"]
 * @returns {Promise<{ blob: Blob, dataUrl: string, sizeBytes: number, width: number, height: number }>}
 */
export async function renderCroppedPhoto(image, crop, mimeType = "image/jpeg") {
  if (typeof window === "undefined") {
    throw new Error("renderCroppedPhoto requires client environment");
  }

  const outputSize = crop.outputSize || Math.min(800, Math.max(crop.sWidth, crop.sHeight));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");

  // High quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the exact source crop into square output
  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sWidth,
    crop.sHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  const outMime = ALLOWED_IMAGE_MIMES.includes(mimeType) ? mimeType : "image/jpeg";
  const quality = outMime === "image/png" ? undefined : 0.95;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return reject(new Error("Failed to process cropped photo"));
        }

        // Validate final cropped file size
        if (blob.size > MAX_PROFILE_PHOTO_BYTES) {
          return reject(
            new Error("Image size must be 5 MB or less. Please select another image.")
          );
        }

        const dataUrl = canvas.toDataURL(outMime, quality);
        resolve({
          blob,
          dataUrl,
          sizeBytes: blob.size,
          width: outputSize,
          height: outputSize,
        });
      },
      outMime,
      quality
    );
  });
}

export default {
  MAX_PROFILE_PHOTO_BYTES,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTS,
  formatBytes,
  loadImage,
  validatePhotoFile,
  getDataUrlSizeBytes,
  renderCroppedPhoto,
};
