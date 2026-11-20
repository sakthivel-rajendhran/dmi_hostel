# DMI College Hostel Management PWA — Supabase Row Level Security (RLS) Policies

Every table in the database must have RLS enabled:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE outpasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
```

---

## 1. Outpasses Table Policies

### Students
```sql
-- Students can only read their own passes
CREATE POLICY student_select_own_passes ON outpasses
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can insert passes for themselves
CREATE POLICY student_insert_own_passes ON outpasses
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can only cancel their own pending passes
CREATE POLICY student_cancel_own_passes ON outpasses
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');
```

### Warden
```sql
-- Warden can view all passes across the hostel
CREATE POLICY warden_select_all_passes ON outpasses
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'warden');

-- Warden has full update authority (Approve, Reject, Issue Gate Pass)
CREATE POLICY warden_update_passes ON outpasses
  FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'warden');
```

### Staff & HOD
```sql
-- Staff can view passes belonging to students in their department & assigned year
CREATE POLICY staff_select_department_passes ON outpasses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN staff_profiles sp ON sp.user_id = auth.uid()
      WHERE s.id = outpasses.student_id
        AND s.department = sp.department
        AND (sp.assigned_years = '{}' OR s.year = ANY(sp.assigned_years))
    )
  );

-- HOD can view passes for all students in their department
CREATE POLICY hod_select_department_passes ON outpasses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN staff_profiles sp ON sp.user_id = auth.uid()
      WHERE s.id = outpasses.student_id
        AND s.department = sp.department
    )
  );
```

### Principal & Correspondent (Strict Read-Only)
```sql
-- Read-only visibility across all passes
CREATE POLICY leadership_select_all_passes ON outpasses
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('principal', 'correspondent')
  );
```

---

## 2. Pass Recommendations Table Policies

```sql
-- Staff and HOD can insert recommendations for passes in their department
CREATE POLICY staff_insert_recommendation ON pass_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    by_user_id = auth.uid() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('staff', 'hod')
  );

-- Recommendations can be read by student owner, staff/hod, and warden
CREATE POLICY read_recommendations ON pass_recommendations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('warden', 'principal', 'correspondent')
    OR by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM outpasses op
      WHERE op.id = pass_recommendations.pass_id AND op.student_id = auth.uid()
    )
  );
```
