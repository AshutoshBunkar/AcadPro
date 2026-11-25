import api from "./axios";

export const getComments = (lectureId) => api.get(`/comment/getComment/${lectureId}`);
export const postComment = ({ lectureId, text, comment }) => {
  const content = text || comment;
  return api.post("/comment/postComment", {
    lectureId,
    text: content,
    comment: content,
  });
};
export const postReply = ({ commentId, text, reply }) => {
  const content = text || reply;
  return api.post("/comment/postReply", {
    commentId,
    text: content,
    reply: content,
  });
};
