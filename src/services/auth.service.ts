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

export type GoogleLoginPayload = {
  idToken: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
};

export type VerifyResetOtpPayload = {
  email: string;
  otp: string;
};

export type AuthMessageResponse = {
  message: string;
};

export type AuthResponse = {
  message: string;
  data: {
    accessToken: string;
    role: UserRole;
    user: {
      id: string;
      email: string;
      username: string;
      avatarUrl?: string | null;
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
    avatarUrl: string | null;
    role: UserRole;
    status: string;
  };
};

export type UpdateProfilePayload = {
  username?: string;
  avatarUrl?: string | null;
};

export type UpdateProfileResponse = CurrentUserResponse;

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function googleLogin(
  payload: GoogleLoginPayload,
): Promise<AuthResponse> {
  const res = await api.post("/auth/google", payload);
  return res.data;
}

export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<AuthMessageResponse> {
  const res = await api.post("/auth/forgot-password", payload);
  return res.data;
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<AuthMessageResponse> {
  const res = await api.post("/auth/reset-password", payload);
  return res.data;
}

export async function verifyResetOtp(
  payload: VerifyResetOtpPayload,
): Promise<AuthMessageResponse> {
  const res = await api.post("/auth/verify-reset-otp", payload);
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

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> {
  const res = await api.patch("/auth/me", payload);
  return res.data;
}

export async function refreshAuthToken(): Promise<AuthResponse> {
  const res = await api.post("/auth/refresh-token");
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
