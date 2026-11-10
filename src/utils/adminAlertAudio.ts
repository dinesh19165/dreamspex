export const ADMIN_ALERT_SOUND_PREFERENCE_KEY = 'dream-spex-admin-alert-sound';
export const ADMIN_ALERT_PULSE_INTERVAL_MS = 1_100;

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

let sharedAudioContext: AudioContext | null = null;
let alarmContext: AudioContext | null = null;
let alarmType: 'ORDER' | 'REFUND' | 'REPLACEMENT' = 'ORDER';
let alarmInterval: ReturnType<typeof setInterval> | null = null;
let pulseInProgress = false;
let stopPulse: (() => void) | null = null;
let alarmStateListener: (() => void) | null = null;
let alarmListenerContext: AudioContext | null = null;

export function readAdminAlertSoundPreference(storage?: StorageReader) {
  try {
    return (storage ?? window.localStorage).getItem(ADMIN_ALERT_SOUND_PREFERENCE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeAdminAlertSoundPreference(enabled: boolean, storage?: StorageWriter) {
  (storage ?? window.localStorage).setItem(ADMIN_ALERT_SOUND_PREFERENCE_KEY, enabled ? 'on' : 'off');
}

export function getAdminAlertAudioContext() {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const Context = window.AudioContext;
    if (!Context) throw new Error('This browser does not support audio alerts.');
    sharedAudioContext = new Context();
  }
  return sharedAudioContext;
}

export function getExistingAdminAlertAudioContext() {
  return sharedAudioContext;
}

export function isAdminAlertAudioReady() {
  return sharedAudioContext?.state === 'running';
}

export async function resumeAdminAlertAudio(context: AudioContext) {
  if (context.state === 'closed') throw new Error('Admin alert audio is closed. Reload the dashboard to enable it again.');
  if (context.state !== 'running') await context.resume();
  return context.state === 'running';
}

export function playAdminAlertTone(context: AudioContext, type: 'ORDER' | 'REFUND' | 'REPLACEMENT', onended: () => void) {
  if (context.state !== 'running') return null;

  const notes = type === 'ORDER' ? [784, 988, 1175]
    : type === 'REFUND' ? [659, 831, 988]
      : [880, 1109, 1318];
  const startAt = context.currentTime;
  const oscillators: OscillatorNode[] = [];
  let remaining = notes.length;
  let cancelled = false;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + index * 0.14;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      remaining -= 1;
      if (!cancelled && remaining === 0) onended();
    };
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.13);
    oscillators.push(oscillator);
  });

  return () => {
    cancelled = true;
    oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* It may already have stopped. */ }
    });
  };
}

function playAlarmPulse() {
  if (!alarmContext || alarmContext.state !== 'running' || pulseInProgress) return;
  pulseInProgress = true;
  stopPulse = playAdminAlertTone(alarmContext, alarmType, () => {
    stopPulse = null;
    pulseInProgress = false;
  });
  if (!stopPulse) pulseInProgress = false;
}

export function startAdminAlertAlarm(context: AudioContext, type: 'ORDER' | 'REFUND' | 'REPLACEMENT') {
  if (alarmListenerContext && alarmListenerContext !== context && alarmStateListener) {
    alarmListenerContext.removeEventListener('statechange', alarmStateListener);
    alarmStateListener = null;
    alarmListenerContext = null;
  }
  alarmContext = context;
  alarmType = type;
  if (!alarmStateListener) {
    alarmStateListener = () => {
      if (alarmContext?.state === 'running') playAlarmPulse();
    };
    context.addEventListener('statechange', alarmStateListener);
    alarmListenerContext = context;
  }
  if (alarmInterval) {
    playAlarmPulse();
    return;
  }
  playAlarmPulse();
  alarmInterval = setInterval(playAlarmPulse, ADMIN_ALERT_PULSE_INTERVAL_MS);
}

export function stopAdminAlertAlarm() {
  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = null;
  stopPulse?.();
  stopPulse = null;
  pulseInProgress = false;
  if (alarmListenerContext && alarmStateListener) {
    alarmListenerContext.removeEventListener('statechange', alarmStateListener);
  }
  alarmStateListener = null;
  alarmListenerContext = null;
  alarmContext = null;
}
