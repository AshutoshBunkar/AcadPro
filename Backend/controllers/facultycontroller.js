import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deliverSession } from "../utils/browserSession.js";
import { sessionToken } from "../utils/accountAccess.js";
import { Faculty } from "../models/Faculty.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Subject } from "../models/Subject.js";
import { Topic } from "../models/Topic.js";
import { Semester } from "../models/Semester.js";
import { Lecture } from "../models/Lecture.js";
import { Comment } from "../models/Comments.js";
import { AcademicSession } from "../models/AcademicSession.js";
import { Admin } from "../models/Admin.js";
import { Notification } from "../models/Notification.js";
import { SubjectRequest } from "../models/SubjectRequest.js";
import { AuditLog } from "../models/AuditLog.js";
import { ACTIVE_ACADEMIC_YEAR } from "../utils/academicConfig.js";


function assignedEnrollment(assignment) {
  return { $or: [{ teachingAssignmentId: assignment._id },
    { teachingAssignmentId: null, facultyId: assignment.facultyId }] };
}

// Login Logic
const loginFaculty = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!password || !email) {
    throw new ApiError(400, "Password and email are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const faculty = await Faculty.findOne({ email: normalizedEmail });

  if (!faculty) {
    throw new ApiError(404, "Faculty does not exist");
  }

  const isPasswordValid = await faculty.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid faculty credentials");
  }

  const token = sessionToken(faculty, "faculty");

  const loggedInFaculty = await Faculty.findById(faculty._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { faculty: loggedInFaculty, ...deliverSession(req, res, token) },
        "Faculty logged in successfully"
      )
    );
});

// Get Faculty Profile & Multi-Semester Teaching Assignments
const getFacultyProfile = asyncHandler(async (req, res) => {
  const facultyId = req.user.id || req.user._id;

  const faculty = await Faculty.findById(facultyId).select("-password");

  if (!faculty) {
    throw new ApiError(404, "Faculty not found");
  }

  const assignmentsRaw = await TeachingAssignment.find({ facultyId })
    .populate("subjectId")
    .populate("semesterId")
    .sort({ academicYear: -1, semester: 1 });

  // Enrich each assignment with its accurate semester-wise enrolled student count
  const assignments = await Promise.all(
    assignmentsRaw.map(async (a) => {
      const sub = a.subjectId;
      if (!sub) return null;

      const enrolledCount = await StudentEnrollment.countDocuments({
        subjectId: sub._id,
        academicYear: a.academicYear,
        semester: a.semester,
        ...(a.section ? { section: a.section } : {}),
        ...assignedEnrollment(a),
        status: { $in: ["enrolled", "active"] },
      });

      const totalCount = await StudentEnrollment.countDocuments({
        subjectId: sub._id,
        academicYear: a.academicYear,
        semester: a.semester,
        ...(a.section ? { section: a.section } : {}),
        ...assignedEnrollment(a),
      });

      return {
        ...a.toObject(),
        enrolledCount,
        totalEnrolled: totalCount,
      };
    })
  );

  const cleanAssignments = assignments.filter(Boolean);

  // Active assignments belong to current academic year 2026-2027 and are not archived
  const currentSession = await AcademicSession.findOne();
  const inTerm = a => a.status !== "archived" && a.academicYear === currentSession?.academicYear && currentSession.activeSemesters.includes(a.semester);
  const activeAssignments = cleanAssignments.filter(
    inTerm
  );
  const pastAssignments = cleanAssignments.filter(
    a => !inTerm(a)
  );



  // Compute real engagement stats
  const lecturesUploaded = await Lecture.countDocuments({ uploadedBy: facultyId });
  const facultyLectureIds = await Lecture.find({ uploadedBy: facultyId }).distinct("_id");
  const totalComments = await Comment.countDocuments({ lectureId: { $in: facultyLectureIds } });
  const answeredComments = await Comment.countDocuments({
    lectureId: { $in: facultyLectureIds },
    "replies.0": { $exists: true },
  });
  const responseRate = totalComments > 0 ? Math.round((answeredComments / totalComments) * 100) : 98;

  // Distinct subjects taught across all semesters
  const distinctSubjectIds = new Set(
    cleanAssignments.map((a) => a.subjectId?._id?.toString()).filter(Boolean)
  );

  const stats = {
    lecturesUploaded,
    responseRate,
    activeSubjects: distinctSubjectIds.size,
    totalAssignments: cleanAssignments.length,
    activeAssignmentsCount: activeAssignments.length,
    totalComments,
    answeredComments,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        faculty,
        assignments: cleanAssignments,
        activeAssignments,
        pastAssignments,
        currentSession,
        stats,
      },
      "Faculty profile fetched successfully"
    )
  );
});

