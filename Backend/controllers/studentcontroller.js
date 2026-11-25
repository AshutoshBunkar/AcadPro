import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Student } from "../models/Student.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { Semester } from "../models/Semester.js";
import { Subject } from "../models/Subject.js";
import { Topic } from "../models/Topic.js";
import { Lecture } from "../models/Lecture.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { ACTIVE_ACADEMIC_YEAR } from "../utils/academicConfig.js";

// Sign Up Logic
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, mis, year, semester, department } = req.body;

  if (
    [name, email, password, mis, department].some(
      (field) => typeof field !== "string" || field.trim() === ""
    ) ||
    (semester === undefined && year === undefined)
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (!email.endsWith("@iiitp.ac.in")) {
    throw new ApiError(403, "Only IIIT Pune college emails are allowed to register");
  }
  const existedStudent = await Student.findOne({
    $or: [{ mis }, { email }],
  });

  if (existedStudent) {
    throw new ApiError(409, "Student with this email or MIS already exists");
  }

  // Derive semester and year safely
  let currentSemester;
  let yearNum;

  if (semester !== undefined && semester !== null) {
    currentSemester = Number(semester);
    if (isNaN(currentSemester) || currentSemester < 1 || currentSemester > 8) {
      throw new ApiError(400, "Semester must be between 1 and 8");
    }
    yearNum = Math.ceil(currentSemester / 2);
  } else {
    yearNum = Number(year);
    if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
      throw new ApiError(400, "Year must be between 1 and 4");
    }
    currentSemester = (yearNum - 1) * 2 + 1;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const studentUser = await Student.create({
    name,
    email,
    password: hashedPassword,
    mis,
    year: yearNum,
    currentSemester,
    department,
  });

  if (!studentUser) {
    throw new ApiError(500, "Something went wrong while registering the student");
  }

  const createdStudent = await Student.findById(studentUser._id).select("-password");

  return res
    .status(201)
    .json(new ApiResponse(201, createdStudent, "Student registered successfully"));
});

// Login Logic
const LoginStudent = asyncHandler(async (req, res) => {
  const { email, password, mis } = req.body;

  if (!password || (!email && !mis)) {
    throw new ApiError(400, "Password and either email or mis are required");
  }

  const student = await Student.findOne({
    $or: [{ email }, { mis }],
  });

  if (!student) {
    throw new ApiError(404, "Student does not exist");
  }

  const isPasswordValid = await student.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid student credentials");
  }

  const token = jwt.sign(
    { id: student._id, role: "student" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const loggedInStudent = await Student.findById(student._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { student: loggedInStudent, token },
        "Student logged in successfully"
      )
    );
});

// Get Profile Logic
const getStudentProfile = asyncHandler(async (req, res) => {
  const studentId = req.user.id;

  const student = await Student.findById(studentId).select("-password");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student profile fetched successfully"));
});

