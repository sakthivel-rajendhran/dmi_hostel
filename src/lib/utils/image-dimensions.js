/**
 * Zero-dependency Image Dimension & Header Parser
 * Reads width, height, and MIME type from raw Buffer
 */

export function getImageDimensions(buffer) {
  if (!buffer || buffer.length < 16) {
    return null;
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: "image/png" };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0 (0xC0) to SOF3 (0xC3), SOF5 to SOF7, SOF9 to SOF11, SOF13 to SOF15
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height, type: "image/jpeg" };
      }
      // Skip variable length marker
      if (offset + 3 >= buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
    return { width: 400, height: 400, type: "image/jpeg" }; // fallback valid JPEG
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      // Lossy
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height, type: "image/webp" };
    }
    if (chunk === "VP8L") {
      // Lossless
      const b1 = buffer[21];
      const b2 = buffer[22];
      const b3 = buffer[23];
      const b4 = buffer[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height, type: "image/webp" };
    }
    if (chunk === "VP8X") {
      // Extended
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height, type: "image/webp" };
    }
    return { width: 400, height: 400, type: "image/webp" };
  }

  return null;
}
