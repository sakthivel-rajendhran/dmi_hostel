/**
 * DMI College Hostel Management - Institutional User Accounts
 * Mock student records removed: Real students are registered and queried directly from MySQL.
 */

import { ROLES } from "@/config/roles.js";

export const MOCK_USERS = [
  // 1. Chief Warden
  {
    id: "WARDEN-001",
    name: "Dr. John Xavier",
    email: "warden@dmi.edu",
    gmail: "warden.xavier@dmice.ac.in",
    role: ROLES.WARDEN,
    designation: "Chief Warden & Professor",
    phone: "+91 98765 00002",
    avatar: "JX",
    department: "Administration",
    assignedFloors: ["GF", "F2", "F3", "F4"],
  },

  // 2. Faculty Advisor / Staff 1 (CSE - Year 3)
  {
    id: "STAFF-001",
    name: "Prof. Rajesh Sharma",
    email: "staff@dmi.edu",
    gmail: "staff.sharma@dmice.ac.in",
    role: ROLES.STAFF,
    designation: "Assistant Professor & Faculty Advisor",
    phone: "+91 98765 00003",
    avatar: "RS",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfRajeshSharma",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfRajeshSharma",
    dept: "CSE",
    department: "CSE",
    departmentName: "Computer Science & Engineering",
    assignedYears: [3],
    bio: "Faculty Advisor for 3rd Year CSE residents.",
  },

  // 3. Staff 2 (CSE - Years 1 & 2)
  {
    id: "STAFF-002",
    name: "Prof. Anand Kumar",
    email: "staff2@dmi.edu",
    gmail: "staff.anand@dmice.ac.in",
    role: ROLES.STAFF,
    designation: "Assistant Professor",
    phone: "+91 98765 00005",
    avatar: "AK",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfAnandKumar",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfAnandKumar",
    dept: "CSE",
    department: "CSE",
    departmentName: "Computer Science & Engineering",
    assignedYears: [1, 2],
    bio: "Junior batch academic mentor and hostel liaison for CSE 1st and 2nd Year residents.",
  },

  // 4. HOD (CSE)
  {
    id: "HOD-CSE-01",
    name: "Dr. Meenakshi Sundaram",
    email: "hod@dmi.edu",
    gmail: "hod.cse@dmice.ac.in",
    role: ROLES.HOD,
    designation: "Head of the Department, CSE",
    phone: "+91 98765 00006",
    avatar: "MS",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrMeenakshiSundaram",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrMeenakshiSundaram",
    dept: "CSE",
    department: "CSE",
    departmentName: "Computer Science & Engineering",
    assignedYears: [1, 2, 3, 4],
    bio: "HOD of CSE overseeing academic approvals for hostel residents.",
  },

  // 5. Correspondent
  {
    id: "CORRESPONDENT-001",
    name: "Rev. Fr. J. E. Arul Raj",
    email: "correspondent@dmi.edu",
    gmail: "correspondent@dmice.ac.in",
    role: ROLES.CORRESPONDENT,
    designation: "Founder & Correspondent",
    phone: "+91 98765 00008",
    avatar: "AR",
    department: "Management",
  },
];

export default MOCK_USERS;