// Get Faculty Assigned Courses (Offerings filterable by academic year, semester, section, search)
const getFacultyAssignedCourses = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { academicYear, semester, section, search } = req.query;

  const filter = { facultyId };
  if (academicYear && academicYear !== "all") {
    filter.academicYear = academicYear.trim();
  }
  if (semester && semester !== "all") {
    filter.semester = Number(semester);
  }
  if (section && section !== "all") {
    filter.section = section.trim().toUpperCase();
  }

  const assignments = await TeachingAssignment.find(filter)
    .populate("subjectId")
    .populate("semesterId")
    .sort({ academicYear: -1, semester: 1 });

  const offerings = await Promise.all(
    assignments.map(async (a) => {
      const sub = a.subjectId;
      if (!sub) return null;

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesCode = sub.code?.toLowerCase().includes(q);
        const matchesName = sub.name?.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return null;
      }

      const enrolledCount = await StudentEnrollment.countDocuments({
        subjectId: sub._id,
        academicYear: a.academicYear,
        semester: a.semester,
        ...(a.section ? { section: a.section } : {}),
        ...assignedEnrollment(a),
        status: { $in: ["enrolled", "active"] },
      });

      const totalStudentsAllStatuses = await StudentEnrollment.countDocuments({
        subjectId: sub._id,
        academicYear: a.academicYear,
        semester: a.semester,
        ...(a.section ? { section: a.section } : {}),
        ...assignedEnrollment(a),
      });

      const topics = await Topic.find({ subjectId: sub._id });
      const topicIds = topics.map((t) => t._id);
      const lectureCount = await Lecture.countDocuments({ offeringId: a._id });

      return {
        _id: a._id,
        assignmentId: a._id,
        subjectId: sub._id,
        code: sub.code,
        name: sub.name,
        department: a.department || sub.department,
        program: a.program || "B.Tech",
        year: sub.year,
        allowedSemesters: sub.allowedSemesters,
        academicYear: a.academicYear,
        semester: a.semester,
        section: a.section || "A",
        status: a.status,
        semesterName: a.semesterId?.name || `AY ${a.academicYear} - Semester ${a.semester}`,
        enrolledCount,
        totalEnrolled: totalStudentsAllStatuses,
        topicsCount: topics.length,
        lecturesCount: lectureCount,
      };
    })
  );

  const cleanOfferings = offerings.filter(Boolean);

  return res.status(200).json(
    new ApiResponse(200, cleanOfferings, "Faculty assigned courses retrieved successfully")
  );
});

