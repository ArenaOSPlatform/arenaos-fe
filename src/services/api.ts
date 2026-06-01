import axios, { AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  clearStoredUserRole,
  isUserRole,
  setStoredUserRole,
  type UserRole,
} from "@/routes/route-role";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const authSessionExpiredEvent = "arenaos:auth-session-expired";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
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

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  clearStoredUserRole();

  if (notify) {
    window.dispatchEvent(new Event(authSessionExpiredEvent));
  }
}

function shouldSkipRefresh(url?: string) {
  return ["/auth/login", "/auth/register", "/auth/refresh"].some((path) =>
    url?.includes(path),
  );
}

async function refreshAccessToken(refreshToken: string) {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<RefreshResponse>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
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
  const refreshToken = data?.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error("Refresh response did not include tokens");
  }

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);

  const role = data.role ?? data.user?.role;

  if (isUserRole(role)) {
    setStoredUserRole(role);
  }

  return accessToken;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

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

    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      clearAuthStorage();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshData = await refreshAccessToken(refreshToken);
      const accessToken = storeAuthTokens(refreshData);

      setAuthorizationHeader(originalRequest, accessToken);

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthStorage();
      return Promise.reject(refreshError);
    }
  },
);
