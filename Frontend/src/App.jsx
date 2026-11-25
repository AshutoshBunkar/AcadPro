import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROLES } from "./constants";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import StudentDashboard from "./pages/StudentDashboard";
import TopicsPage from "./pages/TopicsPage";
import LecturesPage from "./pages/LecturesPage";
import LecturePlayerPage from "./pages/LecturePlayerPage";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyProfilePage from "./pages/FacultyProfilePage";
import FacultyLecturesPage from "./pages/FacultyLecturesPage";
import UploadLecturePage from "./pages/UploadLecturePage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfilePage from "./pages/AdminProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/topics"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN]}>
              <TopicsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/topics/:topicId/lectures"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN]}>
              <LecturesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lectures/:lectureId"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.FACULTY]}>
              <LecturePlayerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/lectures"
          element={
            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
              <FacultyLecturesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
              <FacultyProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/upload"
          element={
            <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
              <UploadLecturePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}