// Get Roster of Enrolled Students for an assigned course offering
const getFacultyCourseRoster = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { subjectId } = req.params;
  const { academicYear, semester, section, search, status, sortBy = "name", sortOrder = "asc" } = req.query;

  // 1. Authorize: verify faculty is assigned to this course
  const assignmentQuery = { facultyId, subjectId };
  if (academicYear && academicYear !== "all") assignmentQuery.academicYear = academicYear.trim();
  if (semester && semester !== "all") assignmentQuery.semester = Number(semester);
  if (section && section !== "all") assignmentQuery.section = section.trim().toUpperCase();

  const assignment = await TeachingAssignment.findOne(assignmentQuery)
    .populate("subjectId")
    .populate("semesterId");

  if (!assignment) {
    throw new ApiError(
      403,
      "Access denied: You are not authorized to view the enrollment roster for this course."
    );
  }

  const sub = assignment.subjectId;
  const targetYear = assignment.academicYear;
  const targetSem = assignment.semester;
  const targetSection = assignment.section;

  // 2. Fetch enrollment records for this specific offering
  const enrollmentFilter = {
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
  };
  if (targetSection) {
    enrollmentFilter.section = targetSection;
  }
  if (status && status !== "all") {
    if (status === "active" || status === "enrolled") {
      enrollmentFilter.status = { $in: ["enrolled", "active"] };
    } else {
      enrollmentFilter.status = status;
    }
  } else if (!status) {
    // Default active roster query: exclude inactive, completed, or dropped enrollments
    enrollmentFilter.status = { $in: ["enrolled", "active"] };
  }

  const enrollments = await StudentEnrollment.find(enrollmentFilter)
    .populate("studentId", "name email mis department year currentSemester avatar phone")
    .sort({ createdAt: -1 });

  // 3. Compute accurate statistics
  const totalEnrolled = await StudentEnrollment.countDocuments({
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
    ...(targetSection ? { section: targetSection } : {}),
  });

  const activeCount = await StudentEnrollment.countDocuments({
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
    ...(targetSection ? { section: targetSection } : {}),
    status: { $in: ["enrolled", "active"] },
  });

  const completedCount = await StudentEnrollment.countDocuments({
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
    ...(targetSection ? { section: targetSection } : {}),
    status: "completed",
  });

  const droppedCount = await StudentEnrollment.countDocuments({
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
    ...(targetSection ? { section: targetSection } : {}),
    status: { $in: ["dropped", "archived"] },
  });

  // 4. Format roster items
  let roster = enrollments
    .map((e) => {
      const student = e.studentId;
      if (!student) return null;
      return {
        _id: e._id,
        enrollmentId: e._id,
        studentId: student._id,
        name: student.name,
        email: student.email,
        mis: student.mis,
        department: e.department || student.department,
        program: e.program || "B.Tech",
        year: student.year,
        semester: e.semester,
        section: e.section || "A",
        status: e.status || "enrolled",
        enrolledAt: e.enrolledAt || e.createdAt,
      };
    })
    .filter(Boolean);

  // 5. Apply search if query present
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    roster = roster.filter(
      (st) =>
        st.name?.toLowerCase().includes(q) ||
        st.mis?.toLowerCase().includes(q) ||
        st.email?.toLowerCase().includes(q)
    );
  }

  // 6. Sort
  roster.sort((a, b) => {
    let valA = a[sortBy] || "";
    let valB = b[sortBy] || "";
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortOrder === "desc" ? 1 : -1;
    if (valA > valB) return sortOrder === "desc" ? -1 : 1;
    return 0;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        course: {
          _id: sub._id,
          code: sub.code,
          name: sub.name,
          department: sub.department,
          academicYear: targetYear,
          semester: targetSem,
          section: targetSection,
          semesterName: assignment.semesterId?.name || `AY ${targetYear} - Semester ${targetSem}`,
        },
        stats: {
          totalEnrolled,
          activeCount,
          completedCount,
          droppedCount,
        },
        students: roster,
      },
      "Course enrollment roster fetched successfully"
    )
  );
});

