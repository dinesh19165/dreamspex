import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_ALERT_PULSE_INTERVAL_MS,
  ADMIN_ALERT_SOUND_PREFERENCE_KEY,
  readAdminAlertSoundPreference,
  resumeAdminAlertAudio,
  startAdminAlertAlarm,
  stopAdminAlertAlarm,
  writeAdminAlertSoundPreference,
} from './adminAlertAudio';

afterEach(() => {
  stopAdminAlertAlarm();
  vi.useRealTimers();
});

describe('admin alert audio preferences and lifecycle', () => {
  it('persists and restores the sound preference', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(readAdminAlertSoundPreference(storage)).toBe(true);
    writeAdminAlertSoundPreference(false, storage);
    expect(values.get(ADMIN_ALERT_SOUND_PREFERENCE_KEY)).toBe('off');
    expect(readAdminAlertSoundPreference(storage)).toBe(false);
    writeAdminAlertSoundPreference(true, storage);
    expect(readAdminAlertSoundPreference(storage)).toBe(true);
  });

  it.each(['suspended', 'interrupted'])('resumes audio from the %s state', async (initialState) => {
    let state = initialState;
    const context = {
      get state() { return state; },
      resume: vi.fn(async () => { state = 'running'; }),
    } as unknown as AudioContext;

    await expect(resumeAdminAlertAudio(context)).resolves.toBe(true);
    expect(context.resume).toHaveBeenCalledOnce();
    expect(state).toBe('running');
  });

  it('plays non-overlapping short pulses continuously and stops when acknowledged', () => {
    vi.useFakeTimers();
    const oscillators: Array<{
      onended: (() => void) | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
      type: OscillatorType;
    }> = [];
    const context = {
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => {
        const oscillator = {
          onended: null as (() => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn((when?: number) => {
            if (when === undefined) oscillator.onended?.();
            else setTimeout(() => oscillator.onended?.(), when * 1000);
          }),
          frequency: { setValueAtTime: vi.fn() },
          type: 'sine' as OscillatorType,
        };
        oscillators.push(oscillator);
        return oscillator;
      }),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as AudioContext;

    startAdminAlertAlarm(context, 'ORDER');
    expect(oscillators).toHaveLength(3);
    vi.advanceTimersByTime(200);
    expect(oscillators).toHaveLength(3);
    vi.advanceTimersByTime(ADMIN_ALERT_PULSE_INTERVAL_MS - 200);
    expect(oscillators).toHaveLength(6);

    stopAdminAlertAlarm();
    vi.advanceTimersByTime(ADMIN_ALERT_PULSE_INTERVAL_MS * 3);
    expect(oscillators).toHaveLength(6);

    startAdminAlertAlarm(context, 'REFUND');
    expect(oscillators).toHaveLength(9);
    stopAdminAlertAlarm();
  });
});
