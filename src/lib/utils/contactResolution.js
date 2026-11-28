/**
 * Authoritative Parent Contact Resolution
 * Prioritizes registered parent contact numbers from students table:
 * 1. father_phone (if present, valid, and != student's phone)
 * 2. mother_phone (if present, valid, and != student's phone)
 * 3. guardian_phone (if present, valid, and != student's phone)
 *
 * If no distinct parent phone is stored, returns parentPhone = "" and hasParentPhone = false.
 * Under NO circumstances does it fall back to the student's personal phone number as parent phone.
 */
export function resolveParentContact(record = {}) {
  const studentPhone = (
    record.student_phone ||
    record.studentPhone ||
    record.phone ||
    record.student_contact ||
    ""
  ).toString().trim();

  const fatherPhone = (record.father_phone || record.fatherPhone || "").toString().trim();
  const motherPhone = (record.mother_phone || record.motherPhone || "").toString().trim();
  const guardianPhone = (
    record.guardian_phone ||
    record.guardianPhone ||
    record.student_guardian_phone ||
    record.guardian_contact ||
    ""
  ).toString().trim();

  const fatherName = (record.father_name || record.fatherName || "").toString().trim();
  const motherName = (record.mother_name || record.motherName || "").toString().trim();
  const guardianName = (record.guardian_name || record.guardianName || "").toString().trim();
  const guardianRelation = (record.guardian_relation || record.guardianRelation || "").toString().trim();

  const cleanDigits = (val) => (val ? val.replace(/\D/g, "") : "");
  const studentDigits = cleanDigits(studentPhone);

  const isValidParentPhone = (val) => {
    if (!val) return false;
    const digits = cleanDigits(val);
    if (digits.length < 7) return false;
    if (studentDigits && digits === studentDigits) return false;
    return true;
  };

  if (isValidParentPhone(fatherPhone)) {
    return {
      parentPhone: fatherPhone,
      parentName: fatherName || "Father",
      parentRelation: "Father",
      hasParentPhone: true,
      studentPhone,
    };
  }

  if (isValidParentPhone(motherPhone)) {
    return {
      parentPhone: motherPhone,
      parentName: motherName || "Mother",
      parentRelation: "Mother",
      hasParentPhone: true,
      studentPhone,
    };
  }

  if (isValidParentPhone(guardianPhone)) {
    return {
      parentPhone: guardianPhone,
      parentName: guardianName || "Guardian",
      parentRelation: guardianRelation || "Guardian",
      hasParentPhone: true,
      studentPhone,
    };
  }

  return {
    parentPhone: "",
    parentName: fatherName || motherName || guardianName || "Parent / Guardian",
    parentRelation: guardianRelation || (fatherName ? "Father" : motherName ? "Mother" : "Parent / Guardian"),
    hasParentPhone: false,
    studentPhone,
  };
}
