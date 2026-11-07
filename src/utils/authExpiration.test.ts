import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTokenExpiration,
  scheduleAccessTokenRefresh,
  scheduleIdleTimeout,
  SESSION_IDLE_TIMEOUT_MS,
} from './authExpiration';

describe('auth expiration scheduling', () => {
  afterEach(() => vi.useRealTimers());

  it('expires only after 60 minutes since the last recorded activity', () => {
    vi.useFakeTimers();
    const lastActivityAt = Date.now();
    const onExpire = vi.fn();
    const stop = scheduleIdleTimeout(() => lastActivityAt, onExpire);

    vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledOnce();
    stop();
  });

  it('keeps the session active at 15, 30 and 45 minutes of activity', () => {
    vi.useFakeTimers();
    let lastActivityAt = Date.now();
    const onExpire = vi.fn();
    const stop = scheduleIdleTimeout(() => lastActivityAt, onExpire);

    for (let minute = 15; minute <= 45; minute += 15) {
      vi.advanceTimersByTime(15 * 60 * 1000);
      lastActivityAt = Date.now();
      expect(onExpire).not.toHaveBeenCalled();
    }
    vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS - 1);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledOnce();
    stop();
  });

  it('refreshes an access token one minute before its expiry', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue('new-access-token');
    const onFailure = vi.fn();
    const stop = scheduleAccessTokenRefresh(Date.now() + 15 * 60 * 1000, refresh, onFailure);

    vi.advanceTimersByTime(14 * 60 * 1000 - 1);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledOnce();
    expect(onFailure).not.toHaveBeenCalled();
    stop();
  });

  it('logs out when refresh authentication fails and retries transient failures before expiry', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue(null);
    const onFailure = vi.fn();
    const stop = scheduleAccessTokenRefresh(Date.now() + 15 * 60 * 1000, refresh, onFailure, 1_000);

    await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    expect(refresh).toHaveBeenCalledOnce();
    expect(onFailure).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledOnce();
    stop();
  });

  it('reads the token expiry claim without accepting malformed tokens', () => {
    const payload = btoa(JSON.stringify({ exp: 1_900_000_000 })).replace(/=/g, '');
    expect(getTokenExpiration(`header.${payload}.signature`)).toBe(1_900_000_000_000);
    expect(getTokenExpiration('not-a-jwt')).toBeNull();
  });
});
