# DMI College Hostel Management PWA — PostgreSQL Database Schema

```sql
-- Enums
CREATE TYPE user_role AS ENUM ('student', 'warden', 'staff', 'hod', 'principal', 'correspondent');
CREATE TYPE pass_type AS ENUM ('Local Pass', 'Home Pass');
CREATE TYPE pass_status AS ENUM (
  'pending', 'recommended', 'approved', 'gate_pass_issued',
  'out', 'returned', 'overdue', 'rejected', 'cancelled'
);
CREATE TYPE account_status AS ENUM ('Active', 'Password change pending', 'Disabled');
CREATE TYPE recommendation_verdict AS ENUM ('recommend', 'do_not_recommend');

-- 1. Users Table (Auth Base)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  must_change_password BOOLEAN DEFAULT false,
  status account_status DEFAULT 'Active',
  disable_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Staff Profiles Table
CREATE TABLE staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department VARCHAR(10) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  assigned_years INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Rooms Table
CREATE TABLE rooms (
  room_number VARCHAR(10) PRIMARY KEY, -- 'G01'-'G30', '201'-'230', '301'-'330', '401'-'430'
  floor VARCHAR(5) NOT NULL,          -- 'GF', 'F2', 'F3', 'F4'
  capacity INTEGER DEFAULT 4,
  occupied INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available' -- 'available', 'partial', 'full', 'maintenance'
);

-- 4. Students Table
CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(20) UNIQUE NOT NULL, -- e.g. 'CSE-3-001'
  reg_no VARCHAR(20) UNIQUE NOT NULL,     -- e.g. '310621104001'
  name VARCHAR(100) NOT NULL,
  department VARCHAR(10) NOT NULL,
  programme VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
  batch VARCHAR(15) NOT NULL,             -- e.g. '2023-2027'
  floor VARCHAR(5) NOT NULL,
  room_number VARCHAR(10) REFERENCES rooms(room_number),
  room_verified BOOLEAN DEFAULT false,
  guardian_name VARCHAR(100),
  guardian_phone VARCHAR(20),
  guardian_relation VARCHAR(50),
  home_address TEXT,
  blood_group VARCHAR(10),
  photo_url TEXT,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Outpasses Table
CREATE TABLE outpasses (
  id VARCHAR(30) PRIMARY KEY, -- e.g. 'DMI-PASS-2026-0001'
  pass_number VARCHAR(30) UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type pass_type NOT NULL,
  destination VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  expected_return_time TIMESTAMPTZ NOT NULL,
  actual_exit_time TIMESTAMPTZ,
  actual_return_time TIMESTAMPTZ,
  status pass_status DEFAULT 'pending',
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  emergency BOOLEAN DEFAULT false,
  guardian_consent BOOLEAN DEFAULT true,
  warden_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Pass Timeline Table
CREATE TABLE pass_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id VARCHAR(30) NOT NULL REFERENCES outpasses(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  label VARCHAR(100) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Pass Recommendations Table (Staff / HOD Advisory)
CREATE TABLE pass_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id VARCHAR(30) NOT NULL REFERENCES outpasses(id) ON DELETE CASCADE,
  by_user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  verdict recommendation_verdict NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Gate Security Logs Table
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id VARCHAR(30) REFERENCES outpasses(id),
  student_id UUID NOT NULL REFERENCES students(id),
  gate_id VARCHAR(20) NOT NULL DEFAULT 'MAIN',
  action VARCHAR(20) NOT NULL, -- 'EXIT' | 'ENTRY'
  verified_by VARCHAR(50) DEFAULT 'Gate Scanner Kiosk',
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_students_dept_year ON students(department, year);
CREATE INDEX idx_students_room ON students(room_number);
CREATE INDEX idx_outpasses_student ON outpasses(student_id);
CREATE INDEX idx_outpasses_status ON outpasses(status);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
```
