import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { DASHBOARD_PATH } from "../constants";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={DASHBOARD_PATH[role] || "/login"} replace />;
  }

  return children;
}

