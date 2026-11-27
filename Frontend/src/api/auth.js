import api from "./axios";

export const studentSignup = (payload) => api.post("/student/signup", payload);
export const facultySignup = payload => api.post("/faculty/signup", payload);
export const studentLogin = (payload) => api.post("/student/login", payload);
export const facultyLogin = (payload) => api.post("/faculty/login", payload);
export const adminLogin = (payload) => api.post("/admin/login", payload);

export const getStudentProfile = () => api.get("/student/profile");
export const getFacultyProfile = () => api.get("/faculty/profile");
export const updateFacultyProfile = (payload) => api.put("/faculty/profile", payload);
export const changeFacultyPassword = (payload) => api.put("/faculty/change-password", payload);
