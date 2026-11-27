import { AcademicSession } from "../models/AcademicSession.js";
import { ApiError } from "./ApiError.js";
/**
 * Centralized Academic Year and Semester Configuration for AcadPro
 */

export const ACTIVE_ACADEMIC_YEAR = "2026-2027";
export const ALLOWED_ACADEMIC_YEARS = ["2026-2027"];

export const ACTIVE_SEMESTERS = [1, 3, 5, 7];

export const TERM_CONFIG = {
  ODD: {
    term: "ODD",
    name: "Autumn / Odd Term",
    semesters: [1, 3, 5, 7],
  },
  EVEN: {
    term: "EVEN",
    name: "Spring / Even Term",
    semesters: [2, 4, 6, 8],
  },
};

export const TERM_OPTIONS = [
  { value: "ODD", label: "Autumn Term — Odd Semesters (1, 3, 5, 7)", semesters: [1, 3, 5, 7] },
  { value: "EVEN", label: "Spring Term — Even Semesters (2, 4, 6, 8)", semesters: [2, 4, 6, 8] },
];

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


/**
 * Validates whether the given academic year is allowed for active academic operations.
 */
export function isValidAcademicYear(year) {
  if (!year || typeof year !== "string") return false;
  const match = /^(\d{4})-(\d{4})$/.exec(year.trim());
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

/**
 * Validates whether the given semester number is an active allowed semester.
 */
export function isValidActiveSemester(sem) {
  const num = Number(sem);
  return ACTIVE_SEMESTERS.includes(num);
}

/**
 * Derives the undergraduate study year from a semester number.
 * e.g. Sem 1 -> Year 1, Sem 3 -> Year 2, Sem 5 -> Year 3, Sem 7 -> Year 4.
 */
export function deriveYearFromSemester(sem) {
  const num = Number(sem);
  if (!num || isNaN(num) || num < 1 || num > 8) return 1;
  return Math.ceil(num / 2);
}

/**
 * Formats a semester number into its standard display label.
 */
export function formatSemesterLabel(sem) {
  const num = Number(sem);
  return SEMESTER_LABELS[num] || `Semester ${num}`;
}

export async function requireActiveTerm(year, semester) {
  const term = await AcademicSession.findOne();
  if (!term) throw new ApiError(409, "Configure the academic session first.");
  if (year !== term.academicYear) throw new ApiError(400, "Active academic year is " + term.academicYear);
  if (!term.activeSemesters.includes(semester)) throw new ApiError(400, "Active semester offerings: " + term.activeSemesters.join(", "));
}
