import api from "./axios";

export const getLecturesByTopic = (topicId, offeringId) => api.get(`/lecture/topic/${topicId}`, { params: { offeringId } });
export const getLecture = (lectureId) => api.get(`/lecture/${lectureId}`);
export const getMyLectures = (params) => api.get("/lecture/my-lectures", { params });
export const deleteLecture = (lectureId) => api.delete(`/lecture/${lectureId}`);
export const uploadLecture = (formData, onUploadProgress) =>
  api.post("/lecture/upload", formData, {
    onUploadProgress,
    headers: { "Content-Type": "multipart/form-data" },
  });
