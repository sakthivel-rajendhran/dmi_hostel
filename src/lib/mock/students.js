/**
 * DMI College Hostel Management PWA - 40 Deterministic Mock Students
 * Structured with generated IDs (DEPT-YEAR-SEQ), departments, floors (GF, F2, F3, F4),
 * rooms (G01-G30, 201-230, etc.), programmes, and guardian info.
 */

import { computeBatch } from "@/lib/validators.js";

const FIRST_NAMES = [
  "Sakthivel", "Aravind", "Karthik", "Deepak", "Siddharth", "Manoj", "Pradeep", "Suresh",
  "Dinesh", "Vignesh", "Rithvik", "Gautam", "Naveen", "Praveen", "Ashok", "Sanjay",
  "Ananya", "Keerthi", "Pooja", "Divya", "Swetha", "Nandhini", "Pavithra", "Harini",
  "Sneha", "Kavya", "Varun", "Rahul", "Aditya", "Tarun", "Vikram", "Surya",
  "Arun", "Bala", "Gokul", "Hari", "Ilango", "Jeeva", "Madhavan", "Natarajan"
];

const LAST_NAMES = [
  "Murugan", "Kumar", "Rajan", "Sundaram", "Chandran", "Natarajan", "Krishnan", "Subramanian",
  "Srinivasan", "Balakrishnan", "Venkat", "Swaminathan", "Ramachandran", "Iyer", "Chettiar", "Pillai"
];

const DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AI&DS"];

const FLOOR_CONFIGS = [
  { id: "GF", label: "Ground Floor", short: "Ground", prefix: "G" },
  { id: "F2", label: "2nd Floor", short: "2nd", prefix: "2" },
  { id: "F3", label: "3rd Floor", short: "3rd", prefix: "3" },
  { id: "F4", label: "4th Floor", short: "4th", prefix: "4" }
];

export const MOCK_STUDENTS = Array.from({ length: 40 }, (_, idx) => {
  const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
  const lastName = LAST_NAMES[idx % LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const dept = DEPARTMENTS[idx % DEPARTMENTS.length];
  const year = (idx % 4) + 1;
  const seq = String(Math.floor(idx / (DEPARTMENTS.length * 4)) + 1 + (idx % 3)).padStart(3, "0");
  const studentId = `${dept}-${year}-${seq}`;
  
  // Floor and room mapping
  const floorObj = FLOOR_CONFIGS[idx % FLOOR_CONFIGS.length];
  const floor = floorObj.id;
  const floorLabel = floorObj.label;
  const roomIndex = ((idx * 3) % 28) + 1; // 1 to 28
  const roomNo = floor === "GF" 
    ? `G${String(roomIndex).padStart(2, "0")}`
    : `${floorObj.prefix}${String(roomIndex).padStart(2, "0")}`;

  const regNumber = `310622${dept === "CSE" ? "104" : dept === "IT" ? "205" : "106"}${String(idx + 1).padStart(3, "0")}`;
  const batch = computeBatch(year, 4);

  return {
    id: studentId,
    studentId,
    name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@dmice.ac.in`,
    phone: `+91 9${String(100000000 + idx * 83741).slice(0, 9)}`,
    avatar: `${firstName[0]}${lastName[0]}`,
    photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentId}`,
    photoDataUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentId}`,
    department: dept,
    dept,
    year,
    programme: "B.E.",
    section: ["A", "B", "C"][idx % 3],
    batch,
    regNumber,
    regNo: regNumber,
    floor,
    floorLabel,
    room: roomNo,
    roomNo,
    roomNumber: roomNo,
    bed: `Bed ${String.fromCharCode(65 + (idx % 4))}`,
    hostelVerification: "verified",
    guardianName: `${lastName} Senior`,
    guardianPhone: `+91 9${String(800000000 + idx * 92831).slice(0, 9)}`,
    guardianRelation: idx % 6 === 0 ? "Mother" : "Father",
    address: `No. ${idx * 3 + 12}, Gandhi Street, Chennai, Tamil Nadu`,
    bloodGroup: ["O+ve", "A+ve", "B+ve", "AB+ve"][idx % 4],
    status: "Active",
    profileComplete: true,
  };
});

// Student 1: Rahul Kumar (CSE-3-001) - 3rd Floor, Room 304, Fully Complete
MOCK_STUDENTS[0] = {
  ...MOCK_STUDENTS[0],
  id: "CSE-3-001",
  studentId: "CSE-3-001",
  name: "Rahul Kumar",
  email: "rahul.kumar@dmice.ac.in",
  department: "CSE",
  dept: "CSE",
  year: 3,
  programme: "B.E.",
  section: "A",
  batch: "2022 – 2026",
  regNumber: "310622104045",
  regNo: "310622104045",
  floor: "F3",
  floorLabel: "3rd Floor",
  room: "304",
  roomNo: "304",
  roomNumber: "304",
  bed: "Bed A",
  hostelVerification: "verified",
  guardianName: "David Kumar",
  guardianPhone: "+91 98765 00001",
  guardianRelation: "Father",
  address: "No. 42, Anna Nagar, Chennai - 600040",
  bloodGroup: "O+ve",
  photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
  photoDataUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CSE-3-001",
  profileComplete: true,
};

// Student 2: Karthik Rajan (IT-2-004) - Incomplete profile, unallocated, no photo
const karthikIdx = MOCK_STUDENTS.findIndex(s => s.studentId === "IT-2-004") !== -1
  ? MOCK_STUDENTS.findIndex(s => s.studentId === "IT-2-004")
  : 1;

MOCK_STUDENTS[karthikIdx] = {
  ...MOCK_STUDENTS[karthikIdx],
  id: "IT-2-004",
  studentId: "IT-2-004",
  name: "Karthik Rajan",
  email: "karthik.rajan@dmice.ac.in",
  department: "IT",
  dept: "IT",
  year: 2,
  programme: "B.Tech",
  section: "B",
  batch: "2023 – 2027",
  regNumber: "310623205012",
  regNo: "310623205012",
  phone: "",
  photo: null,
  photoDataUrl: null,
  avatar: "KR",
  floor: null,
  floorLabel: null,
  room: null,
  roomNo: null,
  roomNumber: null,
  bed: null,
  hostelVerification: "unallocated",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
  profileComplete: false,
};

// Seed exactly 4 students into Ground Floor room G05 to make G05 100% full (capacity 4, occupied 4)
// We use indices 5, 6, 7, 8
[5, 6, 7, 8].forEach((sIdx, i) => {
  if (MOCK_STUDENTS[sIdx]) {
    MOCK_STUDENTS[sIdx].floor = "GF";
    MOCK_STUDENTS[sIdx].floorLabel = "Ground Floor";
    MOCK_STUDENTS[sIdx].room = "G05";
    MOCK_STUDENTS[sIdx].roomNo = "G05";
    MOCK_STUDENTS[sIdx].roomNumber = "G05";
    MOCK_STUDENTS[sIdx].bed = `Bed ${String.fromCharCode(65 + i)}`;
    MOCK_STUDENTS[sIdx].hostelVerification = "verified";
  }
});

export default MOCK_STUDENTS;