// Get Student Current Semester Courses (Google Classroom style)
const getStudentCurrentCourses = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const student = await Student.findById(studentId);

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const studentSemester = student.currentSemester || ((student.year - 1) * 2 + 1);
  const studentYear = student.year || Math.ceil(studentSemester / 2);
  const studentDept = student.department;

  // Determine active semester info for student's current standing
  let semesterDoc = await Semester.findOne({
    semesterNumber: studentSemester,
  }).sort({ academicYear: -1 });

  const currentSession = await AcademicSession.findOne();
  const academicYear = ACTIVE_ACADEMIC_YEAR;

  // 1. Fetch student's explicit enrollments for their active semester in AY 2026-2027
  const enrollments = await StudentEnrollment.find({
    studentId,
    academicYear: ACTIVE_ACADEMIC_YEAR,
    semester: studentSemester,
    status: { $in: ["enrolled", "active"] },
  })
    .populate("subjectId")
    .populate("facultyId", "name email designation avatar");

  // Validate curriculum compliance: subject must exist, be permitted in studentSemester, and match department
  const validEnrollments = enrollments.filter((enr) => {
    if (!enr.subjectId) return false;
    const allowed = enr.subjectId.allowedSemesters || [];
    if (allowed.length > 0 && !allowed.includes(studentSemester)) return false;
    if (studentDept && enr.subjectId.department && enr.subjectId.department !== studentDept) {
      return false;
    }
    return true;
  });

  let activeCourses = [];
  let isPendingEnrollment = false;
  let validationMessage = "";

  if (validEnrollments.length > 0) {
    // Student has valid explicit enrollments
    activeCourses = await Promise.all(
      validEnrollments.map(async (enr) => {
        const sub = enr.subjectId;
        const topics = await Topic.find({ subjectId: sub._id });
        const topicIds = topics.map((t) => t._id);
        const lectureCount = await Lecture.countDocuments({ topicId: { $in: topicIds } });

        // Resolve faculty: from enrollment or teaching assignment
        let resolvedFaculty = enr.facultyId;
        if (!resolvedFaculty) {
          const ta = await TeachingAssignment.findOne({
            subjectId: sub._id,
            semester: studentSemester,
            status: { $ne: "archived" },
          }).populate("facultyId", "name email designation avatar");
          resolvedFaculty = ta?.facultyId || null;
        }

        return {
          _id: sub._id,
          enrollmentId: enr._id,
          subjectId: sub._id,
          code: sub.code,
          name: sub.name,
          subjectCode: sub.code,
          subjectName: sub.name,
          department: sub.department,
          year: sub.year,
          semester: studentSemester,
          academicYear: enr.academicYear || academicYear,
          section: enr.section || "A",
          facultyName: resolvedFaculty?.name || "Faculty Instructor",
          faculty: resolvedFaculty || null,
          subject: sub,
          status: enr.status || "enrolled",
          isCurrent: true,
          topicsCount: topics.length,
          lecturesCount: lectureCount,
        };
      })
    );
  } else {
    // No explicit enrollments yet — look up institution curriculum for student's department and semester
    const curriculumSubjects = await Subject.find({
      department: studentDept,
      allowedSemesters: studentSemester,
    });

    if (curriculumSubjects.length > 0) {
      isPendingEnrollment = true;
      validationMessage = `Enrollment confirmation pending for Semester ${studentSemester}. Showing curriculum catalogue preview.`;

      activeCourses = await Promise.all(
        curriculumSubjects.map(async (sub) => {
          const topics = await Topic.find({ subjectId: sub._id });
          const topicIds = topics.map((t) => t._id);
          const lectureCount = await Lecture.countDocuments({ topicId: { $in: topicIds } });

          const ta = await TeachingAssignment.findOne({
            subjectId: sub._id,
            semester: studentSemester,
            status: { $ne: "archived" },
          }).populate("facultyId", "name email designation avatar");

          return {
            _id: sub._id,
            enrollmentId: null,
            subjectId: sub._id,
            code: sub.code,
            name: sub.name,
            subjectCode: sub.code,
            subjectName: sub.name,
            department: sub.department,
            year: sub.year,
            semester: studentSemester,
            academicYear,
            section: "A",
            facultyName: ta?.facultyId?.name || "Faculty Instructor",
            faculty: ta?.facultyId || null,
            subject: sub,
            status: "pending_enrollment",
            isCurrent: true,
            topicsCount: topics.length,
            lecturesCount: lectureCount,
          };
        })
      );
    } else {
      isPendingEnrollment = true;
      validationMessage = `No curriculum courses configured for ${studentDept} Semester ${studentSemester}. Contact academic administration.`;
    }
  }

  const totalEnrolledInSemester = await StudentEnrollment.countDocuments({
    semester: studentSemester,
    status: { $in: ["enrolled", "active"] },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isAvailable: activeCourses.length > 0,
        isPendingEnrollment,
        validationMessage,
        session: {
          academicYear,
          semester: studentSemester,
          name: semesterDoc?.name || `Academic Year ${academicYear} - Semester ${studentSemester}`,
          status: semesterDoc?.status || "active",
          enrolledCount: totalEnrolledInSemester,
        },
        courses: activeCourses.filter(Boolean),
      },
      "Current semester courses fetched successfully"
    )
  );
});

