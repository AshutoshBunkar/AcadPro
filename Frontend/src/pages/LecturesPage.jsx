import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Clock,
  Lock,
  Video,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import ErrorState from "../components/common/ErrorState";
import { CardGridSkeleton } from "../components/common/Skeletons";
import { getLecturesByTopic } from "../api/lectures";
import { formatDuration } from "../utils/format";

export default function LecturesPage() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isArchived = searchParams.get("archived") === "true";
  const isReference = searchParams.get("reference") === "true";
  const offeringId = searchParams.get("offeringId") || undefined;
  const semester = searchParams.get("semester");

  const lecturesQuery = useQuery({
    queryKey: ["lectures", "topic", topicId, offeringId],
    queryFn: () => getLecturesByTopic(topicId, offeringId),
    select: (res) => res.data.data,
  });

  const lectures = lecturesQuery.data || [];

  return (
    <AppLayout
      title="Topic Lectures"
      subtitle={
        isArchived
          ? `Archived Semester ${semester || "Past"} Course Lectures`
          : isReference
          ? `Reference Lectures • Semester ${semester || "Lower"}`
          : "Watch recorded lectures and join topic Q&A discussions"
      }
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292F3B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] text-[#A4ADBA] hover:text-[#F5F3EF] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A4ADBA]">Topics</span>
                <span className="text-xs text-[#292F3B]">/</span>
                <span className="text-xs font-semibold text-[#75D7FF]">Lectures</span>
              </div>
              <h2 className="text-lg font-bold text-[#F5F3EF] tracking-tight">
                Available Video Lectures
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
              <Video className="w-3.5 h-3.5" />
              <span>Reference Resource • Semester {semester || "Foundational"}</span>
            </div>
          )}
        </div>

        {/* Archived / Reference Notice */}
        {isArchived && (
          <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-xs flex items-start gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#F59E0B]" />
            <div>
              <p className="font-semibold text-sm">Read-Only Archive Mode</p>
              <p className="text-[#A4ADBA] mt-0.5 leading-relaxed">
                Viewing lectures from an archived semester. Video playback and previous Q&A discussions are fully available in read-only mode.
              </p>
            </div>
          </div>
        )}

        {isReference && (
          <div className="p-4 rounded-2xl bg-[#75D7FF]/10 border border-[#75D7FF]/30 text-[#75D7FF] text-xs flex items-start gap-3">
            <Video className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#75D7FF]" />
            <div>
              <p className="font-semibold text-sm">Reference Lecture Material</p>
              <p className="text-[#A4ADBA] mt-0.5 leading-relaxed">
                Viewing foundational curriculum lectures under cross-semester learning access. Video playback and discussions are accessible for reference study.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {lecturesQuery.isLoading && <CardGridSkeleton count={6} height={160} />}

        {/* Error State */}
        {lecturesQuery.isError && (
          <ErrorState error={lecturesQuery.error} onRetry={lecturesQuery.refetch} />
        )}

        {/* Empty State */}
        {lecturesQuery.isSuccess && lectures.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#A4ADBA]">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F3EF]">No Lectures Uploaded Yet</h3>
            <p className="text-xs text-[#A4ADBA] max-w-sm mx-auto">
              No video lectures have been recorded for this topic yet. Check back once your professor uploads the session recording.
            </p>
          </div>
        )}

        {/* Lectures Grid */}
        {lecturesQuery.isSuccess && lectures.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lectures.map((lecture) => (
              <motion.div
                key={lecture._id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() =>
                  navigate(
                    `/lectures/${lecture._id}${
                      isArchived
                        ? `?archived=true&semester=${semester || ""}`
                        : isReference
                        ? `?reference=true&semester=${semester || ""}`
                        : ""
                    }`
                  )
                }
                className="group rounded-2xl bg-[#11141B] border border-[#292F3B] hover:border-[#75D7FF]/40 overflow-hidden shadow-xl cursor-pointer flex flex-col transition-all duration-200"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-[#191E28] overflow-hidden">
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

                  {/* Fallback gradient if no thumbnail or loading */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11141B] via-transparent to-transparent opacity-80" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#08090D]/80 backdrop-blur-md border border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF] shadow-xl group-hover:scale-110 group-hover:bg-[#75D7FF] group-hover:text-[#08090D] transition-all">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Pill */}
                  {lecture.duration > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#08090D]/85 backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-[#F5F3EF] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#75D7FF]" />
                      <span>{formatDuration(lecture.duration)}</span>
                    </div>
                  )}
                </div>

                {/* Content Container */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F3EF] group-hover:text-[#75D7FF] transition-colors line-clamp-2 leading-snug">
                      {lecture.title}
                    </h3>
                    {lecture.description && (
                      <p className="text-xs text-[#A4ADBA] mt-1 line-clamp-2 leading-relaxed">
                        {lecture.description}
                      </p>
                    )}
                  </div>

                  {/* Instructor Meta */}
                  <div className="pt-3 border-t border-[#292F3B]/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#75D7FF] text-[10px] font-bold">
                        {lecture.uploadedBy?.name ? lecture.uploadedBy.name.charAt(0).toUpperCase() : "P"}
                      </div>
                      <span className="text-[#A4ADBA] truncate font-medium">
                        {lecture.uploadedBy?.name || "Faculty Instructor"}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#75D7FF]">Watch →</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
