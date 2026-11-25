import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  X,
  ArrowRight,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import { getFacultyProfile } from "../api/auth";
import { getTopics, createTopic } from "../api/topics";
import { uploadLecture } from "../api/lectures";
import { getErrorMessage } from "../api/axios";

export default function UploadLecturePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [subjectId, setSubjectId] = useState(location.state?.subjectId || "");
  const [topicId, setTopicId] = useState("");
  const [topicIdResetFor, setTopicIdResetFor] = useState(location.state?.subjectId || "");
  const [creatingTopic, setCreatingTopic] = useState(location.state?.mode === "topic");
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicOrder, setNewTopicOrder] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const profileQuery = useQuery({
    queryKey: ["faculty-profile"],
    queryFn: getFacultyProfile,
    select: (res) => res.data.data,
  });

  const subjects = (profileQuery.data?.assignments || []).map((a) => a.subjectId).filter(Boolean);

  const topicsQuery = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => getTopics(subjectId),
    select: (res) => res.data.data,
    enabled: Boolean(subjectId),
  });

  const topics = topicsQuery.data || [];

  // Reset the selected topic whenever the subject changes
  if (subjectId !== topicIdResetFor) {
    setTopicIdResetFor(subjectId);
    setTopicId("");
  }

  const createTopicMutation = useMutation({
    mutationFn: () =>
      createTopic({ subjectId, name: newTopicName.trim(), order: Number(newTopicOrder) }),
    onSuccess: (res) => {
      const created = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["topics", subjectId] });
      setTopicId(created._id);
      setCreatingTopic(false);
      setNewTopicName("");
      setNewTopicOrder("");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadLecture(formData),
    onSuccess: () => {
      setSuccessMessage("Lecture video published and added to curriculum successfully.");
      setTitle("");
      setDescription("");
      setVideoFile(null);
      queryClient.invalidateQueries({ queryKey: ["lectures", "topic", topicId] });
      queryClient.invalidateQueries({ queryKey: ["faculty-lectures"] });
      queryClient.invalidateQueries({ queryKey: ["faculty-profile"] });
    },
  });

  const handleCreateTopic = (e) => {
    e.preventDefault();
    setFormError("");
    if (!newTopicName.trim() || !newTopicOrder) {
      setFormError("Topic name and sequential order are required.");
      return;
    }
    createTopicMutation.mutate();
  };

  const handleUpload = (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!subjectId) {
      setFormError("Please select a subject.");
      return;
    }
    if (!topicId) {
      setFormError("Please select an existing topic or create a new topic first.");
      return;
    }
    if (!title.trim()) {
      setFormError("Lecture title is required.");
      return;
    }
    if (!videoFile) {
      setFormError("A video file is required (.mp4, .webm, or .mkv).");
      return;
    }

    const formData = new FormData();
    formData.append("topicId", topicId);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("video", videoFile);

    uploadMutation.mutate(formData);
  };

  return (
    <AppLayout
      title="Upload Lecture Recording"
      subtitle="Publish course lecture recordings for your assigned students"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between pb-4 border-b border-[#292F3B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/faculty/dashboard")}
              className="p-2 rounded-xl bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] text-[#A4ADBA] hover:text-[#F5F3EF] transition-colors focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A4ADBA]">Faculty Hub</span>
                <span className="text-xs text-[#292F3B]">/</span>
                <span className="text-xs font-semibold text-[#75D7FF]">Upload</span>
              </div>
              <h2 className="text-lg font-bold text-[#F5F3EF] tracking-tight">
                Publish New Video Lecture
              </h2>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/faculty/lectures")}
                className="px-3 py-1.5 rounded-lg bg-[#10B981] text-[#08090D] font-bold text-xs flex items-center gap-1 hover:bg-[#34D399] transition-all cursor-pointer"
              >
                <span>View in My Lectures</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSuccessMessage("")}
                className="p-1 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(formError || uploadMutation.isError || createTopicMutation.isError) && (
          <div className="p-4 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-[#F43F5E] flex-shrink-0" />
            <span>
              {formError ||
                getErrorMessage(uploadMutation.error) ||
                getErrorMessage(createTopicMutation.error)}
            </span>
          </div>
        )}

        {/* Main Upload Card */}
        <div className="bg-[#11141B] border border-[#292F3B] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleUpload} className="space-y-5">
            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                Target Subject / Course
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF] transition-all"
              >
                <option value="">-- Choose Assigned Subject --</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selection or Inline Creation */}
            {subjectId && (
              <div className="p-4 rounded-xl bg-[#191E28]/60 border border-[#292F3B] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#A4ADBA]">
                    Curriculum Topic / Module
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatingTopic(!creatingTopic)}
                    className="text-xs font-semibold text-[#75D7FF] hover:text-[#A8E7FF] flex items-center gap-1 transition-colors"
                  >
                    {creatingTopic ? "Choose existing topic" : "+ Create new topic"}
                  </button>
                </div>

                {creatingTopic ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Topic Name (e.g. Dynamic Programming)"
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Order / Unit (e.g. 1)"
                          value={newTopicOrder}
                          onChange={(e) => setNewTopicOrder(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateTopic}
                      disabled={createTopicMutation.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF3D9A] hover:bg-[#FF66AE] text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{createTopicMutation.isPending ? "Creating Topic..." : "Save Topic"}</span>
                    </button>
                  </div>
                ) : (
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#11141B] border border-[#292F3B] text-xs sm:text-sm text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF] transition-all"
                  >
                    <option value="">-- Choose Existing Topic --</option>
                    {topics.map((t) => (
                      <option key={t._id} value={t._id}>
                        Unit {t.order}: {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Lecture Title */}
            <div>
              <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                Lecture Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Lecture 04: Bellman-Ford & Shortest Paths"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                Lecture Notes & Summary (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Key concepts discussed, reading assignments, and textbook chapter references..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all resize-y"
              />
            </div>

            {/* Video File Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                Video Media File
              </label>
              <div className="relative border-2 border-dashed border-[#292F3B] hover:border-[#75D7FF]/50 rounded-2xl p-6 text-center bg-[#191E28]/40 hover:bg-[#191E28]/70 transition-all cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 pointer-events-none">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#11141B] border border-[#292F3B] flex items-center justify-center text-[#75D7FF]">
                    {videoFile ? (
                      <FileVideo className="w-6 h-6 text-[#10B981]" />
                    ) : (
                      <Upload className="w-6 h-6 text-[#75D7FF]" />
                    )}
                  </div>
                  {videoFile ? (
                    <div>
                      <p className="text-sm font-bold text-[#F5F3EF]">{videoFile.name}</p>
                      <p className="text-xs text-[#10B981] mt-0.5 font-medium">
                        {(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-[#F5F3EF]">
                        Click or drag & drop video recording here
                      </p>
                      <p className="text-xs text-[#A4ADBA] mt-0.5">
                        MP4, WEBM, or MKV • Max 500 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#75D7FF] to-[#258BC4] hover:from-[#A8E7FF] hover:to-[#75D7FF] text-[#08090D] shadow-lg shadow-[#75D7FF]/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
            >
              {uploadMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#08090D] border-t-transparent rounded-full animate-spin"></span>
                  <span>Uploading & Processing Video Lecture...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Video Lecture to Students</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
