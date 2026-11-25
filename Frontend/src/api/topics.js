import api from "./axios";

export const getTopics = (subjectId) => api.get(`/topic/${subjectId}`);
export const createTopic = (payload) => api.post("/topic", payload);
