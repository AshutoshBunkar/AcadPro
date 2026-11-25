import api from "./axios";

export const getLecturesByTopic = (topicId) => api.get(`/lecture/topic/${topicId}`);
export const getLecture = (lectureId) => api.get(`/lecture/${lectureId}`);
export const getMyLectures = (params) => api.get("/lecture/my-lectures", { params });
export const deleteLecture = (lectureId) => api.delete(`/lecture/${lectureId}`);
export const uploadLecture = (formData) =>
  api.post("/lecture/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
