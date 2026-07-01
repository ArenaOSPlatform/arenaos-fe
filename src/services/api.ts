import axios, { AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  clearStoredUserRole,
  isUserRole,
  setStoredUserRole,
  type UserRole,
} from "@/routes/route-role";
import {
  clearLegacyRefreshToken,
  clearStoredTokens,
  getAccessToken,
  getLegacyRefreshToken,
  setAccessToken,
} from "@/utils/authStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const authSessionExpiredEvent = "arenaos:auth-session-expired";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  data?: {
    accessToken?: string;
    role?: UserRole;
    user?: {
      role?: UserRole;
    };
  };
};

let refreshRequest: Promise<RefreshResponse["data"]> | null = null;

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
) {
  const headers = AxiosHeaders.from(config.headers);

  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
}

export function clearAuthStorage(options: { notify?: boolean } = {}) {
  const { notify = true } = options;

  clearStoredTokens();
  clearStoredUserRole();

  if (notify) {
    window.dispatchEvent(new Event(authSessionExpiredEvent));
  }
}

function shouldSkipRefresh(url?: string) {
  return [
    "/auth/login",
    "/auth/google",
    "/auth/forgot-password",
    "/auth/verify-reset-otp",
    "/auth/reset-password",
    "/auth/register",
    "/auth/refresh-token",
  ].some((path) => url?.includes(path));
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    const legacyRefreshToken = getLegacyRefreshToken();
    refreshRequest = axios
      .post<RefreshResponse>(
        `${API_BASE_URL}/auth/refresh-token`,
        {},
        {
          withCredentials: true,
          headers: legacyRefreshToken
            ? { Authorization: `Bearer ${legacyRefreshToken}` }
            : undefined,
        },
      )
      .then((res) => res.data.data)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

function storeAuthTokens(data: RefreshResponse["data"]) {
  const accessToken = data?.accessToken;

  if (!accessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  setAccessToken(accessToken);
  clearLegacyRefreshToken();

  const role = data.role ?? data.user?.role;

  if (isUserRole(role)) {
    setStoredUserRole(role);
  }

  return accessToken;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    setAuthorizationHeader(config, token);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshData = await refreshAccessToken();
      const accessToken = storeAuthTokens(refreshData);

      setAuthorizationHeader(originalRequest, accessToken);

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthStorage();
      return Promise.reject(refreshError);
    }
  },
);
