/**
 * Audit checks script for Phase 6 Step 0:
 * 1. UI files importing from /lib/mock (must be zero)
 * 2. Leftover references to "block", "hostelBlock", "gate" role, "/gate-login", "loginGate", kiosk PIN, scanner device, "verifyQr", pass-QR card
 * 3. Security guard screen/login
 * 4. Multi-gate in config
 * 5. Hardcoded config values
 * 6. Duplicate components across portals
 */

import fs from "fs";
import path from "path";

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(jsx?|tsx?)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const allSrcFiles = walk("src");

console.log("==================================================");
console.log("           PHASE 6 AUDIT INSPECTION               ");
console.log("==================================================");

// 1. UI importing mock data directly
console.log("\n[1] UI IMPORTS FROM /lib/mock (must be zero):");
const uiMockImports = [];
for (const file of allSrcFiles) {
  const norm = file.replace(/\\/g, "/");
  if (norm.includes("src/lib/services") || norm.includes("src/lib/mock")) continue;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("from") && (line.includes("/mock") || line.includes("@/lib/mock"))) {
      uiMockImports.push({ file: norm, line: i + 1, text: line.trim() });
    }
  });
}
console.log(`Found: ${uiMockImports.length}`);
uiMockImports.forEach((m) => console.log(`  ${m.file}:${m.line} -> ${m.text}`));

// 2. Leftovers of "block" / "hostelBlock"
console.log("\n[2] LEFTOVER REFERENCES TO 'block' or 'hostelBlock':");
const blockMatches = [];
for (const file of allSrcFiles) {
  const norm = file.replace(/\\/g, "/");
  if (norm.includes("node_modules")) continue;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    // ignore CSS display: block or inline-block or code blocks or text-block
    if (
      line.includes("hostelBlock") ||
      line.includes("hostel_block") ||
      /\bBlock\s+[A-C]\b/i.test(line) ||
      /\bBlocks\s+[A-C]\b/i.test(line) ||
      /\bBlock\s+Select/i.test(line) ||
      /\bhostel\s+block\b/i.test(line)
    ) {
      blockMatches.push({ file: norm, line: i + 1, text: line.trim() });
    }
  });
}
console.log(`Found: ${blockMatches.length}`);
blockMatches.forEach((m) => console.log(`  ${m.file}:${m.line} -> ${m.text}`));

// 3. Leftovers of 'gate' role, '/gate-login', 'loginGate', kiosk PIN, scanner device, 'verifyQr', pass-QR card
console.log("\n[3] RETIRED CONCEPTS (gate role, /gate-login, kiosk PIN, pass QR card, verifyQr):");
const retiredMatches = [];
for (const file of allSrcFiles) {
  const norm = file.replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (
      line.includes("gate-login") ||
      line.includes("loginGate") ||
      line.includes("verifyQr") ||
      line.includes("buildQrPayload") ||
      /\bROLES\.GATE\b/.test(line) ||
      /\brole\s*===?\s*['"]gate['"]/.test(line) ||
      /\bkioskPin\b/i.test(line)
    ) {
      retiredMatches.push({ file: norm, line: i + 1, text: line.trim() });
    }
  });
}
console.log(`Found: ${retiredMatches.length}`);
retiredMatches.forEach((m) => console.log(`  ${m.file}:${m.line} -> ${m.text}`));

// 4. Multi-gate check in workflow config
console.log("\n[4] GATES CONFIGURATION IN WORKFLOW.JS:");
import { WORKFLOW_CONFIG } from "../src/config/workflow.js";
console.log("Configured gates count:", WORKFLOW_CONFIG.gates?.length);
console.log("Gates:", JSON.stringify(WORKFLOW_CONFIG.gates));

// 6. Check for dead legacy files
console.log("\n[6] LEGACY UNUSED SCRAP FILES AUDIT:");
const candidates = [
  "admin-nav",
  "student-nav",
  "registration-modal",
  "forgot-password-modal",
  "apply-pass-modal",
  "mock-data",
  "validators.ts",
];

for (const cand of candidates) {
  const referrers = [];
  for (const f of allSrcFiles) {
    if (f.includes(cand)) continue;
    const content = fs.readFileSync(f, "utf8");
    if (content.includes(cand)) {
      referrers.push(f.replace(/\\/g, "/"));
    }
  }
  console.log(`${cand}: imported by ${referrers.length} files:`);
  referrers.forEach((r) => console.log(`  - ${r}`));
}
