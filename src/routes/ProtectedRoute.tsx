import { Navigate, Outlet } from "react-router-dom";
import { clearStoredUserRole } from "./route-role";

export function ProtectedRoute() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    clearStoredUserRole();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
