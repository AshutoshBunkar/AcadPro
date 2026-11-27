import { apiBase } from "../api/axios";
import { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
  Settings,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import ErrorState from "../components/common/ErrorState";
import { getLecture } from "../api/lectures";
import { getComments, postComment, postReply } from "../api/comments";
import { useAuth } from "../context/useAuth";
import { formatDate } from "../utils/format";
import { QUALITY_OPTIONS, buildQualityUrl } from "../utils/cloudinaryQuality";
import { ROLES } from "../constants";

function VideoPlayer({ lecture }) {
  const videoRef = useRef(null);
  const [quality, setQuality] = useState("720p");
  const pendingSeek = useRef(null);

  const handleQualityChange = (e) => {
    const video = videoRef.current;
    if (video) {
      pendingSeek.current = { time: video.currentTime, wasPlaying: !video.paused };
    }
    setQuality(e.target.value);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && pendingSeek.current) {
      video.currentTime = pendingSeek.current.time;
      if (pendingSeek.current.wasPlaying) {
        video.play().catch(() => {});
      }
      pendingSeek.current = null;
    }
  };

  return (
    <div className="rounded-2xl bg-[#11141B] border border-[#292F3B] p-3 sm:p-4 shadow-2xl">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#292F3B]">
        <video
          ref={videoRef}
          crossOrigin={lecture.mediaType ? "use-credentials" : undefined}
            src={lecture.mediaType ? apiBase + lecture.videoUrl : buildQualityUrl(lecture.videoUrl, quality)}
          poster={lecture.thumbnailUrl}
          controls
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Video Controls Bar */}
      <div className="flex items-center justify-between mt-3 px-1 text-xs">
        <div className="flex items-center gap-2 text-[#A4ADBA]">
          <Sparkles className="w-4 h-4 text-[#75D7FF]" />
          <span>High-definition institutional stream</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="quality-select" className="text-xs text-[#A4ADBA] font-medium flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-[#75D7FF]" />
            <span>Resolution:</span>
          </label>
          <select
            id="quality-select"
            value={quality}
            onChange={handleQualityChange}
            className="px-2.5 py-1 rounded-lg bg-[#191E28] border border-[#292F3B] text-xs font-semibold text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
          >
            {QUALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, canReply, onReply, isReplying }) {
  const [replyText, setReplyText] = useState("");
  const [open, setOpen] = useState(false);
  const replies = comment.replies || [];
  const hasReply = replies.length > 0;

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment._id, replyText.trim(), () => {
      setReplyText("");
      setOpen(false);
    });
  };

  return (
    <div className="p-4 rounded-xl bg-[#191E28]/60 border border-[#292F3B] space-y-3">
      {/* Student Question Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#11141B] border border-[#292F3B] flex items-center justify-center text-[#75D7FF] text-xs font-bold flex-shrink-0">
            {comment.studentId?.name ? comment.studentId.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F5F3EF]">
                {comment.studentId?.name || "Student"}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#75D7FF]/10 text-[#75D7FF] font-medium">
                Student
              </span>
            </div>
            <span className="text-[10px] text-[#A4ADBA]">
              {formatDate(comment.createdAt)}
            </span>
          </div>
        </div>

        {canReply && (
          <button
            onClick={() => setOpen(!open)}
            className="text-xs font-semibold text-[#75D7FF] hover:text-[#A8E7FF] transition-colors cursor-pointer"
          >
            {open ? "Cancel" : hasReply ? "Add Follow-up Reply" : "Reply as Faculty"}
          </button>
        )}
      </div>

      {/* Question Text */}
      <p className="text-xs sm:text-sm text-[#F5F3EF] leading-relaxed pl-10">
        {comment.text || comment.comment}
      </p>

      {/* Reply Thread */}
      {hasReply && (
        <div className="space-y-2 ml-8 mt-2">
          {replies.map((reply, idx) => (
            <div
              key={reply._id || idx}
              className="p-3 rounded-xl bg-[#11141B] border-l-2 border-[#FF3D9A] border-t border-r border-b border-[#292F3B] space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FF3D9A]/20 flex items-center justify-center text-[#FF3D9A] text-[10px] font-bold">
                    F
                  </span>
                  <span className="font-semibold text-[#FF3D9A] text-xs">
                    {reply.facultyId?.name || "Faculty Instructor"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF3D9A]/15 text-[#FF3D9A] font-bold uppercase">
                    Official Response
                  </span>
                </div>
                <span className="text-[10px] text-[#A4ADBA]">
                  {formatDate(reply.createdAt)}
                </span>
              </div>
              <p className="text-xs text-[#F5F3EF] leading-relaxed pl-7">
                {reply.text || reply.reply}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Faculty Reply Input Box */}
      {open && canReply && (
        <div className="ml-8 mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write official response to student question..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitReply();
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF]"
            />
            <button
              onClick={submitReply}
              disabled={isReplying || !replyText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF3D9A] hover:bg-[#FF66AE] text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isReplying ? "Posting..." : "Post Reply"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LecturePlayerPage() {
  const { lectureId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const isArchived = searchParams.get("archived") === "true";
  const semester = searchParams.get("semester");

  const [questionText, setQuestionText] = useState("");

  const lectureQuery = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: () => getLecture(lectureId),
    select: (res) => res.data.data,
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", lectureId],
    queryFn: () => getComments(lectureId),
    select: (res) => res.data.data,
  });

  const postCommentMutation = useMutation({
    mutationFn: (text) => postComment({ lectureId, text, comment: text }),
    onSuccess: () => {
      setQuestionText("");
      queryClient.invalidateQueries({ queryKey: ["comments", lectureId] });
    },
  });

  const postReplyMutation = useMutation({
    mutationFn: ({ commentId, reply }) =>
      postReply({ commentId, text: reply, reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", lectureId] });
    },
  });

  const lecture = lectureQuery.data;
  const comments = commentsQuery.data || [];
  const uploaderId = lecture?.uploadedBy?._id || lecture?.uploadedBy;
  const currentUserId = user?._id || user?.id;
  const isUploader =
    role === ROLES.FACULTY &&
    Boolean(uploaderId && currentUserId && String(uploaderId) === String(currentUserId));

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    postCommentMutation.mutate(questionText.trim());
  };

  const handleReply = (commentId, reply, callback) => {
    postReplyMutation.mutate({ commentId, reply }, { onSuccess: callback });
  };

  return (
    <AppLayout
      title={lecture?.title || "Lecture Theater"}
      subtitle={
        lecture?.topicId?.name
          ? `Module: ${lecture.topicId.name}`
          : "Video Lecture Stream & Academic Q&A"
      }
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292F3B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] text-[#A4ADBA] hover:text-[#F5F3EF] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="Back to lectures"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A4ADBA]">Topic</span>
                <span className="text-xs text-[#292F3B]">/</span>
                <span className="text-xs font-semibold text-[#75D7FF]">Lecture Playback</span>
              </div>
              <h2 className="text-lg font-bold text-[#F5F3EF] tracking-tight">
                {lecture?.title || "Loading Lecture..."}
              </h2>
            </div>
          </div>

          {isArchived && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Archived • Semester {semester || "Past"}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {lectureQuery.isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#11141B] border border-[#292F3B] animate-pulse">
            <div className="h-64 rounded-xl bg-[#191E28] mb-4" />
            <div className="h-4 w-1/3 bg-[#191E28] rounded mx-auto" />
          </div>
        )}

        {/* Error State */}
        {lectureQuery.isError && (
          <ErrorState error={lectureQuery.error} onRetry={lectureQuery.refetch} />
        )}

        {/* Main Video & Details */}
        {lecture && (
          <div className="space-y-6">
            <VideoPlayer lecture={lecture} />

            {/* Lecture Meta & Description */}
            <div className="p-5 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#292F3B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#191E28] border border-[#292F3B] flex items-center justify-center text-[#75D7FF] font-bold">
                    {lecture.uploadedBy?.name ? lecture.uploadedBy.name.charAt(0).toUpperCase() : "P"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F5F3EF]">
                      {lecture.uploadedBy?.name || "Professor"}
                    </p>
                    <p className="text-[11px] text-[#A4ADBA]">
                      Instructor • Academic Faculty
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#A4ADBA]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#75D7FF]" />
                    <span>Uploaded {formatDate(lecture.createdAt)}</span>
                  </div>
                  {isUploader && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3D9A]/15 text-[#FF3D9A] border border-[#FF3D9A]/30">
                      Your Upload
                    </span>
                  )}
                </div>
              </div>

              {lecture.description && (
                <div>
                  <h4 className="text-xs font-semibold text-[#A4ADBA] uppercase tracking-wider mb-1.5">
                    Lecture Description & Topics Covered
                  </h4>
                  <p className="text-xs sm:text-sm text-[#F5F3EF] leading-relaxed whitespace-pre-wrap">
                    {lecture.description}
                  </p>
                </div>
              )}
            </div>

            {/* Q&A Discussions Section */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-[#75D7FF]" />
                  <h3 className="text-base font-bold text-[#F5F3EF]">
                    Discussion & Academic Q&A
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#191E28] text-[#A4ADBA] border border-[#292F3B]">
                    {comments.length}
                  </span>
                </div>
              </div>

              {/* Ask Question Box for Students (or notice if archived / faculty view) */}
              {isArchived ? (
                <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#FBBF24] flex items-center gap-2">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>Discussion forum is archived for past semester courses. Existing Q&A is available for review.</span>
                </div>
              ) : role === ROLES.STUDENT ? (
                <form onSubmit={handleAskQuestion} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask a question about this lecture or timestamp..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={postCommentMutation.isPending || !questionText.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{postCommentMutation.isPending ? "Posting..." : "Ask Question"}</span>
                    </button>
                  </div>
                </form>
              ) : role === ROLES.FACULTY && isUploader ? (
                <div className="p-3 rounded-xl bg-[#75D7FF]/10 border border-[#75D7FF]/30 text-xs text-[#75D7FF] flex items-center justify-between">
                  <span>
                    You are the instructor for this lecture. You can reply directly to student questions below.
                  </span>
                </div>
              ) : role === ROLES.FACULTY ? (
                <div className="p-3 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#A4ADBA] flex items-center gap-2">
                  <span>
                    Viewing as faculty. Official responses to doubts can only be provided by the uploading instructor ({lecture.uploadedBy?.name || "assigned instructor"}).
                  </span>
                </div>
              ) : null}

              {/* Error messages */}
              {postCommentMutation.isError && (
                <ErrorState error={postCommentMutation.error} />
              )}
              {postReplyMutation.isError && (
                <ErrorState error={postReplyMutation.error} />
              )}

              {/* Comments List */}
              {commentsQuery.isError && (
                <ErrorState error={commentsQuery.error} onRetry={commentsQuery.refetch} />
              )}
              {commentsQuery.isLoading && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-[#191E28] animate-pulse" />
                  ))}
                </div>
              )}

              {commentsQuery.isSuccess && comments.length === 0 && (
                <div className="text-center py-8 text-xs text-[#A4ADBA]">
                  No questions asked yet for this lecture. Have a doubt? Be the first to start the discussion!
                </div>
              )}

              {commentsQuery.isSuccess && comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment._id}
                      comment={comment}
                      canReply={isUploader}
                      onReply={handleReply}
                      isReplying={postReplyMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