// Export Course Roster to CSV
const exportFacultyCourseRoster = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { subjectId } = req.params;
  const { academicYear, semester, section, status } = req.query;

  const assignmentQuery = { facultyId, subjectId };
  if (academicYear && academicYear !== "all") assignmentQuery.academicYear = academicYear.trim();
  if (semester && semester !== "all") assignmentQuery.semester = Number(semester);
  if (section && section !== "all") assignmentQuery.section = section.trim().toUpperCase();

  const assignment = await TeachingAssignment.findOne(assignmentQuery).populate("subjectId");

  if (!assignment) {
    throw new ApiError(
      403,
      "Access denied: You are not authorized to export records for this course offering."
    );
  }

  const sub = assignment.subjectId;
  const targetYear = assignment.academicYear;
  const targetSem = assignment.semester;
  const targetSection = assignment.section;

  const exportFilter = {
    subjectId,
    academicYear: targetYear,
    semester: targetSem,
    ...assignedEnrollment(assignment),
    ...(targetSection ? { section: targetSection } : {}),
  };

  if (status && status !== "all") {
    if (status === "active" || status === "enrolled") {
      exportFilter.status = { $in: ["enrolled", "active"] };
    } else {
      exportFilter.status = status;
    }
  } else if (!status) {
    // Default to active roster records if not specified
    exportFilter.status = { $in: ["enrolled", "active"] };
  }

  const enrollments = await StudentEnrollment.find(exportFilter)
    .populate("studentId", "name email mis department year currentSemester");

  // CSV generation
  const headers = ["Roll Number / MIS", "Student Name", "Email", "Department", "Academic Year", "Semester", "Section", "Enrollment Status", "Enrolled Date"];
  const rows = enrollments.map((e) => {
    const s = e.studentId || {};
    const dateStr = e.enrolledAt ? new Date(e.enrolledAt).toISOString().split("T")[0] : "";
    return [
      `"${s.mis || ""}"`,
      `"${s.name || ""}"`,
      `"${s.email || ""}"`,
      `"${e.department || s.department || ""}"`,
      `"${e.academicYear}"`,
      `"${e.semester}"`,
      `"${e.section || "A"}"`,
      `"${e.status || "enrolled"}"`,
      `"${dateStr}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename = `roster-${sub.code || "course"}-sem${targetSem}-${targetYear}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
});

// Update Faculty Profile
const updateFacultyProfile = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { name, designation, specialization, phone, officeLocation, officeHours, avatar, department } = req.body;

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, "Faculty not found");
  }

  // Input validation
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ApiError(400, "Full name cannot be empty");
    }
    if (trimmedName.length > 100) {
      throw new ApiError(400, "Full name must be under 100 characters");
    }
    faculty.name = trimmedName;
  }

  if (designation !== undefined) {
    const trimmed = designation.trim();
    if (trimmed.length > 100) throw new ApiError(400, "Designation must be under 100 characters");
    faculty.designation = trimmed;
  }

  if (department !== undefined) {
    const trimmed = department.trim();
    if (trimmed.length > 100) throw new ApiError(400, "Department must be under 100 characters");
    faculty.department = trimmed;
  }

  if (specialization !== undefined) {
    const trimmed = specialization.trim();
    if (trimmed.length > 150) throw new ApiError(400, "Specialization must be under 150 characters");
    faculty.specialization = trimmed;
  }

  if (phone !== undefined) {
    const trimmed = phone.trim();
    if (trimmed.length > 25) throw new ApiError(400, "Phone number must be under 25 characters");
    faculty.phone = trimmed;
  }

  if (officeLocation !== undefined) {
    const trimmed = officeLocation.trim();
    if (trimmed.length > 120) throw new ApiError(400, "Office location must be under 120 characters");
    faculty.officeLocation = trimmed;
  }

  if (officeHours !== undefined) {
    const trimmed = officeHours.trim();
    if (trimmed.length > 150) throw new ApiError(400, "Office hours must be under 150 characters");
    faculty.officeHours = trimmed;
  }

  if (avatar !== undefined) {
    faculty.avatar = avatar.trim();
  }

  await faculty.save();

  const updatedFaculty = await Faculty.findById(facultyId).select("-password");

  return res.status(200).json(
    new ApiResponse(200, updatedFaculty, "Faculty profile updated successfully")
  );
});

// Change Faculty Password
const changeFacultyPassword = asyncHandler(async (req, res) => {
  const facultyId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, "Faculty not found");
  }

  const isPasswordValid = await faculty.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  faculty.sessionVersion = (faculty.sessionVersion || 0) + 1;

  faculty.password = newPassword;
  await faculty.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Password changed successfully")
  );
});

