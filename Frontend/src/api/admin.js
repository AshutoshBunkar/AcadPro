import api from "./axios";

// Admin Profile & Master Credentials
export const getAdminProfile = () => api.get("/admin/profile");
export const updateAdminProfile = (payload) => api.put("/admin/profile", payload);
export const changeAdminPassword = (payload) => api.put("/admin/change-password", payload);

// Audit & Monitoring
export const getSecurityLogs = () => api.get("/admin/security-logs");
export const getAdminDirectories = () => api.get("/admin/directories");

// Administrative Operations
export const createFaculty = (payload) => api.post("/admin/faculty", payload);
export const assignFacultyToSubject = (payload) => api.post("/admin/assign", payload);
export const removeTeachingAssignment = (id) => api.delete(`/admin/assign/${id}`);
export const promoteStudent = (payload) => api.put("/admin/promote", payload);
export const updateAcademicSession = (payload) => api.put("/admin/update", payload);
export const getCurrentSession = () => api.get("/admin/currentSession");

// Semester Management
export const getSemesters = () => api.get("/admin/semesters");
export const createSemester = (payload) => api.post("/admin/semesters", payload);
export const updateSemester = (id, payload) => api.put(`/admin/semesters/${id}`, payload);
export const deleteSemester = (id, cascade = false) =>
  api.delete(`/admin/semesters/${id}${cascade ? "?cascade=true" : ""}`);

// Student Enrollment & Subject Assignment
export const enrollStudentInSubjects = (payload) => api.post("/admin/enroll-student", payload);
export const batchEnrollStudents = (payload) => api.post("/admin/enroll-batch", payload);
export const getSemesterEnrollments = (params) => api.get("/admin/enrollments", { params });
export const removeStudentEnrollment = (id) => api.delete(`/admin/enrollments/${id}`);

// Course Addition Requests from Faculty
export const getSubjectRequests = () => api.get("/admin/subject-requests");
export const updateSubjectRequestStatus = (id, payload) =>
  api.patch(`/admin/subject-requests/${id}/status`, payload);

// Direct Entity Modifications (Admin)
export const updateStudent = (id, payload) => api.put(`/admin/student/${id}`, payload);
export const deleteStudent = (id) => api.delete(`/admin/student/${id}`);
export const updateFaculty = (id, payload) => api.put(`/admin/faculty/${id}`, payload);
export const deleteFaculty = (id) => api.delete(`/admin/faculty/${id}`);
export const updateSubject = (id, payload) => api.put(`/admin/subject/${id}`, payload);
export const deleteSubject = (id) => api.delete(`/admin/subject/${id}`);