// Get Student Past Semesters & Archived Courses
const getStudentPastSemesters = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const student = await Student.findById(studentId);

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const studentSemester = student.currentSemester || ((student.year - 1) * 2 + 1);

  // Find all enrollments that belong to strictly earlier semesters or prior academic years
  const pastEnrollments = await StudentEnrollment.find({
    studentId,
    $or: [
      { academicYear: { $ne: ACTIVE_ACADEMIC_YEAR } },
      { semester: { $lt: studentSemester } },
    ],
  })
    .populate("subjectId")
    .populate("facultyId", "name email designation avatar")
    .sort({ academicYear: -1, semester: -1 });

  // Group enrollments and cross-semester references by semester number
  const grouped = {};
  const enrolledSubjectIds = new Set();

  for (const enr of pastEnrollments) {
    if (!enr.subjectId) continue;
    const sub = enr.subjectId;
    enrolledSubjectIds.add(sub._id.toString());

    const semNum = enr.semester;
    const key = `sem_${semNum}`;
    if (!grouped[key]) {
      grouped[key] = {
        semesterNumber: semNum,
        academicYear: enr.academicYear,
        name: `Semester ${semNum} • Academic Archive`,
        isArchived: true,
        isReadOnly: true,
        courses: [],
      };
    }

    const topics = await Topic.find({ subjectId: sub._id });
    const topicIds = topics.map((t) => t._id);
    const lectureCount = await Lecture.countDocuments({ topicId: { $in: topicIds } });

    grouped[key].courses.push({
      _id: sub._id,
      enrollmentId: enr._id,
      subjectId: sub._id,
      code: sub.code,
      name: sub.name,
      subjectCode: sub.code,
      subjectName: sub.name,
      department: sub.department,
      year: sub.year,
      semester: enr.semester,
      academicYear: enr.academicYear,
      section: enr.section || "A",
      facultyName: enr.facultyId?.name || "Faculty Instructor",
      faculty: enr.facultyId || null,
      subject: sub,
      isArchived: true,
      isReadOnly: true,
      isReferenceResource: false,
      topicsCount: topics.length,
      lecturesCount: lectureCount,
    });
  }

  // Cross-Semester Reference Resources (C >= S Rule):
  // Eligible lower-semester subjects within student's department (S < C) that student was not personally enrolled in
  const lowerSemSubjects = await Subject.find({
    department: student.department,
    _id: { $nin: Array.from(enrolledSubjectIds) },
  }).sort({ code: 1 });

  for (const sub of lowerSemSubjects) {
    const allowed = sub.allowedSemesters || [];
    const sourceSem = allowed.length > 0 ? Math.min(...allowed) : (sub.year ? (sub.year - 1) * 2 + 1 : 1);

    // Eligible only when student's current semester C strictly exceeds source semester S (C > S)
    if (studentSemester <= sourceSem) continue;

    const key = `sem_${sourceSem}`;
    if (!grouped[key]) {
      grouped[key] = {
        semesterNumber: sourceSem,
        academicYear: "Foundational",
        name: `Semester ${sourceSem} • Foundational Reference`,
        isArchived: true,
        isReadOnly: true,
        courses: [],
      };
    }

    const topics = await Topic.find({ subjectId: sub._id });
    const topicIds = topics.map((t) => t._id);
    const lectureCount = await Lecture.countDocuments({ topicId: { $in: topicIds } });

    let ta = await TeachingAssignment.findOne({
      subjectId: sub._id,
      status: { $ne: "archived" },
    }).populate("facultyId", "name email designation avatar");

    grouped[key].courses.push({
      _id: sub._id,
      subjectId: sub._id,
      code: sub.code,
      name: sub.name,
      subjectCode: sub.code,
      subjectName: sub.name,
      department: sub.department,
      year: sub.year,
      semester: sourceSem,
      academicYear: ta?.academicYear || "Foundational Curriculum",
      section: "A",
      facultyName: ta?.facultyId?.name || "Department Faculty",
      faculty: ta?.facultyId || null,
      subject: sub,
      isArchived: true,
      isReadOnly: true,
      isReferenceResource: true,
      topicsCount: topics.length,
      lecturesCount: lectureCount,
    });
  }

  // Sort groups by semester number in descending order (e.g. Sem 4, Sem 3, Sem 2, Sem 1)
  const pastSemesters = Object.values(grouped).sort(
    (a, b) => b.semesterNumber - a.semesterNumber
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      pastSemesters,
      "Past semesters and archived courses fetched successfully"
    )
  );
});// Get specific Course Space details for a student (with strict access control)
const getStudentCourse = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { subjectId } = req.params;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const studentSemester = student.currentSemester || ((student.year - 1) * 2 + 1);

  // Verify student is enrolled or course is in their active curriculum
  const enrollment = await StudentEnrollment.findOne({
    studentId,
    subjectId,
  })
    .populate("subjectId")
    .populate("facultyId", "name email designation avatar")
    .sort({ createdAt: -1 });

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ApiError(404, "Course subject not found");
  }

  const isAllowedInCurriculum =
    subject.department === student.department &&
    (subject.allowedSemesters || []).includes(studentSemester);

  // Cross-Semester Visibility Rule: A student in current semester C is eligible
  // to view reference resources of a lower-semester subject S (same department) when C >= S.
  const subjectMinSemester = Array.isArray(subject.allowedSemesters) && subject.allowedSemesters.length > 0
    ? Math.min(...subject.allowedSemesters)
    : (subject.year ? (subject.year - 1) * 2 + 1 : 1);

  const isCrossSemesterEligible =
    subject.department === student.department &&
    studentSemester >= subjectMinSemester;

  if (!enrollment && !isAllowedInCurriculum && !isCrossSemesterEligible) {
    throw new ApiError(
      403,
      "Access denied: You are not authorized to access this course."
    );
  }

  // Resolve faculty
  let resolvedFaculty = enrollment?.facultyId || null;
  if (!resolvedFaculty) {
    const ta = await TeachingAssignment.findOne({
      subjectId,
      status: { $ne: "archived" },
    }).populate("facultyId", "name email designation avatar");
    resolvedFaculty = ta?.facultyId || null;
  }

  const isCurrent = Boolean(
    enrollment &&
    enrollment.semester === studentSemester &&
    enrollment.academicYear === ACTIVE_ACADEMIC_YEAR &&
    ["enrolled", "active"].includes(enrollment.status)
  );

  const topics = await Topic.find({ subjectId }).sort({ order: 1 });
  const topicIds = topics.map((t) => t._id);
  const lectures = await Lecture.find({ topicId: { $in: topicIds } })
    .populate("uploadedBy", "name email designation")
    .sort({ createdAt: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        enrollment: enrollment || null,
        subject,
        faculty: resolvedFaculty,
        facultyName: resolvedFaculty?.name || "Faculty Instructor",
        code: subject.code,
        name: subject.name,
        academicYear: enrollment?.academicYear || ACTIVE_ACADEMIC_YEAR,
        semester: enrollment?.semester || subjectMinSemester,
        section: enrollment?.section || "A",
        isCurrent,
        isReadOnly: !isCurrent,
        isReferenceResource: !enrollment && isCrossSemesterEligible,
        topics,
        lectures,
      },
      "Course space fetched successfully"
    )
  );
});

