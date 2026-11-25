import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  GraduationCap,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  X,
  Library,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import {
  getStudentCurrentCourses,
  getStudentPastSemesters,
} from "../api/subjects";
import { useAuth } from "../context/useAuth";

// Curated high-tech abstract course images matching the dark aesthetic
const COURSE_IMAGES = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
];

// Course card cover images

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [semesterTab, setSemesterTab] = useState("current"); // 'current' | 'past'
  const [selectedPastSemesterKey, setSelectedPastSemesterKey] = useState("all");

  // 1. Fetch current semester courses (Google Classroom workflow)
  const currentCoursesQuery = useQuery({
    queryKey: ["student-current-courses"],
    queryFn: getStudentCurrentCourses,
    select: (res) => res.data.data,
  });

  // 2. Fetch past semester archived courses & cross-semester reference resources
  const pastSemestersQuery = useQuery({
    queryKey: ["student-past-semesters"],
    queryFn: getStudentPastSemesters,
    select: (res) => res.data.data,
  });

  // Calculate student year label
  const yearName = useMemo(() => {
    const y = user?.year || 1;
    if (y === 1) return "Freshman Year (Year 1)";
    if (y === 2) return "Sophomore Year (Year 2)";
    if (y === 3) return "Junior Year (Year 3)";
    return "Senior Year (Year 4)";
  }, [user]);

  // Current session info & courses
  const currentSessionData = currentCoursesQuery.data;
  const isCurrentSemesterPending = currentSessionData?.isPendingEnrollment;

  const currentCoursesList = useMemo(() => {
    if (currentSessionData && Array.isArray(currentSessionData.courses)) {
      return currentSessionData.courses;
    }
    return [];
  }, [currentSessionData]);

  // Past Semesters list (historical enrollments + eligible cross-semester references)
  const pastSemestersList = useMemo(() => {
    return pastSemestersQuery.data || [];
  }, [pastSemestersQuery.data]);

  // Filtered Current Courses
  const filteredCurrentCourses = useMemo(() => {
    return currentCoursesList.filter((course) => {
      const name = course.name || course.subject?.name || course.subjectName || "";
      const code = course.code || course.subject?.code || course.subjectCode || "";
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.toLowerCase().includes(query) || code.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [currentCoursesList, searchQuery]);

  // Filtered Past Semester Courses
  const filteredPastSemesters = useMemo(() => {
    return pastSemestersList
      .filter((sem) => {
        if (selectedPastSemesterKey === "all") return true;
        return String(sem.semesterNumber) === selectedPastSemesterKey;
      })
      .map((sem) => ({
        ...sem,
        courses: (sem.courses || []).filter((c) => {
          const query = searchQuery.toLowerCase().trim();
          if (!query) return true;
          const name = c.name || c.subjectName || "";
          const code = c.code || c.subjectCode || "";
          return name.toLowerCase().includes(query) || code.toLowerCase().includes(query);
        }),
      }));
  }, [pastSemestersList, selectedPastSemesterKey, searchQuery]);

  // Open course handler
  const handleOpenCourse = (subjectId, isArchived = false, semesterNum = null, isReference = false) => {
    if (!subjectId) return;
    let url = `/subjects/${subjectId}/topics`;
    if (isArchived) {
      url += `?archived=true&semester=${semesterNum || ""}`;
    } else if (isReference) {
      url += `?reference=true&semester=${semesterNum || ""}`;
    }
    navigate(url);
  };

  return (
    <AppLayout
      title="Student Course Library"
      subtitle={`${user?.department || "Computer Science"} • ${yearName}`}
      fullWidth
    >
      <div className="space-y-8">
        {/* Academic Stats Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Enrolled Courses
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
              {currentCoursesList.length}
            </p>
            <p className="text-xs text-[#10B981] mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Current Semester Active</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Academic Year
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#FF3D9A]/15 text-[#FF3D9A] flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
              Year {user?.year || 1}
            </p>
            <p className="text-xs text-[#A4ADBA] mt-1 font-medium">
              {user?.department || "Engineering"} Stream
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Archived Semesters
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                <Library className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
              {pastSemestersList.length}
            </p>
            <p className="text-xs text-[#A4ADBA] mt-1 font-medium">
              Past curricula archived
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Campus MIS
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#191E28] text-[#75D7FF] flex items-center justify-center border border-[#292F3B]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-mono font-bold text-[#F5F3EF] tracking-tight truncate">
              {user?.mis || "IIITP-STUDENT"}
            </p>
            <p className="text-xs text-[#A4ADBA] mt-1 font-medium">
              Verified Student Account
            </p>
          </div>
        </div>

        {/* Pending Enrollment Warning (if current semester not yet finalized by Admin) */}
        {isCurrentSemesterPending && (
          <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-xs sm:text-sm flex items-start gap-3 shadow-lg">
            <Clock className="w-5 h-5 flex-shrink-0 text-[#F59E0B] mt-0.5" />
            <div>
              <p className="font-bold text-sm text-[#F5F3EF]">
                Semester Enrollment Pending Confirmation
              </p>
              <p className="text-[#A4ADBA] mt-0.5 text-xs leading-relaxed">
                The administration has scheduled the new academic session. Course offerings are currently being assigned to faculty. Showing baseline curriculum preview below.
              </p>
            </div>
          </div>
        )}

        {/* Search, Tabs & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2 rounded-2xl bg-[#11141B] border border-[#292F3B]">
          {/* Semester Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#191E28] border border-[#292F3B]">
            <button
              onClick={() => setSemesterTab("current")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                semesterTab === "current"
                  ? "bg-[#75D7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                  : "text-[#A4ADBA] hover:text-[#F5F3EF]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Current Semester</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#08090D]/20">
                {currentCoursesList.length}
              </span>
            </button>

            <button
              onClick={() => setSemesterTab("past")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                semesterTab === "past"
                  ? "bg-[#75D7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                  : "text-[#A4ADBA] hover:text-[#F5F3EF]"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Archived Semesters</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#08090D]/20">
                {pastSemestersList.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by course code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs sm:text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 text-[#A4ADBA] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Past Semester Filter Dropdown */}
            {semesterTab === "past" && pastSemestersList.length > 0 && (
              <select
                value={selectedPastSemesterKey}
                onChange={(e) => setSelectedPastSemesterKey(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
              >
                <option value="all">All Semesters</option>
                {pastSemestersList.map((sem) => (
                  <option key={sem.semesterNumber} value={String(sem.semesterNumber)}>
                    Semester {sem.semesterNumber}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* CURRENT SEMESTER COURSES TAB VIEW */}
        {/* ============================================================== */}
        {semesterTab === "current" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F5F3EF] tracking-tight">
                  Current Course Enrolment
                </h3>
                <p className="text-xs text-[#A4ADBA] mt-0.5">
                  Select a course to view recorded video lectures, topic notes, and participate in Q&A
                </p>
              </div>
            </div>

            {filteredCurrentCourses.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#F5F3EF]">No Matching Courses Found</h4>
                <p className="text-xs text-[#A4ADBA] max-w-sm mx-auto">
                  {searchQuery
                    ? `No courses matching "${searchQuery}". Try searching by another keyword or code.`
                    : "No course enrollments found for the current semester. Please consult your academic coordinator."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCurrentCourses.map((course, idx) => {
                  const subjectId = course._id || course.subjectId || course.subject?._id;
                  const code = course.code || course.subject?.code || course.subjectCode || "COURSE";
                  const name = course.name || course.subject?.name || course.subjectName || "Subject Offering";
                  const instructor = course.facultyName || course.faculty?.name || "Faculty Instructor";
                  const coverImage = COURSE_IMAGES[idx % COURSE_IMAGES.length];
                  const dept = course.department || course.subject?.department || user?.department || "CSE";

                  return (
                    <motion.div
                      key={subjectId || idx}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="group rounded-2xl bg-[#11141B] border border-[#292F3B] hover:border-[#75D7FF]/40 overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-200 cursor-pointer"
                      onClick={() => handleOpenCourse(subjectId, false)}
                    >
                      {/* Course Image Header */}
                      <div className="relative aspect-[16/9] bg-[#191E28] overflow-hidden">
                        <img
                          src={coverImage}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#11141B] via-transparent to-transparent opacity-90" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#08090D]/85 backdrop-blur-md text-[#75D7FF] border border-[#75D7FF]/30">
                            {code}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#A4ADBA]">
                            {dept}
                          </span>
                          <h4 className="text-base font-bold text-[#F5F3EF] group-hover:text-[#75D7FF] transition-colors truncate">
                            {name}
                          </h4>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between text-xs text-[#A4ADBA] pt-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#75D7FF] text-[10px] font-bold">
                              {instructor.charAt(0)}
                            </div>
                            <span className="truncate font-medium">{instructor}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-bold border border-[#10B981]/30">
                            {course.status === "pending_enrollment" ? "Pending" : "Enrolled"}
                          </span>
                        </div>

                        {/* Card Action Button */}
                        <div className="pt-3 border-t border-[#292F3B]/60 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#A4ADBA] group-hover:text-[#F5F3EF] transition-colors">
                            View Course Lectures
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-[#191E28] group-hover:bg-[#75D7FF] text-[#75D7FF] group-hover:text-[#08090D] flex items-center justify-center transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ARCHIVED PAST SEMESTERS TAB VIEW */}
        {/* ============================================================== */}
        {semesterTab === "past" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F5F3EF] tracking-tight">
                Archived Course Semesters
              </h3>
              <p className="text-xs text-[#A4ADBA] mt-0.5">
                Permanent read-only access to previously completed subjects, modules, and video sessions
              </p>
            </div>

            {filteredPastSemesters.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#F5F3EF]">No Archived Semesters Found</h4>
                <p className="text-xs text-[#A4ADBA] max-w-sm mx-auto">
                  You do not have completed semesters archived in the system yet. As you progress, previous courses will appear here.
                </p>
              </div>
            ) : (
              filteredPastSemesters.map((sem) => (
                <div key={sem.semesterNumber} className="space-y-4">
                  {/* Semester Section Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#292F3B]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#FBBF24]">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#F5F3EF]">
                          Semester {sem.semesterNumber} • {sem.academicYear || "Completed"}
                        </h4>
                        <span className="text-[11px] text-[#A4ADBA]">
                          {sem.courses?.length || 0} Archived Courses
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(sem.courses || []).map((course, cIdx) => (
                      <div
                        key={course._id || cIdx}
                        onClick={() =>
                          handleOpenCourse(
                            course._id || course.subjectId,
                            !course.isReferenceResource,
                            sem.semesterNumber,
                            course.isReferenceResource
                          )
                        }
                        className={`p-4 rounded-2xl bg-[#11141B] hover:bg-[#151922] border cursor-pointer shadow-lg transition-all group flex flex-col justify-between space-y-3 ${
                          course.isReferenceResource
                            ? "border-[#292F3B] hover:border-[#75D7FF]/40"
                            : "border-[#292F3B] hover:border-[#F59E0B]/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                                course.isReferenceResource
                                  ? "text-[#75D7FF] bg-[#75D7FF]/10 border border-[#75D7FF]/20"
                                  : "text-[#FBBF24] bg-[#F59E0B]/10 border border-[#F59E0B]/20"
                              }`}
                            >
                              {course.code || "SUB"}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                course.isReferenceResource
                                  ? "bg-[#75D7FF]/10 text-[#75D7FF]"
                                  : "bg-[#F59E0B]/10 text-[#FBBF24]"
                              }`}
                            >
                              {course.isReferenceResource ? "Reference Resource" : "Archived Course"}
                            </span>
                          </div>
                          <h5
                            className={`text-sm font-semibold transition-colors truncate ${
                              course.isReferenceResource
                                ? "text-[#F5F3EF] group-hover:text-[#75D7FF]"
                                : "text-[#F5F3EF] group-hover:text-[#FBBF24]"
                            }`}
                          >
                            {course.name}
                          </h5>
                          <p className="text-xs text-[#A4ADBA] mt-1">
                            Instructor: {course.facultyName || "Academic Faculty"}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#292F3B]/50 flex items-center justify-between text-xs">
                          <span className="text-[#A4ADBA] group-hover:text-[#F5F3EF]">
                            {course.isReferenceResource ? "Explore Reference Lectures" : "Review Lectures"}
                          </span>
                          <ArrowRight
                            className={`w-4 h-4 text-[#A4ADBA] group-hover:translate-x-0.5 transition-all ${
                              course.isReferenceResource
                                ? "group-hover:text-[#75D7FF]"
                                : "group-hover:text-[#FBBF24]"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
