# DMI College Hostel Management PWA — Gate QR Poster Security Specification

## 1. The Fixed-Poster Paradigm

The system avoids dynamic student-generated pass QR codes to prevent display fraud, screenshot sharing, and offline token manipulation. Instead, **the Main Gate kiosk displays a daily cryptographic QR poster**, and the resident student scans the poster using their smartphone camera.

```
┌─────────────────────────────────┐
│     Main Gate Kiosk Poster      │
│  ┌───────────────────────────┐  │
│  │   DMIGATE1|MAIN|20261119  │  │
│  │      |k3x9ab|5E8A9C       │  │
│  └───────────────────────────┘  │
│     Main Gate Checkpoint #1     │
└────────────────▲────────────────┘
                 │ (Camera Scan)
┌────────────────┴────────────────┐
│      Student Resident Phone     │
│   • Verifies GPS Geofence (150m)│
│   • Validates active Gate Pass  │
│   • Transmits Scan to Server    │
└─────────────────────────────────┘
```

---

## 2. Gate QR Protocol Format

```
DMIGATE1|<gateId>|<dateKey>|<nonce>|<signature>
```

| Segment | Format / Example | Description |
| :--- | :--- | :--- |
| **Protocol Header** | `DMIGATE1` | Identifies valid DMI Gate QR specification version 1. |
| **Gate Identifier** | `MAIN` | Single gate checkpoint ID. |
| **Date Key** | `YYYYMMDD` (e.g. `20261119`) | Current date key for automated daily rotation. |
| **Daily Nonce** | 6-char hex (`k3x9ab`) | Deterministic daily fallback code displayed below the QR. |
| **Signature** | 6-char hex (`5E8A9C`) | Cryptographic signature of `<version>\|<gateId>\|<dateKey>\|<nonce>`. |

---

## 3. Server-Side Verification Rules

When a scan is submitted to the backend via `processGateScan`:

1. **Gate Token Authenticity**:
   - The server verifies `<signature>` using `GATE_QR_SECRET_KEY` (HMAC-SHA256).
   - If `WORKFLOW_CONFIG.gateQr.acceptPreviousDay` is true, the server permits yesterday's dateKey until a 30-minute grace window past midnight.
2. **Geofencing Verification**:
   - If GPS coordinates are submitted, server validates distance between user location and Main Gate (`lat: 12.845, lng: 79.95`) is ≤ `radiusMeters` (150m).
3. **Anti-Double-Scan Deduplication**:
   - The server checks if the same student recorded a gate scan within the last 30 seconds (`WORKFLOW_CONFIG.duplicateScanWindowSeconds`). If so, returns `DUPLICATE_SCAN`.
4. **State Transition**:
   - If active pass is `gate_pass_issued`: Records `EXIT`, transitions status to `out`, records `actualExitTime = now()`.
   - If active pass is `out` or `overdue`: Records `ENTRY`, transitions status to `returned`, records `actualReturnTime = now()`. Calculates `is_late` and `lateMinutes` if `now() > expectedReturnTime`.
