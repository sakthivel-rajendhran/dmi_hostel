-- DMI College Hostel Management PWA
-- Supabase / PostgreSQL Migration: Outpass Approval Workflow & Gate QR Access Control
-- Migration: 20261121000000_outpass_approval_workflow.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Table: outpass_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outpass_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_number VARCHAR(64) UNIQUE NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  department VARCHAR(20) NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
  room_number VARCHAR(10),
  floor VARCHAR(10),
  outpass_type VARCHAR(20) NOT NULL CHECK (outpass_type IN ('Local Pass', 'Home Pass')),
  workflow_type VARCHAR(20) NOT NULL CHECK (workflow_type IN ('LOCAL', 'HOME')),
  destination VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  expected_return_time TIMESTAMPTZ NOT NULL,
  actual_exit_time TIMESTAMPTZ,
  actual_entry_time TIMESTAMPTZ,
  student_contact VARCHAR(25) NOT NULL,
  guardian_contact VARCHAR(25) NOT NULL,
  
  -- Overall Lifecycle Status
  overall_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_WARDEN' CHECK (
    overall_status IN (
      'PENDING_STAFF',
      'STAFF_APPROVED',
      'STAFF_REJECTED',
      'PENDING_WARDEN',
      'WARDEN_APPROVED',
      'WARDEN_REJECTED',
      'CANCELLED',
      'EXPIRED',
      'GATE_PASS_ISSUED',
      'OUT',
      'RETURNED',
      'OVERDUE'
    )
  ),

  -- Staff / Class In-charge Recommendation Stage
  staff_approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    staff_approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED')
  ),
  staff_approved_by VARCHAR(100),
  staff_approved_at TIMESTAMPTZ,
  staff_remarks TEXT,

  -- Chief Warden Final Approval Stage
  warden_approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    warden_approval_status IN ('PENDING', 'APPROVED', 'REJECTED')
  ),
  warden_approved_by VARCHAR(100),
  warden_approved_at TIMESTAMPTZ,
  warden_remarks TEXT,

  -- Cryptographic Gate QR Verification Credential
  qr_token VARCHAR(255),
  qr_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outpass_student_id ON public.outpass_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_outpass_overall_status ON public.outpass_requests(overall_status);
CREATE INDEX IF NOT EXISTS idx_outpass_workflow_type ON public.outpass_requests(workflow_type);
CREATE INDEX IF NOT EXISTS idx_outpass_department_year ON public.outpass_requests(department, year);
CREATE INDEX IF NOT EXISTS idx_outpass_departure_time ON public.outpass_requests(departure_time);

-- ============================================================================
-- 2. Table: outpass_approval_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outpass_approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outpass_id UUID NOT NULL REFERENCES public.outpass_requests(id) ON DELETE CASCADE,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  actor_role VARCHAR(30) NOT NULL CHECK (
    actor_role IN ('student', 'staff', 'warden', 'gate_security', 'system', 'admin')
  ),
  action VARCHAR(50) NOT NULL CHECK (
    action IN (
      'SUBMIT',
      'STAFF_APPROVE',
      'STAFF_REJECT',
      'WARDEN_APPROVE',
      'WARDEN_REJECT',
      'CANCEL',
      'GATE_EXIT',
      'GATE_ENTRY',
      'EXPIRE'
    )
  ),
  previous_status VARCHAR(30) NOT NULL,
  new_status VARCHAR(30) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_history_outpass ON public.outpass_approval_history(outpass_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_actor ON public.outpass_approval_history(actor_user_id);

-- ============================================================================
-- 3. Table: gate_scan_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gate_scan_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outpass_id UUID NOT NULL REFERENCES public.outpass_requests(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL,
  scan_type VARCHAR(10) NOT NULL CHECK (scan_type IN ('EXIT', 'ENTRY')),
  scanned_by VARCHAR(50) NOT NULL DEFAULT 'student_camera',
  gate_id VARCHAR(20) NOT NULL DEFAULT 'MAIN',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verification_status VARCHAR(20) NOT NULL CHECK (
    verification_status IN ('VERIFIED', 'REJECTED', 'LATE_RETURN', 'DUPLICATE_BLOCKED')
  ),
  qr_token_reference VARCHAR(100),
  device_location JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gate_scan_outpass ON public.gate_scan_records(outpass_id);
CREATE INDEX IF NOT EXISTS idx_gate_scan_student ON public.gate_scan_records(student_id);
CREATE INDEX IF NOT EXISTS idx_gate_scan_timestamp ON public.gate_scan_records(scanned_at DESC);

-- ============================================================================
-- 4. Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.outpass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outpass_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_scan_records ENABLE ROW LEVEL SECURITY;

-- 4.1 Students: Select own passes, insert own passes, cancel pending passes
CREATE POLICY student_select_own_passes ON public.outpass_requests
  FOR SELECT
  USING (auth.jwt() ->> 'student_id' = student_id OR auth.uid()::text = student_id);

CREATE POLICY student_insert_own_passes ON public.outpass_requests
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'student_id' = student_id OR auth.uid()::text = student_id)
    AND overall_status IN ('PENDING_STAFF', 'PENDING_WARDEN')
  );

CREATE POLICY student_cancel_own_passes ON public.outpass_requests
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'student_id' = student_id OR auth.uid()::text = student_id)
    AND overall_status IN ('PENDING_STAFF', 'PENDING_WARDEN')
  )
  WITH CHECK (
    overall_status = 'CANCELLED'
  );

-- 4.2 Staff: Select Home outpasses for their assigned department
CREATE POLICY staff_select_department_passes ON public.outpass_requests
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'staff'
    AND department = auth.jwt() ->> 'department'
    AND workflow_type = 'HOME'
  );

-- Staff Update: Can only update staff recommendation fields
CREATE POLICY staff_update_recommendation ON public.outpass_requests
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'staff'
    AND department = auth.jwt() ->> 'department'
    AND workflow_type = 'HOME'
    AND overall_status = 'PENDING_STAFF'
  )
  WITH CHECK (
    overall_status IN ('STAFF_APPROVED', 'STAFF_REJECTED', 'PENDING_WARDEN')
    AND staff_approval_status IN ('APPROVED', 'REJECTED')
  );

-- 4.3 Warden: Select all requests, approve/reject warden stage
CREATE POLICY warden_all_passes ON public.outpass_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('warden', 'admin'));

-- 4.4 Gate Security: Verify and update pass movement on scan
CREATE POLICY gate_security_movement ON public.outpass_requests
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('gate_security', 'warden', 'admin'))
  WITH CHECK (overall_status IN ('OUT', 'RETURNED', 'OVERDUE'));

-- 4.5 Approval History RLS
CREATE POLICY history_select_scoped ON public.outpass_approval_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outpass_requests o
      WHERE o.id = outpass_approval_history.outpass_id
      AND (
        o.student_id = auth.jwt() ->> 'student_id'
        OR auth.jwt() ->> 'role' IN ('warden', 'staff', 'admin')
      )
    )
  );

-- 4.6 Gate Scan Records RLS
CREATE POLICY gate_records_select_scoped ON public.gate_scan_records
  FOR SELECT
  USING (
    student_id = auth.jwt() ->> 'student_id'
    OR auth.jwt() ->> 'role' IN ('warden', 'gate_security', 'admin')
  );
