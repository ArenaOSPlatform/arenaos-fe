import { Navigate, Outlet } from "react-router-dom";
import {
  clearStoredUserRole,
  getCurrentUserRole,
  roleHomePath,
  type UserRole,
} from "./route-role";
import { clearStoredTokens, getAccessToken } from "@/utils/authStorage";

type RoleRouteProps = {
  allowedRoles: UserRole[];
};

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = getCurrentUserRole();

  if (!role) {
    clearStoredTokens();
    clearStoredUserRole();
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleHomePath[role]} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const token = getAccessToken();

  if (!token) {
    return <Outlet />;
  }

  const role = getCurrentUserRole();

  if (!role) {
    clearStoredTokens();
    clearStoredUserRole();
    return <Outlet />;
  }

  return <Navigate to={roleHomePath[role]} replace />;
}
