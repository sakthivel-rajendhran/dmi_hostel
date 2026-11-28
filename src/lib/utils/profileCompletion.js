/**
 * Consistent Profile Completion Calculator for Student Profile
 * Used by Backend APIs, Services, and Frontend Components.
 */

export const REQUIRED_PROFILE_FIELDS = [
  { key: "photo", label: "Profile Photograph", group: "Student Information" },
  { key: "department", label: "Department", group: "Student Information" },
  { key: "year", label: "Academic Year", group: "Student Information" },
  { key: "phone", label: "Phone Number", group: "Student Information" },
  { key: "regNo", label: "Registration Number", group: "Student Information" },
  { key: "room", label: "Room Number", group: "Student Information" },
  { key: "email", label: "College Email", group: "Additional Information" },
  { key: "dob", label: "Date of Birth", group: "Additional Information" },
  { key: "bloodGroup", label: "Blood Group", group: "Additional Information" },
  { key: "address", label: "Address", group: "Additional Information" },
  { key: "fatherName", label: "Father Name", group: "Parent Details" },
  { key: "fatherPhone", label: "Father Phone Number", group: "Parent Details" },
  { key: "motherName", label: "Mother Name", group: "Parent Details" },
  { key: "motherPhone", label: "Mother Phone Number", group: "Parent Details" },
];

export function calculateProfileCompletion(data = {}) {
  const photo = Boolean(data.photo || data.photoUrl || data.photo_url || data.avatar_url || data.photoDataUrl);
  const department = Boolean(data.department || data.dept);
  const year = Boolean(data.year);
  const phone = Boolean(data.phone && String(data.phone).trim().length >= 10);
  const regNo = Boolean(data.regNo || data.reg_no || data.regNumber);
  const room = Boolean(data.room || data.roomNo || data.room_number || data.roomNumber || data.floor);

  const email = Boolean(data.email || data.collegeEmail);
  const dob = Boolean(data.dob && String(data.dob).trim().length > 0);
  const bloodGroup = Boolean(data.bloodGroup || data.blood_group && String(data.bloodGroup || data.blood_group).trim().length > 0);
  const address = Boolean((data.address || data.home_address) && String(data.address || data.home_address).trim().length >= 5);

  const fatherName = Boolean((data.fatherName || data.father_name) && String(data.fatherName || data.father_name).trim().length >= 2);
  const fatherPhone = Boolean((data.fatherPhone || data.father_phone) && String(data.fatherPhone || data.father_phone).trim().length >= 10);
  const motherName = Boolean((data.motherName || data.mother_name) && String(data.motherName || data.mother_name).trim().length >= 2);
  const motherPhone = Boolean((data.motherPhone || data.mother_phone) && String(data.motherPhone || data.mother_phone).trim().length >= 10);

  const fieldStatus = {
    photo,
    department,
    year,
    phone,
    regNo,
    room,
    email,
    dob,
    bloodGroup,
    address,
    fatherName,
    fatherPhone,
    motherName,
    motherPhone,
  };

  const fields = REQUIRED_PROFILE_FIELDS.map((f) => ({
    ...f,
    complete: Boolean(fieldStatus[f.key]),
  }));

  const filledCount = fields.filter((f) => f.complete).length;
  const totalRequired = 14;
  const percentage = Math.round((filledCount / totalRequired) * 100);
  const missingFields = fields.filter((f) => !f.complete).map((f) => f.label);
  const missingFieldKeys = fields.filter((f) => !f.complete).map((f) => f.key);

  return {
    fields,
    filledCount,
    totalRequired,
    percentage,
    is100Percent: percentage === 100,
    missingFields,
    missingFieldKeys,
  };
}
