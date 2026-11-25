import api from "./axios";

// Faculty Courses & Multi-Semester Teaching
export const getFacultyCourses = (params) => api.get("/faculty/courses", { params });

// Faculty Course Roster & Semester-Wise Enrolled Students
export const getFacultyCourseRoster = (subjectId, params) =>
  api.get(`/faculty/courses/${subjectId}/roster`, { params });

// Export Course Roster to CSV
export const exportFacultyCourseRoster = (subjectId, params) =>
  api.get(`/faculty/courses/${subjectId}/roster/export`, {
    params,
    responseType: "blob",
  });

// Request Course Addition
export const requestSubject = (data) => api.post("/faculty/request-subject", data);

// Get Faculty Course Requests
export const getFacultySubjectRequests = () => api.get("/faculty/subject-requests");

