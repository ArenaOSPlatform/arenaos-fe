export type UserRole = "PLAYER" | "ORGANIZER" | "ADMIN";

const userRoleStorageKey = "userRole";

export const roleHomePath: Record<UserRole, string> = {
  PLAYER: "/team",
  ORGANIZER: "/organizer",
  ADMIN: "/admin",
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "PLAYER" || value === "ORGANIZER" || value === "ADMIN";
}

export function getStoredUserRole(): UserRole | null {
  const role = localStorage.getItem(userRoleStorageKey);

  return isUserRole(role) ? role : null;
}

export function setStoredUserRole(role: UserRole) {
  localStorage.setItem(userRoleStorageKey, role);
}

export function clearStoredUserRole() {
  localStorage.removeItem(userRoleStorageKey);
}

function normalizeJwtPayload(payload: string) {
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;

  return base64.padEnd(base64.length + padding, "=");
}

export function getAccessTokenRole(token: string | null): UserRole | null {
  try {
    if (!token) return null;

    const [, payload] = token.split(".");
    if (!payload) return null;

    const decodedPayload = JSON.parse(atob(normalizeJwtPayload(payload))) as {
      role?: string;
    };

    if (isUserRole(decodedPayload.role)) {
      return decodedPayload.role;
    }

    return null;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): UserRole | null {
  return (
    getStoredUserRole() ?? getAccessTokenRole(localStorage.getItem("accessToken"))
  );
}
