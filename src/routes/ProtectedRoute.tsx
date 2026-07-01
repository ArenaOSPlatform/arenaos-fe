import { Navigate, Outlet } from "react-router-dom";
import { clearStoredUserRole } from "./route-role";
import { getAccessToken } from "@/utils/authStorage";

export function ProtectedRoute() {
  const token = getAccessToken();

  if (!token) {
    clearStoredUserRole();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
