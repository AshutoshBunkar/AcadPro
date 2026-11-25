import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  PlayCircle,
  ChevronRight,
  Lock,
  FolderOpen,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import ErrorState from "../components/common/ErrorState";
import { RowsSkeleton } from "../components/common/Skeletons";
import { getTopics } from "../api/topics";
import { getLecturesByTopic } from "../api/lectures";

export default function TopicsPage() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isArchived = searchParams.get("archived") === "true";
  const isReference = searchParams.get("reference") === "true";
  const semester = searchParams.get("semester");

  const topicsQuery = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => getTopics(subjectId),
    select: (res) => res.data.data,
  });

  const topics = topicsQuery.data || [];

  const lectureCountQueries = useQueries({
    queries: topics.map((topic) => ({
      queryKey: ["lectures", "topic", topic._id],
      queryFn: () => getLecturesByTopic(topic._id),
      select: (res) => res.data.data.length,
      enabled: Boolean(topicsQuery.data),
    })),
  });

  return (
    <AppLayout
      title="Course Modules & Topics"
      subtitle={
        isArchived
          ? `Archived Semester ${semester || "Past"} Course Material`
          : isReference
          ? `Semester ${semester || "Lower"} Reference Resources`
          : "Explore curriculum units and video lectures"
      }
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292F3B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-xl bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] text-[#A4ADBA] hover:text-[#F5F3EF] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A4ADBA]">Dashboard</span>
                <span className="text-xs text-[#292F3B]">/</span>
                <span className="text-xs font-semibold text-[#75D7FF]">Course Topics</span>
              </div>
              <h2 className="text-lg font-bold text-[#F5F3EF] tracking-tight">
                Curriculum Structure
              </h2>
            </div>
          </div>

          {isArchived && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Archived • Semester {semester || "Past"}</span>
            </div>
          )}

          {isReference && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#75D7FF]/10 border border-[#75D7FF]/30 text-[#75D7FF] text-xs font-semibold">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Reference Resource • Semester {semester || "Foundational"}</span>
            </div>
          )}
        </div>

        {/* Archived / Reference Banner Notice */}
        {isArchived && (
          <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#F59E0B]" />
            <div>
              <p className="font-semibold text-sm">Archived Course Archive</p>
              <p className="text-[#A4ADBA] mt-0.5 leading-relaxed">
                You are viewing learning materials from a completed semester in read-only mode. Video lectures and lecture summaries are fully accessible.
              </p>
            </div>
          </div>
        )}

        {isReference && (
          <div className="p-4 rounded-2xl bg-[#75D7FF]/10 border border-[#75D7FF]/30 text-[#75D7FF] text-xs flex items-start gap-3">
            <FolderOpen className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#75D7FF]" />
            <div>
              <p className="font-semibold text-sm">Lower-Semester Reference Course</p>
              <p className="text-[#A4ADBA] mt-0.5 leading-relaxed">
                You have cross-semester access to these foundational materials as reference content. All recorded lectures and modules are available for your studies.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {topicsQuery.isLoading && <RowsSkeleton count={5} />}

        {/* Error State */}
        {topicsQuery.isError && (
          <ErrorState error={topicsQuery.error} onRetry={topicsQuery.refetch} />
        )}

        {/* Empty State */}
        {topicsQuery.isSuccess && topics.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F3EF]">No Topics Published Yet</h3>
            <p className="text-xs text-[#A4ADBA] max-w-sm mx-auto">
              Your instructor hasn't created topics or uploaded lectures for this subject yet. Please check back later.
            </p>
          </div>
        )}

        {/* Topics List */}
        {topicsQuery.isSuccess && topics.length > 0 && (
          <div className="space-y-3">
            {topics.map((topic, i) => {
              const lectureCount = lectureCountQueries[i]?.data;
              return (
                <motion.div
                  key={topic._id}
                  whileHover={{ scale: 1.006 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    onClick={() =>
                      navigate(
                        `/topics/${topic._id}/lectures${
                          isArchived
                            ? `?archived=true&semester=${semester || ""}`
                            : isReference
                            ? `?reference=true&semester=${semester || ""}`
                            : ""
                        }`
                      )
                    }
                    className="p-4 sm:p-5 rounded-2xl bg-[#11141B] hover:bg-[#151922] border border-[#292F3B] hover:border-[#75D7FF]/40 cursor-pointer shadow-lg transition-all group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#191E28] border border-[#292F3B] group-hover:border-[#75D7FF]/50 flex items-center justify-center text-[#75D7FF] group-hover:scale-105 transition-all flex-shrink-0">
                        <PlayCircle className="w-5 h-5 text-[#75D7FF]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#191E28] text-[#A4ADBA] border border-[#292F3B]">
                            Unit {topic.order || i + 1}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-[#F5F3EF] group-hover:text-[#75D7FF] transition-colors truncate mt-1">
                          {topic.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#191E28] text-[#A4ADBA] border border-[#292F3B]">
                        {lectureCount === undefined
                          ? "Loading..."
                          : `${lectureCount} ${lectureCount === 1 ? "lecture" : "lectures"}`}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#A4ADBA] group-hover:text-[#75D7FF] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
