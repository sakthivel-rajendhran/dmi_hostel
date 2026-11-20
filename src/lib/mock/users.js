/**
 * DMI College Hostel Management PWA - Mock Users
 * Deterministic users for all 7 roles + test students for profile completeness gate.
 */

import { ROLES } from "@/config/roles.js";

export const MOCK_USERS = [
  // 1. Student 1: Rahul Kumar (Fully Complete Profile, 100%)
  {
    id: "CSE-3-001",
    studentId: "CSE-3-001",
    name: "Rahul Kumar",
    email: "rahul.kumar@dmice.ac.in",
    gmail: "rahul.kumar@gmail.com",
    role: ROLES.STUDENT,
    phone: "9876543210",
    avatar: "RK",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
    dept: "CSE",
    department: "CSE",
    departmentName: "Computer Science & Engineering",
    year: 3,
    programme: "B.E.",
    section: "A",
    batch: "2022 – 2026",
    regNumber: "310622104045",
    regNo: "310622104045",
    floor: "F3",
    floorLabel: "3rd Floor",
    roomNumber: "304",
    room: "304",
    roomNo: "304",
    bed: "Bed A",
    hostelVerification: "verified",
    dob: "2004-05-14",
    guardianName: "David Kumar",
    guardianPhone: "9876500001",
    guardianAltPhone: "9876500002",
    guardianRelation: "Father",
    address: "No. 42, Anna Nagar, Chennai - 600040",
    bloodGroup: "O+ve",
    mustChangePassword: false,
    profileComplete: true,
  },

  // 2. Student 2: Karthik Rajan (Incomplete Profile - Missing Room, Floor, Guardian, Photo)
  {
    id: "IT-2-004",
    studentId: "IT-2-004",
    name: "Karthik Rajan",
    email: "karthik.rajan@dmice.ac.in",
    gmail: "karthik.rajan@gmail.com",
    role: ROLES.STUDENT,
    phone: "",
    avatar: "KR",
    photo: null,
    photoDataUrl: null,
    dept: "IT",
    department: "IT",
    departmentName: "Information Technology",
    year: 2,
    programme: "B.Tech",
    section: "B",
    batch: "2023 – 2027",
    regNumber: "310623205012",
    regNo: "310623205012",
    floor: null,
    floorLabel: null,
    roomNumber: null,
    room: null,
    roomNo: null,
    bed: null,
    hostelVerification: "unallocated",
    dob: "2005-08-20",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
    address: "",
    bloodGroup: "B+ve",
    mustChangePassword: false,
    profileComplete: false,
  },

  // 3. Chief Warden
  {
    id: "WARDEN-001",
    name: "Dr. John Xavier",
    email: "warden.xavier@dmice.ac.in",
    gmail: "warden.dmi@gmail.com",
    role: ROLES.WARDEN,
    designation: "Chief Warden & Professor",
    phone: "+91 98765 00002",
    avatar: "JX",
    department: "Administration",
    assignedFloors: ["GF", "F2", "F3", "F4"],
  },

  // 4. Faculty Advisor / Staff 1 (CSE - Year 3)
  {
    id: "STAFF-001",
    name: "Prof. Rajesh Sharma",
    email: "staff.sharma@dmice.ac.in",
    gmail: "staff.cse@gmail.com",
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
    bio: "Faculty Advisor for 3rd Year CSE residents. Specializing in Distributed Systems & Cloud Infrastructure.",
  },

  // 5. Staff 2 (CSE - Years 1 & 2)
  {
    id: "STAFF-002",
    name: "Prof. Anand Kumar",
    email: "staff.anand@dmice.ac.in",
    gmail: "staff2.cse@gmail.com",
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

  // 6. HOD (CSE - All Years)
  {
    id: "HOD-CSE-01",
    name: "Dr. Meenakshi Sundaram",
    email: "hod.cse@dmice.ac.in",
    gmail: "hod.cse@gmail.com",
    role: ROLES.HOD,
    designation: "Head of the Department, CSE",
    phone: "+91 98765 00006",
    avatar: "MS",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrMeenakshiSundaram",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrMeenakshiSundaram",
    dept: "CSE",
    department: "CSE",
    departmentName: "Computer Science & Engineering",
    assignedYears: [], // Empty means all years
    bio: "Professor & Head of Computer Science and Engineering. Oversight of all academic outpasses.",
  },

  // 7. Staff IT (IT Dept - Years 2 & 3)
  {
    id: "STAFF-IT-01",
    name: "Prof. Priya Raman",
    email: "staff.priya@dmice.ac.in",
    gmail: "staff.it@gmail.com",
    role: ROLES.STAFF,
    designation: "Associate Professor",
    phone: "+91 98765 00004",
    avatar: "PR",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfPriyaRaman",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProfPriyaRaman",
    dept: "IT",
    department: "IT",
    departmentName: "Information Technology",
    assignedYears: [2, 3],
    bio: "Associate Professor, Department of Information Technology. Academic advisor for 2nd and 3rd year students.",
  },

  // 8. HOD IT (IT Dept - All Years)
  {
    id: "HOD-IT-01",
    name: "Dr. Suresh Venkat",
    email: "hod.it@dmice.ac.in",
    gmail: "hod.it@gmail.com",
    role: ROLES.HOD,
    designation: "Head of the Department, IT",
    phone: "+91 98765 00007",
    avatar: "SV",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrSureshVenkat",
    photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DrSureshVenkat",
    dept: "IT",
    department: "IT",
    departmentName: "Information Technology",
    assignedYears: [],
    bio: "Professor & Head of Information Technology. Department outpass governance.",
  },

  // 7. Principal
  {
    id: "PRINCIPAL-001",
    name: "Dr. Joseph Lawrence",
    email: "principal.joseph@dmice.ac.in",
    gmail: "principal.dmi@gmail.com",
    role: ROLES.PRINCIPAL,
    designation: "Principal & Academic Director",
    phone: "+91 98765 00008",
    avatar: "JL",
    department: "Executive",
  },

  // 8. Correspondent
  {
    id: "CORRESPONDENT-001",
    name: "Rev. Fr. Mary Antony",
    email: "correspondent.mary@dmice.ac.in",
    gmail: "correspondent.dmi@gmail.com",
    role: ROLES.CORRESPONDENT,
    designation: "Correspondent & Managing Trustee",
    phone: "+91 98765 00009",
    avatar: "MA",
    department: "Trust Office",
  },
];

export function getMockUserByRole(role) {
  const normalized = (role || "").toLowerCase();
  return MOCK_USERS.find((u) => u.role === normalized) || MOCK_USERS[0];
}

export function getMockUserById(id) {
  return MOCK_USERS.find((u) => u.id === id || u.studentId === id || u.email === id);
}

export default MOCK_USERS;
