-- DMI College Hostel Management PWA — MySQL Database Schema
CREATE DATABASE IF NOT EXISTS hostel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hostel_management;

-- 1. Users Table (Authentication Base)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'warden', 'staff', 'hod', 'principal', 'correspondent') NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(25),
  avatar_url TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  status ENUM('Active', 'Password change pending', 'Disabled') DEFAULT 'Active',
  disable_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Staff Profiles Table
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id VARCHAR(64) PRIMARY KEY,
  department VARCHAR(20) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  assigned_years JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Building Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  room_number VARCHAR(10) PRIMARY KEY,
  floor VARCHAR(10) NOT NULL,
  capacity INT DEFAULT 4,
  occupied INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(30) UNIQUE NOT NULL,
  reg_no VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(20) NOT NULL,
  programme VARCHAR(30) DEFAULT 'B.E.',
  year INT NOT NULL,
  batch VARCHAR(20) NOT NULL,
  floor VARCHAR(10) NOT NULL,
  room_number VARCHAR(10) NULL,
  room_verified BOOLEAN DEFAULT FALSE,
  guardian_name VARCHAR(100),
  guardian_phone VARCHAR(25),
  guardian_relation VARCHAR(50),
  home_address TEXT,
  blood_group VARCHAR(10),
  photo_url TEXT,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_number) REFERENCES rooms(room_number) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Outpasses Table
CREATE TABLE IF NOT EXISTS outpasses (
  id VARCHAR(64) PRIMARY KEY,
  pass_number VARCHAR(64) UNIQUE NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  type ENUM('Local Pass', 'Home Pass') NOT NULL,
  destination VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  departure_time DATETIME NOT NULL,
  expected_return_time DATETIME NOT NULL,
  actual_exit_time DATETIME NULL,
  actual_return_time DATETIME NULL,
  status ENUM('pending', 'recommended', 'approved', 'gate_pass_issued', 'out', 'returned', 'overdue', 'rejected', 'cancelled') DEFAULT 'pending',
  is_late BOOLEAN DEFAULT FALSE,
  late_minutes INT DEFAULT 0,
  emergency BOOLEAN DEFAULT FALSE,
  guardian_consent BOOLEAN DEFAULT TRUE,
  guardian_phone VARCHAR(25),
  warden_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Pass Timeline
CREATE TABLE IF NOT EXISTS pass_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pass_id VARCHAR(64) NOT NULL,
  status VARCHAR(40) NOT NULL,
  label VARCHAR(100) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  note TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pass_id) REFERENCES outpasses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Security Logs
CREATE TABLE IF NOT EXISTS security_logs (
  id VARCHAR(64) PRIMARY KEY,
  pass_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  action ENUM('EXIT', 'ENTRY') NOT NULL,
  gate_id VARCHAR(20) DEFAULT 'MAIN',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_by VARCHAR(100) NOT NULL,
  is_manual BOOLEAN DEFAULT FALSE,
  is_late BOOLEAN DEFAULT FALSE,
  late_minutes INT DEFAULT 0,
  notes TEXT
) ENGINE=InnoDB;

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  pass_id VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Letters (Optional Feature-Flagged)
CREATE TABLE IF NOT EXISTS letters (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('submitted', 'approved', 'declined', 'withdrawn', 'expired') DEFAULT 'submitted',
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
