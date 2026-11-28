# DMI College of Engineering — Hostel Management System (HMS)

> *"Fully Human & Fully Alive"*  
> A Next.js 16 Progressive Web Application (PWA) with multi-tier role-based approval workflows, cryptographic gate scanning, and live campus presence monitoring.

---

## Table of Contents

1. [Architectural Overview & Tech Stack](#1-architectural-overview--tech-stack)
2. [Role-Based Access Control (RBAC) Matrix](#2-role-based-access-control-rbac-matrix)
3. [Multi-Tier Outpass Approval Workflow](#3-multi-tier-outpass-approval-workflow)
4. [Fixed-Poster Gate QR Security & Surveillance](#4-fixed-poster-gate-qr-security--surveillance)
5. [Database Schema Specification](#5-database-schema-specification)
6. [Design System & UI Guidelines](#6-design-system--ui-guidelines)
7. [Layout Shell Architecture](#7-layout-shell-architecture)
8. [UI Component Catalog](#8-ui-component-catalog)
9. [Pre-Configured Test Accounts](#9-pre-configured-test-accounts)
10. [Local Development & Production Build](#10-local-development--production-build)

---

## 1. Architectural Overview & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (PWA)                        │
│   • React 19 • Tailwind CSS 4 • Framer Motion • Lucide Icons • Sonner   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Service-Layer & State Management                     │
│    • TanStack Query v5 (Persisted Cache) • React Hook Form + Zod       │
│    • PassService • GateService • StudentService • StaffService         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Backend API & Database Persistence                     │
│   • Next.js Route Handlers (/api/*) • MySQL 8 Connection Pool          │
│   • HMAC-SHA256 Gate QR Verification • Row Level Security (RLS) Model   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Runtime & Package Manager**: Bun (`bun@1.4.4`)
- **Web Framework**: Next.js 16.4.6 (App Router with Turbopack)
- **UI & Styling**: React 19.3.0, Tailwind CSS 4.3.3, Lucide React, Sonner
- **Client Cache**: `@tanstack/react-query` v5 with synchronous local storage persister
- **Form Validation**: `react-hook-form` v7 with `@hookform/resolvers/zod`
- **QR Operations**: `html5-qrcode` (camera scanner) and `qrcode.react` (poster renderer)
- **Database Engine**: MySQL 8 via `mysql2` with parameterized queries and transaction support

---

## 2. Role-Based Access Control (RBAC) Matrix

The system enforces strict role-based access control across six discrete user roles:

| Capability / Route | Student | Staff (Advisor) | HOD | Chief Warden | Correspondent | Gate Kiosk |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Apply for Outpass** | ✅ Yes | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Scan Gate QR (Camera)** | ✅ Yes | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Own Passes & Profile**| ✅ Yes | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Advisory Recommendation** | ❌ | ✅ Dept Years | ✅ Entire Dept | ❌ | ❌ | ❌ |
| **Final Pass Approval** | ❌ | ❌ | ❌ | ✅ **Sole Approver** | ❌ | ❌ |
| **Issue Gate Pass** | ❌ | ❌ | ❌ | ✅ Yes | ❌ | ❌ |
| **Manage Gate QR Posters** | ❌ | ❌ | ❌ | ✅ Yes | ❌ | ❌ |
| **Room Allocation** | ❌ | ❌ | ❌ | ✅ Yes | ❌ | ❌ |
| **Read-Only Student Roster** | ❌ | ❌ | ❌ | ✅ Yes (Read-Only) | ❌ | ❌ |
| **Department Analytics** | ❌ | ❌ | ✅ Yes | ❌ | ✅ Campus | ❌ |
| **Executive Security Audit**| ❌ | ❌ | ❌ | ✅ Yes | ✅ Campus | ❌ |
| **Gate Surveillance Scanner**| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Kiosk |

---

## 3. Multi-Tier Outpass Approval Workflow

```mermaid
flowchart TD
    A["Student Submits Outpass"] --> B{"Pass Category"}
    
    B -->|"Local Pass"| C["Chief Warden Approval Queue"]
    
    B -->|"Home Pass"| D["Faculty Advisor Review (Staff)"]
    D -->|"Recommended"| E["Head of Department Endorsement (HOD)"]
    D -->|"Rejected"| F["Status: REJECTED (Staff Stage)"]
    
    E -->|"Forwarded to Warden"| C
    E -->|"Rejected"| G["Status: REJECTED (HOD Stage)"]
    
    C -->|"Approved"| H["Status: APPROVED"]
    C -->|"Rejected"| I["Status: REJECTED (Warden Stage)"]
    
    H --> J["Chief Warden Issues Digital Gate Pass"]
    J --> K["Status: GATE_PASS_ISSUED (QR Scanner Unlocked)"]
    
    K --> L["Student Scans Gate Poster at Campus Exit"]
    L --> M["Status: OUT (Departure Recorded)"]
    
    M --> N["Student Scans Gate Poster at Campus Entry"]
    N --> O["Status: RETURNED (Arrival Recorded)"]
```

### Business Rules
1. **Local Pass**: Directly routes to the Chief Warden queue for authorization.
2. **Home Pass**: Progresses sequentially through Faculty Advisor recommendation &rarr; HOD endorsement &rarr; Chief Warden final clearance.
3. **Emergency / Medical Fast-Track**: Highlighted with high-priority pulse alerts at the top of the clearance queues.
4. **Warden Outpass Cards**: Displays distinct visual snapshots for Staff Review and HOD Review directly inside each application card, displaying actual reviewer names, departments, timestamps, and remarks retrieved from MySQL.
5. **Surveillance Log Single-Row Aggregation**: One consolidated row per gatepass displaying Exit Time, Entry Time (or *"Not Yet Returned"*), and movement status.

---

## 4. Fixed-Poster Gate QR Security & Surveillance

To eliminate spoofing, screenshot sharing, and proxy check-ins, the gate uses a **Fixed-Poster Verification Protocol**:

```
DMIGATE1|<gateId>|<dateKey>|<nonce>|<signature>
```

- **Protocol Version (`DMIGATE1`)**: Gate protocol version identifier.
- **Checkpoint ID (`MAIN`)**: Campus security checkpoint ID.
- **Date Key (`YYYYMMDD`)**: Changes deterministically every 24 hours at midnight.
- **Daily Nonce (`k3x9ab`)**: Human-readable 6-character fallback code printed beneath the poster QR.
- **HMAC Signature**: SHA-256 cryptographic signature verified on server with secret key.

### Verification Guardrails
1. **Cryptographic Validation**: Validates signature freshness and daily nonce rotation.
2. **Geofencing**: Device GPS coordinates must fall within a 150m radius of the Main Gate (`lat: 12.845, lng: 79.95`).
3. **Anti-Double-Scan Window**: 30-second deduplication filter preventing duplicate scan transactions.
4. **Live Security Clock**: Both Entry and Exit screens display a live, ticking security clock to prevent screenshot replays.

---

## 5. Database Schema Specification

Persistent storage is backed by MySQL 8 with foreign key integrity and audit logs:

### Department Master Data
Supported engineering disciplines:
- `CSE` — Computer Science & Engineering
- `IT` — Information Technology
- `AI&DS` — Artificial Intelligence & Data Science
- `AI&ML` — Artificial Intelligence & Machine Learning
- `CIVIL` — Civil Engineering
- `MECH` — Mechanical Engineering
- `EEE` — Electrical and Electronics Engineering
- `ECE` — Electronics and Communication Engineering

### Hostel Floors
- `GF` — Ground Floor (`G01`–`G30`)
- `F2` — 2nd Floor (`201`–`230`)
- `F3` — 3rd Floor (`301`–`330`)
- `F4` — 4th Floor (`401`–`430`)

### Core Database Tables
- **`users`**: Authentication credentials, roles (`student`, `warden`, `staff`, `hod`, `correspondent`), account status.
- **`students`**: Academic profile, unique student ID (e.g. `CSE-4-001`), register number, room allocation, parent contacts, profile photo URL.
- **`staff_profiles`**: Department affiliation, designation, assigned academic years.
- **`outpasses`**: Pass number, student ID, type (`Local Pass`, `Home Pass`), reason, departure time, expected return time, Staff review snapshot (`staff_approval_status`, `staff_approved_by`, `staff_approved_at`, `staff_remarks`), HOD review snapshot (`hod_approval_status`, `hod_approved_by`, `hod_approved_at`, `hod_remarks`), Warden decision, exit timestamp, return timestamp.
- **`security_logs`**: Gate scanning transactions, scan type (`EXIT`, `ENTRY`), gate ID, verified GPS distance.
- **`letters`**: Correspondent special permission letters for extended home leaves.

---

## 6. Design System & UI Guidelines

### Design Principles
1. **Role-Tailored Context**: Layout shells adapt seamlessly—mobile-first phone mockup for students, clean text-focused dashboards for staff/HOD/warden, and distraction-free kiosk for gate security.
2. **Soft Depth & Subtle Borders**: Clean white cards with `rounded-2xl`, subtle borders (`border-slate-200/80`), and light shadows.
3. **Deterministic State**: Built with TanStack React Query and strict service contracts.
4. **Text-Based Identity**: Uses registered student photos where available, and clean text-based circular initials badges where photos are absent. No default placeholder silhouettes.
5. **Simplified Statistics**: 4 text-focused metric cards on administrative dashboards (`Total Student`, `In Campus`, `Home Out`, `Pending Request`).

### Color Tokens

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `primary` | `#2B2FE0` | `#3B40FF` | Primary buttons, active indicators, brand highlights |
| `primary-gradient` | `#2438E8` &rarr; `#6D28D9` | `#2438E8` &rarr; `#6D28D9` | Hero greetings, top accent bars |
| `accent-gold` | `#FFC83D` | `#F59E0B` | Handwritten quotes, warning accents |
| `success` | `#16A34A` | `#22C55E` | Approved passes, in-campus status, verified gate scans |
| `warning` | `#F59E0B` | `#FBBF24` | Pending approvals, curfew reminders |
| `danger` | `#DC2626` | `#EF4444` | Rejected passes, overdue alerts, emergency badges |
| `text-dark` | `#111936` | `#F8FAFC` | Primary text headings |
| `text-muted` | `#5B6485` | `#94A3B8` | Subtitles, labels, metadata |

### Typography Hierarchy
- **UI & Content**: `"Plus Jakarta Sans"` (weights: 400, 500, 600, 700, 800)
- **Monospace IDs & Codes**: `"JetBrains Mono"` (weights: 400, 500, 600, 700)
- **Campus Motto Quote**: `"Caveat"` (weights: 600, 700)

### Pass Lifecycle Badges

| Status Key | Label | Badge Styling | Meaning |
|---|---|---|---|
| `pending` | Pending Staff / Warden | `bg-amber-100 text-amber-800 border-amber-300` | Awaiting recommendation or approval |
| `recommended` | Recommended | `bg-emerald-100 text-emerald-800 border-emerald-300` | Staff advisor endorsed |
| `approved` | Approved | `bg-emerald-100 text-emerald-800 border-emerald-300` | Warden approved, gate ready |
| `rejected` | Rejected | `bg-rose-100 text-rose-800 border-rose-300` | Denied with recorded reason |
| `gate_pass_issued` | Gate Pass Issued | `bg-indigo-100 text-indigo-800 border-indigo-300` | Digital QR scanner unlocked |
| `out` | Out of Campus | `bg-blue-100 text-blue-800 border-blue-300` | Verified checkout at gate |
| `returned` | Returned | `bg-emerald-100 text-emerald-800 border-emerald-300` | Safely returned inside campus |
| `overdue` | Overdue Return | `bg-rose-100 text-rose-800 animate-pulse` | Exceeded return curfew |

---

## 7. Layout Shell Architecture

### 7.1 `StudentShell.jsx`
- **Mobile Viewport**: Optimized mobile web app with sticky top bar, slide-out drawer, and 4-tab bottom navigation (`Home`, `Apply`, `My Passes`, `Profile`).
- **Desktop Simulation**: Centered 480px simulated device frame with drop shadow and ambient branding.
- **Greeting Banner**: Dynamic greeting card based on time of day (morning, afternoon, evening, night).

### 7.2 `DashboardShell.jsx`
- **Administrative Portals**: Shared by Warden, Staff, HOD, and Correspondent.
- **Collapsible Sidebar**: Compact 76px or expanded 264px navigation.
- **Top Command Bar**: User avatar, time-aware greeting, notifications bell, and logout action.

### 7.3 `KioskShell.jsx`
- **Station Mode**: High-contrast, touch-optimized full-screen kiosk for campus security gate.
- **Live Security Ticker**: Live ticking clock, network status sensor, and supervisor PIN unlock (`1234`).

---

## 8. UI Component Catalog

Located in `src/components/ui/`:

- **`Button`**: Primary, secondary, outline, ghost, danger, with `isLoading` and icon support.
- **`Input` / `Select`**: Styled inputs with labels, error states, and clear focus rings.
- **`Modal`**: Accessible dialogs with focus trapping and ESC dismissal.
- **`Drawer`**: Slide-out panel for read-only resident profile views.
- **`Avatar`**: Image-based or text-initials fallback avatar.
- **`StatusChip`**: Standardized badges for the 9 outpass lifecycle states.
- **`StatCard`**: Clean text-focused metrics display cards.
- **`PageHeader`**: Standardized page title, subtitle, and action buttons.

---

## 9. Pre-Configured Test Accounts

| Portal / Role | Name | Login Identifier / Email | Password | Scope & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | R Sakthivel | `210523104089` or `CSE-4-001` | `Student@123` | CSE Year 4, Room 304. Full profile configured. |
| **Chief Warden** | Dr. John Xavier | `warden.dmi@gmail.com` | `Warden@123` | Final approver for all passes, gate QR, student allocation. |
| **Faculty Advisor** | Prof. Rajesh Sharma | `staff.cse1@gmail.com` | `Staff@123` | CSE Staff Advisor (Years 3 & 4). Advisory recommendations. |
| **HOD** | Dr. K. Arulmozhi | `hod.cse@gmail.com` | `Staff@123` | Head of Department (CSE). Department directory and attendance. |
| **Correspondent** | Rev. Fr. J. Antony | `correspondent.dmi@gmail.com` | `Staff@123` | Institutional management and governance reports. |

---

## 10. Local Development & Production Build

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+)
- [MySQL](https://www.mysql.com/) (v8.0+)

### Setup Instructions

1. **Clone repository**:
   ```bash
   git clone https://github.com/sakthivel-rajendhran/dmi_hostel.git
   cd dmi_hostel
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure Environment (`.env.local`)**:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/dmi_hostel"
   DB_HOST="localhost"
   DB_USER="root"
   DB_PASSWORD="your_password"
   DB_NAME="dmi_hostel"
   DB_PORT="3306"
   GATE_QR_SECRET_KEY="dmi-college-hostel-secure-hmac-secret-key"
   JWT_SECRET="dmi-jwt-secret-key-production"
   ```

4. **Initialize Database**:
   ```bash
   bun run db:init
   ```

5. **Start Development Server**:
   ```bash
   bun dev
   ```

6. **Build for Production**:
   ```bash
   bun run build
   ```
