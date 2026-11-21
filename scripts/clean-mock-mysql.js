import { query } from "../src/lib/db/mysql.js";

async function cleanMockMysql() {
  console.log("=== CLEANING MOCK DATA FROM MYSQL ===");

  // 1. Expand role enum to include security and admin
  await query("ALTER TABLE users MODIFY COLUMN role ENUM('student','warden','staff','hod','principal','correspondent','security','admin') NOT NULL;");
  console.log("✓ Updated role enum in MySQL users table");

  // 2. Delete mock student CSE-3-001
  await query("DELETE FROM student_photos WHERE student_id = 'CSE-3-001' OR student_id = 'UNKNOWN_ID'");
  await query("DELETE FROM students WHERE id = 'CSE-3-001' OR student_id = 'CSE-3-001'");
  await query("DELETE FROM users WHERE id = 'CSE-3-001'");
  console.log("✓ Removed fake mock student CSE-3-001 from MySQL");

  // 3. Ensure institutional role accounts exist in MySQL with password DmiCE@1202
  const institutionalUsers = [
    {
      id: "WARDEN-001",
      email: "warden@dmi.edu",
      role: "warden",
      name: "Dr. John Xavier",
      phone: "+91 98765 00002",
      avatar_url: "JX",
      department: "Administration",
      designation: "Chief Warden & Professor",
      assigned_years: [1, 2, 3, 4],
    },
    {
      id: "STAFF-001",
      email: "staff@dmi.edu",
      role: "staff",
      name: "Prof. Rajesh Sharma",
      phone: "+91 98765 00003",
      avatar_url: "RS",
      department: "CSE",
      designation: "Assistant Professor & Faculty Advisor",
      assigned_years: [3],
    },
    {
      id: "HOD-CSE-01",
      email: "hod@dmi.edu",
      role: "hod",
      name: "Dr. Meenakshi Sundaram",
      phone: "+91 98765 00006",
      avatar_url: "MS",
      department: "CSE",
      designation: "Head of the Department, CSE",
      assigned_years: [1, 2, 3, 4],
    },
    {
      id: "PRINCIPAL-001",
      email: "principal@dmi.edu",
      role: "principal",
      name: "Dr. S. Paul Raj",
      phone: "+91 98765 00007",
      avatar_url: "PR",
      department: "Administration",
      designation: "Principal",
      assigned_years: [1, 2, 3, 4],
    },
    {
      id: "CORRESPONDENT-001",
      email: "correspondent@dmi.edu",
      role: "correspondent",
      name: "Rev. Fr. J. E. Arul Raj",
      phone: "+91 98765 00008",
      avatar_url: "AR",
      department: "Management",
      designation: "Founder & Correspondent",
      assigned_years: [1, 2, 3, 4],
    },
    {
      id: "GATE-001",
      email: "security@dmi.edu",
      role: "security",
      name: "S. Murugan",
      phone: "+91 98765 00009",
      avatar_url: "SM",
      department: "Campus Security",
      designation: "Head Security Officer",
      assigned_years: [1, 2, 3, 4],
    },
  ];

  for (const u of institutionalUsers) {
    await query(
      `INSERT INTO users (id, email, password, role, name, phone, avatar_url, must_change_password, status)
       VALUES (?, ?, 'DmiCE@1202', ?, ?, ?, ?, 0, 'active')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role),
         phone = VALUES(phone),
         status = VALUES(status);`,
      [u.id, u.email, u.role, u.name, u.phone, u.avatar_url]
    );

    await query(
      `INSERT INTO staff_profiles (user_id, department, designation, assigned_years)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         department = VALUES(department),
         designation = VALUES(designation),
         assigned_years = VALUES(assigned_years);`,
      [u.id, u.department, u.designation, JSON.stringify(u.assigned_years)]
    );
  }
  console.log("✓ Seeded official institutional accounts in MySQL");

  // 4. Verify students table in MySQL
  const students = await query("SELECT id, student_id, reg_no, name FROM students");
  console.log("Active Students in MySQL:", students);

  // 5. Verify users in MySQL
  const users = await query("SELECT id, name, email, role FROM users");
  console.log("Active Users in MySQL:", users);

  console.log("=== MYSQL CLEANUP COMPLETE ===");
  process.exit(0);
}

cleanMockMysql();