// Get Lower-Semester Accessible Reference Course Resources (C >= S Rule)
const getStudentAccessibleResources = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const student = await Student.findById(studentId);

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const studentSemester = student.currentSemester || ((student.year - 1) * 2 + 1);
  const studentDept = student.department;

  // Find all subjects in student's department whose source semester S satisfies studentSemester >= S
  // But EXCLUDE courses that are currently active in the student's current-semester enrollment
  // and courses that are in the student's personal enrolled past history.
  const allEligibleSubjects = await Subject.find({
    department: studentDept,
  }).sort({ code: 1 });

  // Get student's enrolled subject IDs (current or past)
  const studentEnrollments = await StudentEnrollment.find({
    studentId,
  }).select("subjectId status semester academicYear");

  const enrolledSubjectIdSet = new Set(
    studentEnrollments.map((e) => e.subjectId.toString())
  );

  const referenceCourses = [];

  for (const sub of allEligibleSubjects) {
    const allowed = sub.allowedSemesters || [];
    const minSem = allowed.length > 0 ? Math.min(...allowed) : (sub.year ? (sub.year - 1) * 2 + 1 : 1);

    // Rule: studentSemester >= minSem AND studentSemester is strictly greater than minSem
    // (since studentSemester == minSem belongs in Current Course Content or curriculum preview, not lower-semester reference)
    if (studentSemester < minSem) continue;

    // If student was personally enrolled in this course in the past, it belongs in Archived Courses!
    if (enrolledSubjectIdSet.has(sub._id.toString())) {
      continue;
    }

    // Check if this course has topics or lectures available
    const topics = await Topic.find({ subjectId: sub._id });
    const topicIds = topics.map((t) => t._id);
    const lectureCount = await Lecture.countDocuments({ topicId: { $in: topicIds } });

    // Resolve instructor
    const ta = await TeachingAssignment.findOne({
      subjectId: sub._id,
      status: { $ne: "archived" },
    }).populate("facultyId", "name email designation avatar");

    referenceCourses.push({
      _id: sub._id,
      subjectId: sub._id,
      code: sub.code,
      name: sub.name,
      department: sub.department,
      year: sub.year,
      sourceSemester: minSem,
      allowedSemesters: sub.allowedSemesters,
      facultyName: ta?.facultyId?.name || "Faculty Instructor",
      faculty: ta?.facultyId || null,
      subject: sub,
      isReferenceResource: true,
      isReadOnly: true,
      topicsCount: topics.length,
      lecturesCount: lectureCount,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      referenceCourses,
      "Lower-semester accessible reference resources fetched successfully"
    )
  );
});

export {
  signup,
  LoginStudent,
  getStudentProfile,
  getStudentCurrentCourses,
  getStudentPastSemesters,
  getStudentCourse,
  getStudentAccessibleResources,
};
