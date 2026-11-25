import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Upload,
  Plus,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  X,
  Users,
  Download,
  Calendar,
  Filter,
  AlertCircle,
  Loader2,
  Video,
  Play,
  Clock,
  Inbox,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import { getFacultyProfile } from "../api/auth";
import {
  getFacultyCourseRoster,
  exportFacultyCourseRoster,
  requestSubject,
  getFacultySubjectRequests,
} from "../api/faculty";
import { getTopics, createTopic } from "../api/topics";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/axios";


// Abstract course covers matching Jet Black + Deep Charcoal palette
const SUBJECT_COVERS = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
];

export default function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState("all");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("all");

  // Modals state
  const [selectedSubjectForTopics, setSelectedSubjectForTopics] = useState(null);
  const [selectedOfferingForRoster, setSelectedOfferingForRoster] = useState(null);
  const [showRequestSubjectModal, setShowRequestSubjectModal] = useState(false);

  // New Topic Form state
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicOrder, setNewTopicOrder] = useState("");
  const [topicError, setTopicError] = useState("");
  const [topicSuccess, setTopicSuccess] = useState("");

  // Request Subject form state
  const [requestedSubjectName, setRequestedSubjectName] = useState("");
  const [requestedSubjectCode, setRequestedSubjectCode] = useState("");
  const [requestedSubjectDepartment, setRequestedSubjectDepartment] = useState("CSE");
  const [requestedSubjectSemester, setRequestedSubjectSemester] = useState(3);
  const [requestedSubjectSection, setRequestedSubjectSection] = useState("A");
  const [requestedSubjectCredits, setRequestedSubjectCredits] = useState(3);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [activeCourseTab, setActiveCourseTab] = useState("offerings"); // "offerings" | "requests"

  // Fetch Faculty Profile & Teaching Assignments across all semesters
  const profileQuery = useQuery({
    queryKey: ["faculty-profile"],
    queryFn: getFacultyProfile,
    select: (res) => res.data.data,
  });

  // Fetch Faculty's Submitted Course Requests
  const requestsQuery = useQuery({
    queryKey: ["faculty-subject-requests"],
    queryFn: getFacultySubjectRequests,
    select: (res) => res.data.data,
  });

  const facultyRequestsList = useMemo(() => requestsQuery.data || [], [requestsQuery.data]);

  const facultyData = profileQuery.data?.faculty || user;
  const assignments = useMemo(() => profileQuery.data?.assignments || [], [profileQuery.data]);

  // Derived filter options from assignments
  const availableYears = useMemo(() => {
    return Array.from(new Set(assignments.map((a) => a.academicYear).filter(Boolean)));
  }, [assignments]);

  const availableSemesters = useMemo(() => {
    return Array.from(
      new Set(assignments.map((a) => a.semester).filter((s) => s !== undefined && s !== null))
    ).sort((a, b) => a - b);
  }, [assignments]);

  // Total enrolled students across all assigned offerings
  const totalEnrolledAcrossAllCourses = useMemo(() => {
    return assignments.reduce((acc, a) => acc + (a.enrolledCount || 0), 0);
  }, [assignments]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const sub = a.subjectId || {};
      const name = sub.name || "";
      const code = sub.code || "";
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
      const matchesYear = selectedYearFilter === "all" || a.academicYear === selectedYearFilter;
      const matchesSem =
        selectedSemesterFilter === "all" || String(a.semester) === selectedSemesterFilter;

      return matchesSearch && matchesYear && matchesSem;
    });
  }, [assignments, searchQuery, selectedYearFilter, selectedSemesterFilter]);

  // Topics Query for selected subject modal
  const topicsQuery = useQuery({
    queryKey: ["topics", selectedSubjectForTopics?._id],
    queryFn: () => getTopics(selectedSubjectForTopics._id),
    select: (res) => res.data.data,
    enabled: Boolean(selectedSubjectForTopics?._id),
  });

  const topicsList = topicsQuery.data || [];

  // Create Topic Mutation
  const createTopicMutation = useMutation({
    mutationFn: (payload) => createTopic(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", selectedSubjectForTopics?._id],
      });
      setNewTopicName("");
      setNewTopicOrder("");
      setTopicSuccess("Topic created successfully!");
      setTopicError("");
      setTimeout(() => setTopicSuccess(""), 3000);
    },
    onError: (err) => {
      setTopicError(
        err?.response?.data?.message ||
          "Failed to create topic. Make sure you are assigned to this subject."
      );
    },
  });

  const handleCreateTopic = (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicOrder) {
      setTopicError("Topic name and order number are required.");
      return;
    }
    createTopicMutation.mutate({
      subjectId: selectedSubjectForTopics._id,
      name: newTopicName.trim(),
      order: Number(newTopicOrder),
    });
  };

  const requestSubjectMutation = useMutation({
    mutationFn: (data) => requestSubject(data),
    onSuccess: () => {
      setRequestSubmitted(true);
      setRequestError("");
      queryClient.invalidateQueries({ queryKey: ["faculty-subject-requests"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-profile"] });
      setTimeout(() => {
        setRequestSubmitted(false);
        setShowRequestSubjectModal(false);
        setRequestedSubjectName("");
        setRequestedSubjectCode("");
        setRequestedSubjectSemester(3);
        setRequestedSubjectSection("A");
        setRequestedSubjectCredits(3);
      }, 2500);
    },
    onError: (err) => {
      setRequestError(getErrorMessage(err));
    },
  });

  const handleRequestSubject = (e) => {
    e.preventDefault();
    setRequestError("");
    if (!requestedSubjectCode.trim() || !requestedSubjectName.trim()) {
      setRequestError("Course code and subject title are required.");
      return;
    }
    requestSubjectMutation.mutate({
      code: requestedSubjectCode.trim(),
      name: requestedSubjectName.trim(),
      department: requestedSubjectDepartment,
      semester: Number(requestedSubjectSemester),
      section: requestedSubjectSection,
      credits: Number(requestedSubjectCredits),
    });
  };


  return (
    <AppLayout
      title="Faculty Instructor Portal"
      subtitle={`${facultyData?.designation || "Faculty Member"} • ${facultyData?.department || "Computer Science"}`}
      fullWidth
    >
      <div className="space-y-8">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Teaching Allocations
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
              {assignments.length}
            </p>
            <p className="text-xs text-[#10B981] mt-1 font-medium">
              Multi-Semester Course Offerings
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Total Enrolled Scholars
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
              {totalEnrolledAcrossAllCourses}
            </p>
            <p className="text-xs text-[#A4ADBA] mt-1 font-medium">
              Active Across All Assigned Sections
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Department Division
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#FF3D9A]/15 text-[#FF3D9A] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#F5F3EF] tracking-tight truncate">
              {facultyData?.department || "CSE"}
            </p>
            <p className="text-xs text-[#A4ADBA] mt-1 font-medium">Academic Faculty Faculty Unit</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-2">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Uploaded Lectures
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight">
                {profileQuery.data?.stats?.lecturesUploaded ?? 0}
              </p>
              <p className="text-xs text-[#A4ADBA] mt-1 font-medium">
                Instructional recordings published
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[#292F3B]/50">
              <button
                onClick={() => navigate("/faculty/lectures")}
                className="py-1.5 px-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#75D7FF] border border-[#75D7FF]/30 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>View All</span>
              </button>
              <button
                onClick={() => navigate("/faculty/upload")}
                className="py-1.5 px-2 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-[#75D7FF]/20 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search, Semester Filtering & Actions Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 max-w-sm flex items-center">
              <Search className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assigned courses by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs sm:text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
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

            {/* Academic Year Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#75D7FF] hidden sm:block flex-shrink-0" />
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
              >
                <option value="all">All Academic Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    AY {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#75D7FF] hidden sm:block flex-shrink-0" />
              <select
                value={selectedSemesterFilter}
                onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
              >
                <option value="all">All Semesters</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/faculty/lectures")}
              className="px-3.5 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#75D7FF] border border-[#75D7FF]/30 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>My Lectures</span>
            </button>
            <button
              onClick={() => setShowRequestSubjectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF3D9A]" />
              <span>Request Subject</span>
            </button>
            <button
              onClick={() => navigate("/faculty/upload")}
              className="px-4 py-2 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#75D7FF]/20 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Lecture</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Assigned Course Offerings vs My Course Requests */}
        <div className="flex items-center gap-2 border-b border-[#292F3B] pb-2">
          <button
            onClick={() => setActiveCourseTab("offerings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeCourseTab === "offerings"
                ? "bg-[#75D7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                : "text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assigned Courses ({filteredAssignments.length})</span>
          </button>
          <button
            onClick={() => setActiveCourseTab("requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeCourseTab === "requests"
                ? "bg-[#75D7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                : "text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-[#191E28]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Course Requests ({facultyRequestsList.length})</span>
            {facultyRequestsList.filter((r) => r.status === "pending").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FF3D9A] text-white">
                {facultyRequestsList.filter((r) => r.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {activeCourseTab === "requests" ? (
          /* ============================================================== */
          /* MY COURSE REQUESTS VIEW */
          /* ============================================================== */
          <div className="p-5 sm:p-6 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F5F3EF] tracking-tight">
                  My Course Addition Requests
                </h3>
                <p className="text-xs text-[#A4ADBA] mt-0.5">
                  Track the review and approval status of your requested courses with institutional administration
                </p>
              </div>
              <button
                onClick={() => setShowRequestSubjectModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#75D7FF]/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Request</span>
              </button>
            </div>

            {facultyRequestsList.length === 0 ? (
              <div className="py-12 text-center text-[#A4ADBA] space-y-3">
                <Inbox className="w-10 h-10 mx-auto text-[#A4ADBA]/50" />
                <p className="text-sm font-semibold text-[#F5F3EF]">No Course Requests Submitted Yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  Need to introduce a new curriculum subject or teach an offering this term? Click "New Request" above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#191E28]/60 text-[#A4ADBA] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl font-bold">Course</th>
                      <th className="py-3 px-4 font-bold">Term & Section</th>
                      <th className="py-3 px-4 font-bold">Department</th>
                      <th className="py-3 px-4 font-bold">Requested Date</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 rounded-r-xl font-bold">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292F3B]/50">
                    {facultyRequestsList.map((r) => {
                      const isPending = r.status === "pending";
                      const isApproved = r.status === "approved";
                      const isRejected = r.status === "rejected";

                      return (
                        <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-[#75D7FF]">
                              {r.code}
                            </span>
                            <div className="text-xs font-semibold text-[#F5F3EF] mt-0.5">
                              {r.name}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#F5F3EF]">
                            Semester {r.semester || 1} • Sec {r.section || "A"}
                          </td>
                          <td className="py-3 px-4 text-[#A4ADBA]">
                            {r.department}
                          </td>
                          <td className="py-3 px-4 text-[#A4ADBA]">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
                                <Clock className="w-3 h-3" />
                                <span>Pending Review</span>
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approved</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F43F5E]/15 text-[#FDA4AF] border border-[#F43F5E]/30">
                                <X className="w-3 h-3" />
                                <span>Declined</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#A4ADBA] italic">
                            {r.adminRemarks || (isApproved ? "Approved into active curriculum offering" : "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* ASSIGNED SUBJECTS GRID VIEW */
          /* ============================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F5F3EF] tracking-tight">
                  My Assigned Courses & Curriculum
                </h3>
                <p className="text-xs text-[#A4ADBA] mt-0.5">
                  Review assigned course offerings across semesters, manage syllabus units, and monitor
                  enrolled student rosters
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#11141B] border border-[#292F3B] text-[#75D7FF]">
                {filteredAssignments.length} Course Offerings
              </span>
            </div>

          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#F5F3EF]">No Assigned Courses Found</h4>
              <p className="text-xs text-[#A4ADBA] max-w-sm mx-auto">
                {searchQuery || selectedSemesterFilter !== "all" || selectedYearFilter !== "all"
                  ? "No courses match your selected filter criteria. Try clearing search or resetting semester filters."
                  : "You have not been assigned to any course subjects yet. Contact the academic administrator to map your courses."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((assignment, idx) => {
                const sub = assignment.subjectId || {};
                const coverImage = SUBJECT_COVERS[idx % SUBJECT_COVERS.length];
                const enrolledCount = assignment.enrolledCount ?? 0;

                return (
                  <motion.div
                    key={assignment._id || idx}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="group rounded-2xl bg-[#11141B] border border-[#292F3B] hover:border-[#75D7FF]/40 overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-200"
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-[16/9] bg-[#191E28] overflow-hidden">
                      <img
                        src={coverImage}
                        alt={sub.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11141B] via-transparent to-transparent opacity-90" />

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#08090D]/85 backdrop-blur-md text-[#75D7FF] border border-[#75D7FF]/30">
                          {sub.code || "COURSE"}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-[#08090D]/85 backdrop-blur-md text-[#F5F3EF] border border-[#292F3B]">
                          Sem {assignment.semester}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#A4ADBA]">
                            {sub.department || assignment.department || "CSE"}
                          </span>
                          <span className="text-[10px] text-[#A4ADBA]">/</span>
                          <span className="text-[10px] font-mono font-bold text-[#75D7FF]">
                            AY {assignment.academicYear}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#F5F3EF] group-hover:text-[#75D7FF] transition-colors truncate">
                          {sub.name || "Subject Title"}
                        </h4>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="flex items-center justify-between text-xs text-[#A4ADBA]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>
                            <strong className="text-[#F5F3EF] font-bold">{enrolledCount}</strong>{" "}
                            {enrolledCount === 1 ? "Scholar Enrolled" : "Scholars Enrolled"}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          Active Allocation
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-[#292F3B]/60 grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => setSelectedSubjectForTopics(sub)}
                          className="py-2 px-1.5 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Manage Topics & Units"
                        >
                          <Layers className="w-3 h-3 text-[#75D7FF]" />
                          <span>Topics</span>
                        </button>

                        <button
                          onClick={() =>
                            setSelectedOfferingForRoster({
                              subjectId: sub._id,
                              code: sub.code,
                              name: sub.name,
                              academicYear: assignment.academicYear,
                              semester: assignment.semester,
                              section: assignment.section || "A",
                              enrolledCount,
                            })
                          }
                          className="py-2 px-1.5 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#75D7FF] border border-[#292F3B] hover:border-[#75D7FF]/40 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="View Enrolled Students Roster"
                        >
                          <Users className="w-3 h-3" />
                          <span>Roster</span>
                        </button>

                        <button
                          onClick={() =>
                            navigate(`/faculty/lectures?subjectId=${sub._id}`)
                          }
                          className="py-2 px-1.5 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] hover:border-[#75D7FF]/40 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="View Uploaded Lectures for this course"
                        >
                          <Video className="w-3 h-3 text-[#75D7FF]" />
                          <span>Lectures</span>
                        </button>

                        <button
                          onClick={() =>
                            navigate("/faculty/upload", { state: { subjectId: sub._id } })
                          }
                          className="py-2 px-1.5 rounded-xl bg-[#75D7FF]/15 hover:bg-[#75D7FF]/25 text-[#75D7FF] border border-[#75D7FF]/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Upload Lecture Video"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload</span>
                        </button>
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
        {/* ENROLLED STUDENTS ROSTER MODAL */}
        {/* ============================================================== */}
        <AnimatePresence>
          {selectedOfferingForRoster && (
            <EnrolledStudentsModal
              offering={selectedOfferingForRoster}
              open={Boolean(selectedOfferingForRoster)}
              onClose={() => setSelectedOfferingForRoster(null)}
            />
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* TOPICS MANAGEMENT MODAL FOR SELECTED SUBJECT */}
        {/* ============================================================== */}
        <AnimatePresence>
          {selectedSubjectForTopics && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSubjectForTopics(null)}
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-6 z-10 space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#292F3B]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#75D7FF] px-2 py-0.5 rounded bg-[#75D7FF]/10 border border-[#75D7FF]/20">
                        {selectedSubjectForTopics.code}
                      </span>
                      <span className="text-xs text-[#A4ADBA]">Curriculum Management</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#F5F3EF] mt-1">
                      {selectedSubjectForTopics.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedSubjectForTopics(null)}
                    className="p-1 rounded-lg text-[#A4ADBA] hover:text-white hover:bg-[#191E28] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Create Topic Form */}
                <form
                  onSubmit={handleCreateTopic}
                  className="p-4 rounded-xl bg-[#191E28] border border-[#292F3B] space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#75D7FF] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Curriculum Topic / Unit</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="e.g. Unit 3: Graph Traversal & BFS/DFS"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF]"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Unit Number"
                        value={newTopicOrder}
                        onChange={(e) => setNewTopicOrder(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF]"
                      />
                    </div>
                  </div>

                  {topicError && (
                    <p className="text-xs text-[#F43F5E] flex items-center gap-1">
                      <X className="w-3 h-3" />
                      <span>{topicError}</span>
                    </p>
                  )}
                  {topicSuccess && (
                    <p className="text-xs text-[#10B981] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{topicSuccess}</span>
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={createTopicMutation.isPending}
                      className="px-4 py-1.5 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#75D7FF]/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {createTopicMutation.isPending ? "Adding Topic..." : "Add Topic"}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Published Topics List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#A4ADBA]">
                    Published Units ({topicsList.length})
                  </h4>

                  {topicsQuery.isLoading ? (
                    <div className="py-8 text-center text-xs text-[#A4ADBA]">
                      Loading curriculum topics...
                    </div>
                  ) : topicsList.length === 0 ? (
                    <div className="py-8 text-center rounded-xl bg-[#191E28]/50 border border-[#292F3B] text-xs text-[#A4ADBA]">
                      No topics added yet. Add a new unit using the form above.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {topicsList.map((topic) => (
                        <div
                          key={topic._id}
                          className="p-3 rounded-xl bg-[#191E28] border border-[#292F3B] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center font-mono font-bold text-[11px]">
                              {topic.order}
                            </span>
                            <span className="text-xs font-semibold text-[#F5F3EF]">
                              {topic.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                navigate(`/topics/${topic._id}/lectures`)
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#11141B] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View all video lectures for this unit"
                            >
                              <Play className="w-3 h-3 text-[#75D7FF]" />
                              <span>View Lectures</span>
                            </button>
                            <button
                              onClick={() =>
                                navigate("/faculty/upload", {
                                  state: {
                                    subjectId: selectedSubjectForTopics._id,
                                    topicId: topic._id,
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#75D7FF]/15 hover:bg-[#75D7FF]/25 text-[#75D7FF] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* REQUEST SUBJECT MODAL */}
        {/* ============================================================== */}
        <AnimatePresence>
          {showRequestSubjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRequestSubjectModal(false)}
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-6 z-10 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                  <h4 className="text-base font-bold text-[#F5F3EF]">
                    Request Course Addition
                  </h4>
                  <button
                    onClick={() => setShowRequestSubjectModal(false)}
                    className="p-1 text-[#A4ADBA] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {requestError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs">
                    {requestError}
                  </div>
                )}

                {requestSubmitted ? (
                  <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>Subject request submitted to Admin for semester catalogue review.</span>
                  </div>
                ) : (
                  <form onSubmit={handleRequestSubject} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                          Course Code <span className="text-[#FF3D9A]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CS402"
                          value={requestedSubjectCode}
                          onChange={(e) => setRequestedSubjectCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                          Department <span className="text-[#FF3D9A]">*</span>
                        </label>
                        <select
                          value={requestedSubjectDepartment}
                          onChange={(e) => setRequestedSubjectDepartment(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        >
                          <option value="CSE">Computer Science and Engineering</option>
                          <option value="ECE">Electronics and Communication</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                        Subject Title <span className="text-[#FF3D9A]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cloud Computing & Distributed Systems"
                        value={requestedSubjectName}
                        onChange={(e) => setRequestedSubjectName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                          Target Term
                        </label>
                        <select
                          value={requestedSubjectSemester}
                          onChange={(e) => setRequestedSubjectSemester(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <option key={sem} value={sem}>
                              Sem {sem} (Yr {Math.ceil(sem / 2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                          Section
                        </label>
                        <select
                          value={requestedSubjectSection}
                          onChange={(e) => setRequestedSubjectSection(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        >
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                          Credits
                        </label>
                        <select
                          value={requestedSubjectCredits}
                          onChange={(e) => setRequestedSubjectCredits(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        >
                          <option value={2}>2 Credits</option>
                          <option value={3}>3 Credits</option>
                          <option value={4}>4 Credits</option>
                          <option value={5}>5 Credits</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-[#292F3B]">
                      <button
                        type="button"
                        onClick={() => setShowRequestSubjectModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A4ADBA] hover:text-[#F5F3EF]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={requestSubjectMutation.isPending}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {requestSubjectMutation.isPending && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>{requestSubjectMutation.isPending ? "Submitting..." : "Submit Request"}</span>
                      </button>
                    </div>
                  </form>
                )}

              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

// =====================================================================
// ENROLLED STUDENTS ROSTER MODAL COMPONENT (FEATURE 3)
// =====================================================================
function EnrolledStudentsModal({ offering, open, onClose }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [exporting, setExporting] = useState(false);

  const subjectId = offering?.subjectId;
  const academicYear = offering?.academicYear;
  const semester = offering?.semester;
  const section = offering?.section;

  // Fetch verified roster from backend
  const rosterQuery = useQuery({
    queryKey: [
      "faculty-course-roster",
      subjectId,
      academicYear,
      semester,
      section,
      search,
      statusFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getFacultyCourseRoster(subjectId, {
        academicYear,
        semester,
        section,
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
      }),
    enabled: Boolean(open && subjectId),
    select: (res) => res.data.data,
  });

  const rosterData = rosterQuery.data;
  const students = rosterData?.students || [];
  const stats = rosterData?.stats || {
    totalEnrolled: 0,
    activeCount: 0,
    completedCount: 0,
    droppedCount: 0,
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await exportFacultyCourseRoster(subjectId, {
        academicYear,
        semester,
        section,
        status: statusFilter,
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Roster-${offering.code || "Course"}-Sem${semester}-${academicYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#08090D]/85 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-4xl rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-5 sm:p-6 z-10 space-y-6 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#292F3B] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#75D7FF] px-2.5 py-0.5 rounded-lg bg-[#75D7FF]/10 border border-[#75D7FF]/30">
                {offering.code}
              </span>
              <span className="text-xs font-semibold text-[#A4ADBA]">
                AY {academicYear} • Semester {semester} • Sec {section || "A"}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#F5F3EF] mt-1">
              {offering.name} — Enrolled Student Roster
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || students.length === 0}
              className="px-3.5 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#75D7FF]" />
              <span>{exporting ? "Generating CSV..." : "Export CSV"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#A4ADBA] hover:text-white hover:bg-[#191E28] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
          <div className="p-3.5 rounded-xl bg-[#191E28] border border-[#292F3B]">
            <p className="text-[11px] font-semibold text-[#A4ADBA] uppercase tracking-wider">
              Total Enrolled
            </p>
            <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#F5F3EF] mt-0.5">
              {stats.totalEnrolled}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191E28] border border-[#292F3B]">
            <p className="text-[11px] font-semibold text-[#10B981] uppercase tracking-wider">
              Active Standing
            </p>
            <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#10B981] mt-0.5">
              {stats.activeCount}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191E28] border border-[#292F3B]">
            <p className="text-[11px] font-semibold text-[#75D7FF] uppercase tracking-wider">
              Offering Term
            </p>
            <p className="text-sm sm:text-base font-bold text-[#F5F3EF] mt-1.5">
              Sem {semester} ({academicYear})
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#191E28] border border-[#292F3B]">
            <p className="text-[11px] font-semibold text-[#A4ADBA] uppercase tracking-wider">
              Course Section
            </p>
            <p className="text-sm sm:text-base font-bold text-[#F5F3EF] mt-1.5">
              Section {section || "A"}
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-[#191E28] border border-[#292F3B] flex-shrink-0">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 text-[#A4ADBA] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search enrolled students by name or roll number (MIS)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 p-0.5 text-[#A4ADBA] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#11141B] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
            >
              <option value="active">Active Standing</option>
              <option value="all">All Records</option>
              <option value="completed">Completed / Historical</option>
              <option value="dropped">Dropped / Archived</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split("-");
                setSortBy(by);
                setSortOrder(ord);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#11141B] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="mis-asc">Sort: MIS (Asc)</option>
              <option value="mis-desc">Sort: MIS (Desc)</option>
              <option value="enrolledAt-desc">Sort: Enrolled (Newest)</option>
            </select>
          </div>
        </div>

        {/* Roster Table Content */}
        <div className="flex-1 overflow-y-auto border border-[#292F3B] rounded-xl bg-[#191E28]/40">
          {rosterQuery.isLoading ? (
            <div className="p-12 text-center text-xs text-[#A4ADBA] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#75D7FF]" />
              <span>Loading enrolled students from institutional database...</span>
            </div>
          ) : rosterQuery.isError ? (
            <div className="p-8 text-center text-xs text-[#F43F5E] space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-[#F43F5E]" />
              <p className="font-bold">Failed to load student roster</p>
              <p className="text-[#A4ADBA]">
                {rosterQuery.error?.response?.data?.message ||
                  "Ensure you have teaching permissions for this course offering."}
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#A4ADBA] space-y-2">
              <Users className="w-8 h-8 mx-auto text-[#A4ADBA]/60" />
              <p className="font-bold text-[#F5F3EF]">No Students Enrolled</p>
              <p className="max-w-xs mx-auto">
                {search || statusFilter !== "all"
                  ? "No students match your search or filter criteria."
                  : "No students are currently enrolled in this semester course offering."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#11141B] border-b border-[#292F3B] text-[#A4ADBA] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Scholar</th>
                  <th className="py-3 px-4 font-bold">Roll Number / MIS</th>
                  <th className="py-3 px-4 font-bold">Program & Dept</th>
                  <th className="py-3 px-4 font-bold">Standing</th>
                  <th className="py-3 px-4 font-bold">Section</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Enrolled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292F3B]/50">
                {students.map((student) => {
                  const dateStr = student.enrolledAt
                    ? new Date(student.enrolledAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={student._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#191E28] border border-[#292F3B] text-[#75D7FF] font-bold text-[11px] flex items-center justify-center">
                            {student.name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="font-semibold text-[#F5F3EF]">{student.name}</p>
                            <p className="text-[10px] text-[#A4ADBA]">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#75D7FF]">
                        {student.mis}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#F5F3EF]">
                          {student.program || "B.Tech"}
                        </span>{" "}
                        <span className="text-[#A4ADBA]">({student.department})</span>
                      </td>
                      <td className="py-3 px-4 text-[#A4ADBA]">
                        Year {student.year} • Sem {student.semester}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#F5F3EF]">
                        {student.section || "A"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            student.status === "completed"
                              ? "bg-[#75D7FF]/15 text-[#75D7FF] border-[#75D7FF]/30"
                              : student.status === "dropped" || student.status === "archived"
                              ? "bg-[#F43F5E]/15 text-[#FDA4AF] border-[#F43F5E]/30"
                              : "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#A4ADBA]">{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between text-xs text-[#A4ADBA] flex-shrink-0">
          <span>
            Showing <strong className="text-[#F5F3EF]">{students.length}</strong> scholars in this
            offering
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] font-semibold transition-colors cursor-pointer"
          >
            Close Roster
          </button>
        </div>
      </motion.div>
    </div>
  );
}
