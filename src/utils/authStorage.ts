const ACCESS_TOKEN_KEY = 'arenaos_access_token';
const LEGACY_ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    return token;
  }

  const legacyToken = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);

  if (legacyToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }

  return legacyToken;
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function getLegacyRefreshToken(): string | null {
  return localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function clearLegacyRefreshToken(): void {
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function clearStoredTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}
