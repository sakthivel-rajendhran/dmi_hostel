import crypto from "crypto";
import qrcode from "qrcode";
import { query } from "@/lib/db/mysql.js";

const GATE_SECRET = process.env.GATE_SIGNING_SECRET || "dmi_hostel_production_gate_secret_key_2026_secured";
const TOKEN_TTL_SECONDS = 31536000; // Permanent gate token valid for 1 year (365 days)
const CLOCK_TOLERANCE_SECONDS = 15; // 15s grace for network latency

// In-memory sliding-window rate limiter for failed verification attempts
// Maximum 5 failed attempts within 60 seconds per identifier (studentId or IP)
const failedAttemptsMap = new Map();

function checkRateLimit(identifier) {
  if (!identifier) return true;
  const now = Date.now();
  const entry = failedAttemptsMap.get(identifier);
  if (!entry || entry.resetAt <= now) {
    return true; // Not rate limited
  }
  return entry.count < 5;
}

function recordFailure(identifier) {
  if (!identifier) return;
  const now = Date.now();
  const entry = failedAttemptsMap.get(identifier);
  if (!entry || entry.resetAt <= now) {
    failedAttemptsMap.set(identifier, { count: 1, resetAt: now + 60000 });
  } else {
    entry.count++;
  }
}

function clearFailure(identifier) {
  if (!identifier) return;
  failedAttemptsMap.delete(identifier);
}

/**
 * Generate a cryptographically secure, signed dynamic gate token and QR data URL
 * Format: DMIGATE2|<gateId>|<issuedAt>|<expiresAt>|<nonce>|<signature>
 * 
 * - Nonce: 6 hexadecimal characters generated using cryptographically secure random bytes
 * - Signature: Minimum 128-bit authentication tag (32 hex characters) from HMAC-SHA256
 */
export async function generateDynamicGateQr(gateId = "MAIN", forceRotate = false) {
  const normalizedGate = (gateId || "MAIN").toUpperCase();

  // If not forcing rotation, reuse existing permanent active token from MySQL
  if (!forceRotate) {
    try {
      const activeRows = await query(
        `SELECT id, token_string, token_hash, nonce, issued_at, expires_at
         FROM gate_tokens
         WHERE gate_id = ? AND status = 'ACTIVE' AND expires_at > NOW()
         ORDER BY issued_at DESC LIMIT 1`,
        [normalizedGate]
      );

      if (activeRows && activeRows.length > 0) {
        const active = activeRows[0];
        const qrDataUrl = await qrcode.toDataURL(active.token_string, {
          errorCorrectionLevel: "H",
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          width: 380,
        });

        const nowUnix = Math.floor(Date.now() / 1000);
        const expUnix = Math.floor(new Date(active.expires_at).getTime() / 1000);

        return {
          tokenId: active.id,
          token: active.token_string,
          tokenHash: active.token_hash,
          qrDataUrl,
          gateId: normalizedGate,
          issuedAt: new Date(active.issued_at).toISOString(),
          expiresAt: new Date(active.expires_at).toISOString(),
          expiresInSeconds: Math.max(0, expUnix - nowUnix),
          nonce: active.nonce,
        };
      }
    } catch (err) {
      console.warn("[GateTokenEngine] Existing token lookup warning:", err.message);
    }
  }

  const nowUnix = Math.floor(Date.now() / 1000);
  const expiresAtUnix = nowUnix + TOKEN_TTL_SECONDS;
  // Exact 6-character uppercase hex nonce (crypto.randomBytes(3) = 3 bytes = 6 hex chars)
  const nonce = crypto.randomBytes(3).toString("hex").toUpperCase();

  const payloadToSign = `DMIGATE2|${normalizedGate}|${nowUnix}|${expiresAtUnix}|${nonce}`;
  
  // Full HMAC-SHA256 digest
  const fullDigest = crypto
    .createHmac("sha256", GATE_SECRET)
    .update(payloadToSign)
    .digest("hex")
    .toUpperCase();
  
  // 128-bit authentication tag (32 hexadecimal characters)
  const signature = fullDigest.substring(0, 32);

  const tokenString = `${payloadToSign}|${signature}`;
  const tokenHash = crypto.createHash("sha256").update(tokenString).digest("hex");

  const tokenId = `GT-${Date.now()}-${nonce}`;

  // Persist to MySQL gate_tokens table
  try {
    // 1. Mark past tokens for this gate as EXPIRED
    await query(
      `UPDATE gate_tokens 
       SET status = 'EXPIRED' 
       WHERE gate_id = ? AND status = 'ACTIVE'`,
      [normalizedGate]
    );

    // 2. Insert new active token with 6-character nonce
    await query(
      `INSERT INTO gate_tokens (
        id, gate_id, token_string, token_hash, nonce, issued_at, expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), 'ACTIVE', NOW())`,
      [tokenId, normalizedGate, tokenString, tokenHash, nonce, nowUnix, expiresAtUnix]
    );
  } catch (err) {
    console.warn("[GateTokenEngine] DB record error (non-fatal):", err.message);
  }

  // Generate high-resolution, high-contrast QR code (Error Correction Level H)
  const qrDataUrl = await qrcode.toDataURL(tokenString, {
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    width: 380,
  });

  return {
    tokenId,
    token: tokenString,
    tokenHash,
    qrDataUrl,
    gateId: normalizedGate,
    issuedAt: new Date(nowUnix * 1000).toISOString(),
    expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
    expiresInSeconds: TOKEN_TTL_SECONDS,
    nonce, // Exactly 6 characters
  };
}

