import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Play,
  Upload,
  Search,
  Filter,
  Clock,
  MessageSquare,
  AlertCircle,
  Trash2,
  Calendar,
  BookOpen,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import ErrorState from "../components/common/ErrorState";
import { getMyLectures, deleteLecture } from "../api/lectures";
import { getFacultyProfile } from "../api/auth";
import { formatDuration, formatDate } from "../utils/format";

export default function FacultyLecturesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialSubject = searchParams.get("subjectId") || "all";

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [qaFilter, setQaFilter] = useState("all"); // 'all', 'has_questions', 'unanswered'

  // Delete modal state
  const [lectureToDelete, setLectureToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Fetch Faculty Profile to get assigned subjects list for filtering
  const profileQuery = useQuery({
    queryKey: ["faculty-profile"],
    queryFn: getFacultyProfile,
    select: (res) => res.data.data,
  });

  const assignments = profileQuery.data?.assignments || [];

  // Available subjects for dropdown
  const assignedSubjects = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const sub = a.subjectId;
      if (sub && sub._id && !map.has(sub._id)) {
        map.set(sub._id, {
          _id: sub._id,
          name: sub.name,
          code: sub.code,
        });
      }
    });
    return Array.from(map.values());
  }, [assignments]);

  // Fetch all uploaded lectures for this faculty
  const lecturesQuery = useQuery({
    queryKey: ["faculty-lectures", selectedSubject],
    queryFn: () =>
      getMyLectures({
        subjectId: selectedSubject !== "all" ? selectedSubject : undefined,
      }),
    select: (res) => res.data.data,
  });

  const allLectures = lecturesQuery.data || [];

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (lectureId) => deleteLecture(lectureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-lectures"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-profile"] });
      setLectureToDelete(null);
      setDeleteError("");
      setToastMessage("Lecture successfully deleted.");
      setTimeout(() => setToastMessage(""), 4000);
    },
    onError: (err) => {
      setDeleteError(
        err?.response?.data?.message || "Failed to delete lecture. Please try again."
      );
    },
  });

  // Filtered lectures based on client-side search and Q&A status
  const filteredLectures = useMemo(() => {
    return allLectures.filter((lec) => {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = !q || lec.title?.toLowerCase().includes(q);
      const descMatch = !q || lec.description?.toLowerCase().includes(q);
      const topicMatch = !q || lec.topicId?.name?.toLowerCase().includes(q);
      const subjectMatch =
        !q ||
        lec.topicId?.subjectId?.name?.toLowerCase().includes(q) ||
        lec.topicId?.subjectId?.code?.toLowerCase().includes(q);

      const matchesSearch = titleMatch || descMatch || topicMatch || subjectMatch;

      let matchesQa = true;
      if (qaFilter === "has_questions") {
        matchesQa = (lec.commentsCount || 0) > 0;
      } else if (qaFilter === "unanswered") {
        matchesQa = (lec.unansweredCommentsCount || 0) > 0;
      }

      return matchesSearch && matchesQa;
    });
  }, [allLectures, searchQuery, qaFilter]);

  // Analytics aggregates
  const stats = useMemo(() => {
    const totalLectures = allLectures.length;
    const totalDurationSeconds = allLectures.reduce(
      (acc, curr) => acc + (curr.duration || 0),
      0
    );
    const totalComments = allLectures.reduce(
      (acc, curr) => acc + (curr.commentsCount || 0),
      0
    );
    const totalUnanswered = allLectures.reduce(
      (acc, curr) => acc + (curr.unansweredCommentsCount || 0),
      0
    );

    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);

    return {
      totalLectures,
      durationStr:
        hours > 0 ? `${hours}h ${minutes}m` : `${minutes} mins`,
      totalComments,
      totalUnanswered,
    };
  }, [allLectures]);

  const confirmDelete = () => {
    if (!lectureToDelete) return;
    deleteMutation.mutate(lectureToDelete._id);
  };

  return (
    <AppLayout
      title="My Uploaded Lectures"
      subtitle="Manage your instructional recordings, review student questions, and provide official academic answers"
    >
      <div className="space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-semibold text-[#10B981] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="p-1 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Published Lectures
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#F5F3EF]">
              {lecturesQuery.isLoading ? "..." : stats.totalLectures}
            </p>
            <p className="text-[11px] text-[#A4ADBA] mt-0.5">
              Across all assigned modules
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Instructional Content
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#FF3D9A]/15 text-[#FF3D9A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#F5F3EF]">
              {lecturesQuery.isLoading ? "..." : stats.durationStr}
            </p>
            <p className="text-[11px] text-[#A4ADBA] mt-0.5">
              Total video streaming time
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Student Discussions
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#75D7FF]/15 text-[#75D7FF] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#F5F3EF]">
              {lecturesQuery.isLoading ? "..." : stats.totalComments}
            </p>
            <p className="text-[11px] text-[#A4ADBA] mt-0.5">
              Questions & doubts submitted
            </p>
          </div>

          <div
            onClick={() => setQaFilter(stats.totalUnanswered > 0 ? "unanswered" : "all")}
            className={`p-4 rounded-2xl bg-[#11141B] border transition-all cursor-pointer shadow-xl ${
              stats.totalUnanswered > 0
                ? "border-[#FF3D9A]/50 hover:border-[#FF3D9A]"
                : "border-[#292F3B]"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#A4ADBA] mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Awaiting Response
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  stats.totalUnanswered > 0
                    ? "bg-[#FF3D9A]/20 text-[#FF3D9A] animate-pulse"
                    : "bg-[#10B981]/15 text-[#10B981]"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl font-bold ${
                stats.totalUnanswered > 0 ? "text-[#FF3D9A]" : "text-[#10B981]"
              }`}
            >
              {lecturesQuery.isLoading ? "..." : stats.totalUnanswered}
            </p>
            <p className="text-[11px] text-[#A4ADBA] mt-0.5">
              {stats.totalUnanswered > 0
                ? "Click to filter pending questions"
                : "All doubts answered"}
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 max-w-sm flex items-center">
              <Search className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search lectures by title, topic, or subject..."
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

            {/* Course / Subject Filter */}
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#75D7FF] hidden sm:block flex-shrink-0" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
              >
                <option value="all">All Assigned Courses</option>
                {assignedSubjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.code ? `${sub.code} - ${sub.name}` : sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Q&A Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#75D7FF] hidden sm:block flex-shrink-0" />
              <select
                value={qaFilter}
                onChange={(e) => setQaFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
              >
                <option value="all">All Discussions</option>
                <option value="has_questions">Has Student Questions</option>
                <option value="unanswered">Unanswered Doubts Only</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => navigate("/faculty/upload")}
            className="px-4 py-2 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#75D7FF]/20 transition-all cursor-pointer flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Lecture</span>
          </button>
        </div>

        {/* Loading State */}
        {lecturesQuery.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[#11141B] border border-[#292F3B] animate-pulse p-4 flex flex-col justify-between"
              >
                <div className="aspect-video rounded-xl bg-[#191E28] mb-3" />
                <div className="h-4 bg-[#191E28] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#191E28] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {lecturesQuery.isError && (
          <ErrorState
            error={lecturesQuery.error}
            onRetry={lecturesQuery.refetch}
          />
        )}

        {/* Empty State */}
        {lecturesQuery.isSuccess && filteredLectures.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F3EF]">
                {searchQuery || selectedSubject !== "all" || qaFilter !== "all"
                  ? "No Lectures Match Filter Criteria"
                  : "No Lectures Uploaded Yet"}
              </h3>
              <p className="text-xs text-[#A4ADBA] max-w-md mx-auto mt-1 leading-relaxed">
                {searchQuery || selectedSubject !== "all" || qaFilter !== "all"
                  ? "Try adjusting your search terms or clearing course and discussion filters."
                  : "You haven't uploaded any video recordings yet. Publish your first lecture recording to begin streaming course curriculum."}
              </p>
            </div>
            {searchQuery || selectedSubject !== "all" || qaFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("all");
                  setQaFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-xs font-semibold text-[#F5F3EF] border border-[#292F3B] transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => navigate("/faculty/upload")}
                className="px-5 py-2.5 rounded-xl bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-[#75D7FF]/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First Lecture Recording</span>
              </button>
            )}
          </div>
        )}

        {/* Lectures Grid */}
        {lecturesQuery.isSuccess && filteredLectures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lecture) => {
              const subjectInfo = lecture.topicId?.subjectId;
              const topicName = lecture.topicId?.name || "Curriculum Unit";
              const unanswered = lecture.unansweredCommentsCount || 0;
              const totalComments = lecture.commentsCount || 0;

              return (
                <motion.div
                  key={lecture._id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="group rounded-2xl bg-[#11141B] border border-[#292F3B] hover:border-[#75D7FF]/40 overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-200"
                >
                  <div>
                    {/* Thumbnail & Video Badges */}
                    <div
                      onClick={() => navigate(`/lectures/${lecture._id}`)}
                      className="relative aspect-video bg-[#191E28] overflow-hidden cursor-pointer"
                    >
                      {lecture.thumbnailUrl ? (
                        <img
                          src={lecture.thumbnailUrl}
                          alt={lecture.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#11141B] via-transparent to-transparent opacity-80" />

                      {/* Play overlay button on hover */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-[#08090D]/80 backdrop-blur-md border border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF] shadow-xl group-hover:scale-110 group-hover:bg-[#75D7FF] group-hover:text-[#08090D] transition-all">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Course / Subject Code Pill */}
                      {subjectInfo?.code && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#08090D]/85 backdrop-blur-md text-[#75D7FF] border border-[#75D7FF]/30">
                          {subjectInfo.code}
                        </div>
                      )}

                      {/* Duration Pill */}
                      {lecture.duration > 0 && (
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#08090D]/85 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-[#F5F3EF] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#75D7FF]" />
                          <span>{formatDuration(lecture.duration)}</span>
                        </div>
                      )}
                    </div>

                    {/* Lecture Meta & Details */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#A4ADBA] truncate">
                          {subjectInfo?.name || "Assigned Course"}
                        </span>
                        <span className="text-[10px] text-[#A4ADBA]">•</span>
                        <span className="text-[10px] font-semibold text-[#75D7FF] truncate">
                          {topicName}
                        </span>
                      </div>

                      <h4
                        onClick={() => navigate(`/lectures/${lecture._id}`)}
                        className="text-sm font-bold text-[#F5F3EF] group-hover:text-[#75D7FF] transition-colors line-clamp-2 leading-snug cursor-pointer"
                        title={lecture.title}
                      >
                        {lecture.title}
                      </h4>

                      {lecture.description && (
                        <p className="text-xs text-[#A4ADBA] line-clamp-2 leading-relaxed">
                          {lecture.description}
                        </p>
                      )}

                      {/* Q&A / Doubts Indicator */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {unanswered > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF3D9A]/15 text-[#FF3D9A] border border-[#FF3D9A]/30">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>
                              {unanswered} Unanswered {unanswered === 1 ? "Doubt" : "Doubts"}
                            </span>
                          </span>
                        ) : totalComments > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {totalComments} Q&A (All Answered)
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-[#A4ADBA] bg-[#191E28] border border-[#292F3B]">
                            <MessageSquare className="w-3 h-3" />
                            <span>0 Questions Asked</span>
                          </span>
                        )}

                        <span className="text-[10px] text-[#A4ADBA] ml-auto flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(lecture.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 pt-3 border-t border-[#292F3B]/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/lectures/${lecture._id}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#75D7FF]/15 hover:bg-[#75D7FF]/25 text-[#75D7FF] border border-[#75D7FF]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch & Answer Q&A</span>
                    </button>

                    <button
                      onClick={() => {
                        setLectureToDelete(lecture);
                        setDeleteError("");
                      }}
                      className="p-2 rounded-xl bg-[#191E28] hover:bg-[#F43F5E]/15 hover:border-[#F43F5E]/30 text-[#A4ADBA] hover:text-[#F43F5E] border border-[#292F3B] transition-colors cursor-pointer"
                      title="Delete Lecture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {lectureToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLectureToDelete(null)}
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl p-6 z-10 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F3EF]">
                      Delete Lecture Recording?
                    </h3>
                    <p className="text-xs text-[#A4ADBA] mt-1 leading-relaxed">
                      Are you sure you want to remove{" "}
                      <strong className="text-[#F5F3EF]">
                        "{lectureToDelete.title}"
                      </strong>
                      ? The streaming video and all associated student discussion comments will be permanently deleted.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-xs text-[#F43F5E]">
                    {deleteError}
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setLectureToDelete(null)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-xs font-semibold text-[#F5F3EF] border border-[#292F3B] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                    </span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
