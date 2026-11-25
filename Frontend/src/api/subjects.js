import api from "./axios";

export const getSubjects = () => api.get("/subject");
export const createSubject = (payload) => api.post("/subject/create", payload);

// Student Google Classroom Course Workflow Endpoints
export const getStudentCurrentCourses = () => api.get("/student/current-courses");
export const getStudentPastSemesters = () => api.get("/student/past-semesters");
export const getStudentAccessibleResources = () => api.get("/student/accessible-resources");
export const getStudentCourse = (subjectId) => api.get(`/student/courses/${subjectId}`);
