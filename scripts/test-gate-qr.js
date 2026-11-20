/**
 * Unit Test Suite for Gate QR Architecture
 * Validates cryptographic tokens, format parsing, tamper resistance,
 * geofence calculation, and state transition logic.
 */

const assert = require("assert");

// Import modules
const {
  getDateKey,
  getDailyNonce,
  buildGateQrPayload,
  parseGateQr,
  isGateQrValid,
  getDistanceMeters,
} = require("../src/lib/utils/gateQr.js");

const { gateService } = require("../src/lib/services/gateService.js");
const { PASS_STATUSES } = require("../src/config/status.js");
const { WORKFLOW_CONFIG } = require("../src/config/workflow.js");
const { MOCK_PASSES, setPersistentMock, STORAGE_KEYS } = require("../src/lib/mock/index.js");

console.log("=== RUNNING GATE QR UNIT TESTS ===\n");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function runTests() {
  // 1. Date Key & Nonce
  it("getDateKey returns YYYYMMDD string format", () => {
    const key = getDateKey(new Date(2026, 10, 19)); // Month is 0-indexed: 10 = Nov
    assert.strictEqual(key, "20261119");
  });

  it("getDailyNonce returns 6-character deterministic string", () => {
    const nonce = getDailyNonce("20261119", "MAIN");
    assert.strictEqual(typeof nonce, "string");
    assert.strictEqual(nonce.length, 6);
  });

  // 2. Token Payload Generation
  it("buildGateQrPayload builds valid DMIGATE1 format with signature", () => {
    const payload = buildGateQrPayload({ id: "MAIN" }, "20261119", "k3x9ab");
    assert.ok(payload.startsWith("DMIGATE1|MAIN|20261119|k3x9ab|"));
    const parts = payload.split("|");
    assert.strictEqual(parts.length, 5);
    assert.strictEqual(parts[4].length, 6);
  });

  // 3. Parsing & Tamper Detection
  it("parseGateQr parses valid token correctly", () => {
    const payload = buildGateQrPayload({ id: "MAIN" }, "20261119", "k3x9ab");
    const parsed = parseGateQr(payload);
    assert.strictEqual(parsed.isValid, true);
    assert.strictEqual(parsed.gateId, "MAIN");
    assert.strictEqual(parsed.dateKey, "20261119");
    assert.strictEqual(parsed.nonce, "k3x9ab");
  });

  it("parseGateQr rejects tampered payload (signature mismatch)", () => {
    const payload = "DMIGATE1|MAIN|20261119|k3x9ab|FAKESIG";
    const parsed = parseGateQr(payload);
    assert.strictEqual(parsed.isValid, false);
    assert.ok(parsed.error.includes("Tampered"));
  });

  it("parseGateQr rejects invalid header protocol", () => {
    const parsed = parseGateQr("NOTDMIGATE|MAIN|20261119|k3x9ab|123456");
    assert.strictEqual(parsed.isValid, false);
    assert.ok(parsed.error.includes("DMIGATE1 protocol header"));
  });

  // 4. Token Validity & Expiration
  it("isGateQrValid validates active token for today", () => {
    const today = new Date();
    const todayKey = getDateKey(today);
    const payload = buildGateQrPayload({ id: "MAIN" }, todayKey);
    const res = isGateQrValid(payload, today);
    assert.strictEqual(res.valid, true);
  });

  it("isGateQrValid rejects expired token outside grace period", () => {
    const pastDate = new Date(2025, 0, 1);
    const pastKey = getDateKey(pastDate);
    const payload = buildGateQrPayload({ id: "MAIN" }, pastKey);
    const res = isGateQrValid(payload, new Date(), { acceptPreviousDay: false });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.code, "GATE_QR_EXPIRED");
  });

  // 5. Haversine Distance
  it("getDistanceMeters accurately computes distance in meters", () => {
    // Distance between gate (12.8450, 79.9500) and point ~111m north (12.8460, 79.9500)
    const dist = getDistanceMeters(12.8450, 79.9500, 12.8460, 79.9500);
    assert.ok(dist >= 100 && dist <= 125, `Distance was ${dist}`);
  });

  // 6. State Machine: Process Scan Tests
  console.log("\n--- Testing gateService.processScan state transitions ---");

  // Reset mock passes with known test states
  const testStudentId = "CSE-3-999";
  const mainGate = WORKFLOW_CONFIG.gates[0];
  const validQr = buildGateQrPayload(mainGate, getDateKey());
  const validLocation = { lat: mainGate.lat, lng: mainGate.lng, accuracy: 10 };

  await itAsync("processScan: records EXIT when pass status is gate_pass_issued", async () => {
    // Seed pass in gate_pass_issued
    const testPasses = [
      {
        id: "TEST-PASS-001",
        studentId: testStudentId,
        studentName: "Test Student",
        status: PASS_STATUSES.GATE_PASS_ISSUED,
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validTo: new Date(Date.now() + 7200000).toISOString(),
        timeline: [],
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    const res = await gateService.processScan({
      studentId: testStudentId,
      qrText: validQr,
      location: validLocation,
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.action, "EXIT");
    assert.strictEqual(res.data.pass.status, PASS_STATUSES.OUT);
    assert.ok(res.data.pass.actualExitTime);
    assert.strictEqual(res.data.pass.timeline.length, 1);
    assert.strictEqual(res.data.pass.timeline[0].status, PASS_STATUSES.OUT);
  });

  await itAsync("processScan: records ENTRY when pass status is out (on-time)", async () => {
    const testPasses = [
      {
        id: "TEST-PASS-002",
        studentId: testStudentId,
        studentName: "Test Student",
        status: PASS_STATUSES.OUT,
        validTo: new Date(Date.now() + 3600000).toISOString(), // 1 hour in future
        timeline: [],
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    const res = await gateService.processScan({
      studentId: testStudentId,
      qrText: validQr,
      location: validLocation,
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.action, "ENTRY");
    assert.strictEqual(res.data.pass.status, PASS_STATUSES.RETURNED);
    assert.strictEqual(res.data.isLate, false);
    assert.ok(res.data.pass.actualEntryTime);
  });

  await itAsync("processScan: records ENTRY with late penalty when overdue", async () => {
    const testPasses = [
      {
        id: "TEST-PASS-003",
        studentId: testStudentId,
        studentName: "Test Student",
        status: PASS_STATUSES.OVERDUE,
        validTo: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        timeline: [],
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    const res = await gateService.processScan({
      studentId: testStudentId,
      qrText: validQr,
      location: validLocation,
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.action, "ENTRY");
    assert.strictEqual(res.data.pass.status, PASS_STATUSES.RETURNED);
    assert.strictEqual(res.data.isLate, true);
    assert.ok(res.data.lateByMinutes >= 28, `Late minutes was ${res.data.lateByMinutes}`);
  });

  await itAsync("processScan: rejects scan outside geofence boundary", async () => {
    const testPasses = [
      {
        id: "TEST-PASS-004",
        studentId: testStudentId,
        status: PASS_STATUSES.GATE_PASS_ISSUED,
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    // 10km away
    const farLocation = { lat: 12.95, lng: 80.05, accuracy: 20 };

    const res = await gateService.processScan({
      studentId: testStudentId,
      qrText: validQr,
      location: farLocation,
    });

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "OUTSIDE_GEOFENCE");
  });

  await itAsync("processScan: rejects scan if no active pass found", async () => {
    const testPasses = [
      {
        id: "TEST-PASS-005",
        studentId: testStudentId,
        status: PASS_STATUSES.RETURNED, // already closed
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    const res = await gateService.processScan({
      studentId: testStudentId,
      qrText: validQr,
      location: validLocation,
    });

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "NO_ACTIVE_PASS");
  });

  await itAsync("processScan: verifies manual 6-character fallback code", async () => {
    const testPasses = [
      {
        id: "TEST-PASS-006",
        studentId: testStudentId,
        studentName: "Test Student",
        status: PASS_STATUSES.GATE_PASS_ISSUED,
        timeline: [],
      },
    ];
    setPersistentMock(STORAGE_KEYS.PASSES, testPasses);

    const todayNonce = getDailyNonce(getDateKey(), mainGate.id);

    const res = await gateService.processScan({
      studentId: testStudentId,
      manualCode: todayNonce,
      location: validLocation,
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.action, "EXIT");
  });

  // Summary
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
