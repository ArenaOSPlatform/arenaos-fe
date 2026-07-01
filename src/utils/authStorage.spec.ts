import { describe, expect, it } from 'vitest';
import {
  clearStoredTokens,
  getAccessToken,
  setAccessToken,
} from './authStorage';

describe('authStorage', () => {
  it('stores access tokens only for the current tab session', () => {
    setAccessToken('access-token');

    expect(getAccessToken()).toBe('access-token');
    expect(sessionStorage.getItem('arenaos_access_token')).toBe('access-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('migrates and removes legacy localStorage access tokens', () => {
    localStorage.setItem('accessToken', 'legacy-token');

    expect(getAccessToken()).toBe('legacy-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('arenaos_access_token')).toBe('legacy-token');
  });

  it('clears current and legacy tokens together', () => {
    setAccessToken('access-token');
    localStorage.setItem('refreshToken', 'legacy-refresh-token');

    clearStoredTokens();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
