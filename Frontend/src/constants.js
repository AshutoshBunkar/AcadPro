export const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science and Engineering" },
  { value: "ECE", label: "Electronics and Communication Engineering" },
];

export const YEARS = [1, 2, 3, 4];

export const ACTIVE_ACADEMIC_YEAR = "2026-2027";
export const ACADEMIC_YEARS = ["2026-2027"];

export const ACTIVE_SEMESTERS = [1, 3, 5, 7];

export const SEMESTER_LABELS = {
  1: "1st Semester",
  2: "2nd Semester",
  3: "3rd Semester",
  4: "4th Semester",
  5: "5th Semester",
  6: "6th Semester",
  7: "7th Semester",
  8: "8th Semester",
};

export const TERM_OPTIONS = [
  {
    value: "ODD",
    label: "Autumn Term — Odd Semesters (Sem 1, 3, 5, 7)",
    semesters: [1, 3, 5, 7],
    description: "Semesters 1, 3, 5, and 7 running concurrently across all undergraduate batches",
  },
  {
    value: "EVEN",
    label: "Spring Term — Even Semesters (Sem 2, 4, 6, 8)",
    semesters: [2, 4, 6, 8],
    description: "Semesters 2, 4, 6, and 8 running concurrently across all undergraduate batches",
  },
];

// Initial student registration semester options (Odd entry terms)
export const STUDENT_REGISTRATION_SEMESTER_OPTIONS = [
  { value: 1, label: "1st Semester" },
  { value: 3, label: "3rd Semester" },
  { value: 5, label: "5th Semester" },
  { value: 7, label: "7th Semester" },
];

export const SEMESTER_OPTIONS = [
  { value: 1, label: "1st Semester", year: 1 },
  { value: 2, label: "2nd Semester", year: 1 },
  { value: 3, label: "3rd Semester", year: 2 },
  { value: 4, label: "4th Semester", year: 2 },
  { value: 5, label: "5th Semester", year: 3 },
  { value: 6, label: "6th Semester", year: 3 },
  { value: 7, label: "7th Semester", year: 4 },
  { value: 8, label: "8th Semester", year: 4 },
];


export const ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  ADMIN: "admin",
};

export const DASHBOARD_PATH = {
  [ROLES.STUDENT]: "/dashboard",
  [ROLES.FACULTY]: "/faculty/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
};

export function deriveYearFromSemester(sem) {
  const num = Number(sem);
  if (!num || isNaN(num)) return 1;
  return Math.ceil(num / 2);
}

export function formatSemesterLabel(sem) {
  const num = Number(sem);
  return SEMESTER_LABELS[num] || `Semester ${num}`;
}
