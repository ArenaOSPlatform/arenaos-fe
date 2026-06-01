import { api } from "./api";
import type { UserRole } from "@/routes/route-role";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    role: UserRole;
    user: {
      id: string;
      email: string;
      username: string;
      role: UserRole;
    };
  };
};

export type CurrentUserResponse = {
  message: string;
  data: {
    sub: string;
    email: string;
    username: string;
    role: UserRole;
  };
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function getMe(): Promise<CurrentUserResponse> {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function refreshAuthToken(
  refreshToken: string,
): Promise<AuthResponse> {
  const res = await api.post(
    "/auth/refresh",
    {},
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );
  return res.data;
}

export async function logout() {
  const res = await api.post("/auth/logout");
  return res.data;
}

export async function adminTest() {
  const res = await api.get("/auth/admin-test");
  return res.data;
}