// Request Subject (Faculty to Admin Notification & Request Creation)
const requestSubject = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const { code, name, department, semester, academicYear, section, credits } = req.body;

  if (!code || !name) {
    throw new ApiError(400, "Course code and subject title are required");
  }

  const normalizedCode = code.trim().toUpperCase();
  const normalizedName = name.trim();
  const resolvedDept = (department || "CSE").trim();
  const targetSemester = Number(semester) || 1;

  if (targetSemester < 1 || targetSemester > 8) {
    throw new ApiError(400, "Semester must be a valid term between 1 and 8");
  }

  const targetYear = Math.ceil(targetSemester / 2);
  const targetAcademicYear = (academicYear || (await AcademicSession.findOne())?.academicYear || ACTIVE_ACADEMIC_YEAR).trim();
  const targetSection = (section || "A").trim().toUpperCase();
  const targetCredits = Number(credits) > 0 ? Number(credits) : 3;

  const faculty = await Faculty.findById(facultyId);
  if (!faculty) {
    throw new ApiError(404, "Faculty member not found");
  }

  // Check if subject exists in canonical catalogue
  const existingSubject = await Subject.findOne({ code: normalizedCode });
  if (existingSubject) {
    // If subject exists, check if faculty is ALREADY assigned to teach it in this exact term/offering
    const existingAssignment = await TeachingAssignment.findOne({
      facultyId,
      subjectId: existingSubject._id,
      academicYear: targetAcademicYear,
      semester: targetSemester,
      section: targetSection,
      status: { $ne: "archived" },
    });

    if (existingAssignment) {
      throw new ApiError(
        409,
        `You are already actively assigned to teach ${normalizedCode} (${existingSubject.name}) for AY ${targetAcademicYear} Semester ${targetSemester} Section ${targetSection}.`
      );
    }
  }

  const result = await mongoose.connection.transaction(async session => {
    const key = { code: normalizedCode, academicYear: targetAcademicYear, semester: targetSemester, section: targetSection, status: "pending" };
    const existing = await SubjectRequest.findOne(key).session(session);
    if (existing) {
      if (String(existing.facultyId) !== String(facultyId)) throw new ApiError(409, "An offering request is already pending.");
      return { subjectRequest: existing, created: false };
    }
    const [subjectRequest] = await SubjectRequest.create([{ ...key, facultyId, name: normalizedName, department: resolvedDept,
      year: targetYear, credits: targetCredits, program: "B.Tech" }], { session });

    // Notify all Admins in the institution
    const admins = await Admin.find({}).session(session);
    if (admins.length > 0) {
      await Notification.create(
        admins.map((admin) => ({
          recipient: admin._id,
          recipientRole: "admin",
          title: `Course Request: ${normalizedCode}`,
          message: `Prof. ${faculty.name} (${faculty.department || resolvedDept}) has requested a course offering: "${normalizedName}" (${normalizedCode}) for Semester ${targetSemester} Section ${targetSection} (${resolvedDept}).`,
          type: "assignment",
          link: "/admin/dashboard",
        })), { session }
      );
    }

    // Record audit log
    await AuditLog.create([{
      action: "SUBJECT_REQUESTED",
      category: "CURRICULUM",
      details: `Faculty ${faculty.name} (${faculty.email}) requested course offering: ${normalizedCode} - ${normalizedName} (Sem ${targetSemester}, Sec ${targetSection}, ${resolvedDept})`,
      actor: faculty.name,
      actorEmail: faculty.email,
      ipAddress: req.ip || "127.0.0.1",
      severity: "INFO",
      status: "SUCCESS",
    }], { session });
    return { subjectRequest, created: true };
  });

  return res.status(result.created ? 201 : 200).json(
    new ApiResponse(
      201,
      result.subjectRequest,
      `Subject request for ${normalizedCode} (Semester ${targetSemester}, Section ${targetSection}) submitted successfully to the Administrator.`
    )
  );
});

const getFacultySubjectRequests = asyncHandler(async (req, res) => {
  const facultyId = req.user._id || req.user.id;
  const requests = await SubjectRequest.find({ facultyId }).sort({ createdAt: -1 });
  return res.status(200).json(
    new ApiResponse(200, requests, "Subject requests retrieved successfully")
  );
});

export {
  loginFaculty,
  getFacultyProfile,
  getFacultyAssignedCourses,
  getFacultyCourseRoster,
  exportFacultyCourseRoster,
  updateFacultyProfile,
  changeFacultyPassword,
  requestSubject,
  getFacultySubjectRequests,
};