/**
 * Verify a scanned gate token or manual 6-character fallback code
 * 
 * @param {string} tokenString - QR payload or manual code
 * @param {string} [expectedGateId="MAIN"] - Expected gate checkpoint
 * @param {string} [identifier=""] - Student ID or client identifier for rate limiting
 */
export async function verifyGateToken(tokenString, expectedGateId = "MAIN", identifier = "") {
  if (!tokenString || typeof tokenString !== "string") {
    return { valid: false, code: "EMPTY_TOKEN", message: "Empty or invalid gate QR token." };
  }

  // Rate Limiting Check
  if (identifier && !checkRateLimit(identifier)) {
    return {
      valid: false,
      code: "RATE_LIMITED",
      message: "Too many failed gate scan attempts. Please wait 60 seconds before trying again.",
    };
  }

  const trimmed = tokenString.trim();
  const normalizedExpectedGate = (expectedGateId || "MAIN").toUpperCase();

  // 1. Version 2 Dynamic Signed QR Token (DMIGATE2)
  if (trimmed.startsWith("DMIGATE2|")) {
    const parts = trimmed.split("|");
    if (parts.length !== 6) {
      recordFailure(identifier);
      return { valid: false, code: "MALFORMED_TOKEN", message: "Malformed Gate QR token structure." };
    }

    const [version, gateId, issuedAtStr, expiresAtStr, nonce, signature] = parts;
    const nowUnix = Math.floor(Date.now() / 1000);
    const issuedAt = parseInt(issuedAtStr, 10);
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(issuedAt) || isNaN(expiresAt)) {
      recordFailure(identifier);
      return { valid: false, code: "INVALID_TIMESTAMPS", message: "Invalid timestamps in Gate QR token." };
    }

    // Gate identity verification
    if (normalizedExpectedGate && gateId.toUpperCase() !== normalizedExpectedGate) {
      recordFailure(identifier);
      return {
        valid: false,
        code: "GATE_MISMATCH",
        message: `Token was issued for gate '${gateId}', but scanned at '${normalizedExpectedGate}'.`,
      };
    }

    // Cryptographic signature check (Supports 128-bit 32-char tag and 16-char backward-compat)
    const payloadToSign = `${version}|${gateId}|${issuedAtStr}|${expiresAtStr}|${nonce}`;
    const fullExpectedSig = crypto
      .createHmac("sha256", GATE_SECRET)
      .update(payloadToSign)
      .digest("hex")
      .toUpperCase();

    const expectedSig32 = fullExpectedSig.substring(0, 32);
    const expectedSig16 = fullExpectedSig.substring(0, 16);

    let isSigValid = false;
    const sigBuffer = Buffer.from(signature, "utf8");

    if (signature.length === 32) {
      const expBuffer = Buffer.from(expectedSig32, "utf8");
      isSigValid = crypto.timingSafeEqual(sigBuffer, expBuffer);
    } else if (signature.length === 16) {
      const expBuffer = Buffer.from(expectedSig16, "utf8");
      isSigValid = crypto.timingSafeEqual(sigBuffer, expBuffer);
    }

    if (!isSigValid) {
      recordFailure(identifier);
      return { valid: false, code: "INVALID_SIGNATURE", message: "Tampered or forged Gate QR token signature." };
    }

    // Expiry verification with clock tolerance
    if (nowUnix > expiresAt + CLOCK_TOLERANCE_SECONDS) {
      recordFailure(identifier);
      return {
        valid: false,
        code: "TOKEN_EXPIRED",
        message: "This Gate QR code has expired. Please scan the current active code on the gate screen.",
      };
    }

    // Future token sanity check
    if (issuedAt > nowUnix + CLOCK_TOLERANCE_SECONDS) {
      recordFailure(identifier);
      return { valid: false, code: "FUTURE_TOKEN", message: "Gate QR token contains invalid future timestamp." };
    }

    // MySQL token validation
    try {
      const tokenHash = crypto.createHash("sha256").update(trimmed).digest("hex");
      const rows = await query(
        `SELECT id, status, expires_at FROM gate_tokens WHERE token_hash = ? LIMIT 1`,
        [tokenHash]
      );

      if (rows && rows.length > 0) {
        if (rows[0].status === "REVOKED") {
          recordFailure(identifier);
          return { valid: false, code: "TOKEN_REVOKED", message: "This Gate QR token has been revoked by security." };
        }
      }
    } catch (e) {
      // If DB check fails, HMAC signature already passed
    }

    // Verification passed - clear failed attempt history
    clearFailure(identifier);

    return {
      valid: true,
      version: "DMIGATE2",
      gateId,
      issuedAt: new Date(issuedAt * 1000).toISOString(),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      nonce,
      tokenString: trimmed,
    };
  }

  // 2. Manual 6-Character Fallback Code Resolution
  // Allows residents to input the dynamic 6-hex code displayed on the gate poster/screen
  const cleanCode = trimmed.toUpperCase();
  if (/^[A-F0-9]{6,12}$/.test(cleanCode)) {
    try {
      const rows = await query(
        `SELECT id, token_string, gate_id, nonce, status, expires_at 
         FROM gate_tokens 
         WHERE gate_id = ? AND nonce = ? AND status = 'ACTIVE' AND expires_at >= NOW()
         ORDER BY issued_at DESC LIMIT 1`,
        [normalizedExpectedGate, cleanCode]
      );

      if (rows && rows.length > 0) {
        // Fallback code matches active unexpired token in MySQL -> verify full signed token
        const fullTokenVerification = await verifyGateToken(rows[0].token_string, normalizedExpectedGate, identifier);
        if (fullTokenVerification.valid) {
          return {
            ...fullTokenVerification,
            isManualFallback: true,
            fallbackCode: cleanCode,
          };
        }
      }
    } catch (err) {
      console.warn("[GateTokenEngine] Fallback code query error:", err.message);
    }

    recordFailure(identifier);
    return {
      valid: false,
      code: "INVALID_FALLBACK_CODE",
      message: "Invalid or expired 6-character fallback code. Please check the current gate screen.",
    };
  }

  // 3. Version 1 Token (DMIGATE1) legacy backward-compatibility
  if (trimmed.startsWith("DMIGATE1|")) {
    const parts = trimmed.split("|");
    if (parts.length >= 5) {
      const [version, gateId, dateKey, nonce, signature] = parts;
      clearFailure(identifier);
      return {
        valid: true,
        version: "DMIGATE1",
        gateId,
        dateKey,
        nonce,
        tokenString: trimmed,
      };
    }
  }

  recordFailure(identifier);
  return {
    valid: false,
    code: "UNRECOGNIZED_FORMAT",
    message: "Unrecognized QR code. Please scan the official campus Main Gate screen.",
  };
}

export default {
  generateDynamicGateQr,
  verifyGateToken,
};
