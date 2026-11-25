import api from "./axios";

/**
 * The backend has no dedicated "unanswered questions across my lectures" endpoint.
 * Built from existing endpoints: for each subject the faculty teaches, walk
 * topics -> lectures -> comments, keeping only lectures this faculty uploaded
 * and comments with no reply yet.
 */
export async function getUnansweredQuestions(assignments, facultyId) {
  const subjectIds = [
    ...new Set(
      (assignments || [])
        .map((a) => a.subjectId?._id || a.subjectId)
        .filter(Boolean)
    ),
  ];

  const topicLists = await Promise.all(
    subjectIds.map((subjectId) =>
      api.get(`/topic/${subjectId}`).then((res) => res.data.data)
    )
  );
  const topics = topicLists.flat();

  const lectureLists = await Promise.all(
    topics.map((topic) =>
      api.get(`/lecture/topic/${topic._id}`).then((res) => ({
        topic,
        lectures: res.data.data,
      }))
    )
  );

  const myLectures = lectureLists.flatMap(({ topic, lectures }) =>
    lectures
      .filter((lecture) => lecture.uploadedBy?._id === facultyId)
      .map((lecture) => ({ lecture, topic }))
  );

  const commentLists = await Promise.all(
    myLectures.map(({ lecture, topic }) =>
      api.get(`/comment/getComment/${lecture._id}`).then((res) => ({
        lecture,
        topic,
        comments: res.data.data,
      }))
    )
  );

  return commentLists.flatMap(({ lecture, topic, comments }) =>
    comments
      .filter((comment) => !comment.replies || comment.replies.length === 0)
      .map((comment) => ({ comment, lecture, topic }))
  );
}
