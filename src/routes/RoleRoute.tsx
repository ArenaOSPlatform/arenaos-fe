import { Navigate, Outlet } from "react-router-dom";
import {
  clearStoredUserRole,
  getCurrentUserRole,
  roleHomePath,
  type UserRole,
} from "./route-role";

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = getCurrentUserRole();

  if (!role) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    clearStoredUserRole();
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleHomePath[role]} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Outlet />;
  }

  const role = getCurrentUserRole();

  if (!role) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    clearStoredUserRole();
    return <Outlet />;
  }

  return <Navigate to={roleHomePath[role]} replace />;
}
