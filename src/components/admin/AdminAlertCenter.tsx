import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Volume2, VolumeX, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { AdminAlertApiError, adminAlertService, getNewAdminAlerts, type AdminAlert } from '../../services/adminAlertService';
import {
  getAdminAlertAudioContext,
  getExistingAdminAlertAudioContext,
  isAdminAlertAudioReady,
  readAdminAlertSoundPreference,
  resumeAdminAlertAudio,
  startAdminAlertAlarm,
  stopAdminAlertAlarm,
  writeAdminAlertSoundPreference,
} from '../../utils/adminAlertAudio';

function alertPath(alert: AdminAlert) {
  if (alert.type === 'ORDER') return `/admin/orders?q=${encodeURIComponent(alert.orderNumber)}`;
  const params = new URLSearchParams({ orderId: alert.orderId, requestId: alert.sourceId });
  return `/admin/returns?${params.toString()}`;
}

function alertTypeLabel(type: AdminAlert['type']) {
  if (type === 'ORDER') return 'New order';
  if (type === 'REPLACEMENT') return 'Replacement request';
  return 'Refund request';
}

function alertTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export default function AdminAlertCenter() {
  const { user, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [toasts, setToasts] = useState<AdminAlert[]>([]);
  const [soundOn, setSoundOn] = useState(readAdminAlertSoundPreference);
  const [audioReady, setAudioReady] = useState(isAdminAlertAudioReady);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const seenIds = useRef<Set<string> | null>(null);
  const pollInProgress = useRef(false);
  const mounted = useRef(false);

  const request = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!user) throw new Error('Your admin session has expired. Please sign in again.');
    const token = user.accessToken ?? await refreshAccessToken();
    if (!token) throw new Error('Your admin session has expired. Please sign in again.');
    try { return await operation(token); }
    catch (reason) {
      if (!(reason instanceof AdminAlertApiError) || reason.status !== 401) throw reason;
      const refreshed = await refreshAccessToken(token);
      if (!refreshed) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(refreshed);
    }
  }, [refreshAccessToken, user]);

  const enqueueSound = useCallback((type: AdminAlert['type']) => {
    const context = getExistingAdminAlertAudioContext();
    if (soundOn && audioReady && context?.state === 'running') startAdminAlertAlarm(context, type);
  }, [audioReady, soundOn]);

  const loadAlerts = useCallback(async () => {
    if (!user || pollInProgress.current) return;
    pollInProgress.current = true;
    try {
      const nextAlerts = await request(adminAlertService.list);
      if (!mounted.current) return;
      const known = seenIds.current;
      const newAlerts = getNewAdminAlerts(nextAlerts, known);
      seenIds.current = new Set(nextAlerts.map((alert) => alert.id));
      setAlerts(nextAlerts);
      setError('');
      if (newAlerts.length) {
        setToasts((current) => [...current, ...newAlerts]);
        newAlerts.forEach((alert) => {
          enqueueSound(alert.type);
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(alert.title, {
              body: `${alert.customerName} · Order ${alert.orderNumber}`,
              tag: `dream-spex-admin-alert-${alert.id}`,
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
              navigate(alertPath(alert));
            };
          }
        });
      }
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Unable to load admin alerts.');
    } finally {
      pollInProgress.current = false;
    }
  }, [enqueueSound, navigate, request, user]);

  useEffect(() => {
    mounted.current = true;
    void loadAlerts();
    const interval = window.setInterval(() => { void loadAlerts(); }, 5000);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  const pendingAlerts = alerts.filter((alert) => !alert.acknowledgedAt && !alert.resolvedAt);
  const firstPendingType = pendingAlerts[0]?.type;

  useEffect(() => {
    if (!pendingAlerts.length || !soundOn) {
      stopAdminAlertAlarm();
      return;
    }
    const context = getExistingAdminAlertAudioContext();
    if (audioReady && context?.state === 'running' && firstPendingType) startAdminAlertAlarm(context, firstPendingType);
  }, [audioReady, firstPendingType, pendingAlerts.length, soundOn]);

  useEffect(() => {
    if (!toasts.length) return;
    const timeout = window.setTimeout(() => setToasts((current) => current.slice(1)), 5000);
    return () => window.clearTimeout(timeout);
  }, [toasts]);

  useEffect(() => {
    try { writeAdminAlertSoundPreference(soundOn); }
    catch { setError('Unable to save the sound preference in this browser.'); }
  }, [soundOn]);

  useEffect(() => {
    const context = getExistingAdminAlertAudioContext();
    if (!context) return;
    const onStateChange = () => setAudioReady(context.state === 'running');
    context.addEventListener('statechange', onStateChange);
    onStateChange();
    return () => {
      context.removeEventListener('statechange', onStateChange);
    };
  }, [audioReady]);

  const enableSound = async () => {
    try {
      setSoundOn(true);
      const context = getAdminAlertAudioContext();
      if (!await resumeAdminAlertAudio(context)) throw new Error('Browser audio is still blocked. Click Enable sound to try again.');
      setAudioReady(true);
      setError('');
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to enable sound alerts.');
    }
  };

  const acknowledge = async (alert: AdminAlert) => {
    setBusyId(alert.id);
    try {
      const updated = await request((token) => adminAlertService.acknowledge(token, alert.id));
      setAlerts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setToasts((current) => current.filter((item) => item.id !== alert.id));
      const remaining = alerts.filter((item) => item.id !== updated.id && !item.acknowledgedAt && !item.resolvedAt);
      if (!remaining.length) {
        stopAdminAlertAlarm();
      } else {
        const context = getExistingAdminAlertAudioContext();
        if (soundOn && audioReady && context?.state === 'running') startAdminAlertAlarm(context, remaining[0].type);
      }
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to acknowledge the alert.');
      return false;
    } finally {
      setBusyId('');
    }
  };

  const openAlert = (alert: AdminAlert) => navigate(alertPath(alert));

  const acknowledgeAll = async () => {
    setBusyId('all');
    try {
      await request(adminAlertService.acknowledgeAll);
      const acknowledgedAt = new Date().toISOString();
      setAlerts((current) => current.map((alert) => !alert.resolvedAt && !alert.acknowledgedAt
        ? { ...alert, acknowledgedAt } : alert));
      setToasts([]);
      stopAdminAlertAlarm();
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to acknowledge all alerts.');
    } finally {
      setBusyId('');
    }
  };

  const toggleSound = () => {
    if (soundOn) {
      setSoundOn(false);
      stopAdminAlertAlarm();
    } else {
      void enableSound();
    }
  };

  return <section className="relative mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5" aria-label="Admin notifications">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen((current) => !current)}
          aria-expanded={open} aria-label={`Notifications, ${pendingAlerts.length} unread`}
          className="relative rounded-full border border-[var(--border-subtle)] p-3 text-[var(--text-primary)] hover:border-[var(--brand-green)]">
          <Bell className="h-5 w-5" />
          {pendingAlerts.length ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{pendingAlerts.length}</span> : null}
        </button>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">Live admin alerts</h2>
          <p className="text-xs text-[var(--text-secondary)]">{pendingAlerts.length} awaiting acknowledgement</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {soundOn && !audioReady ? <button type="button" onClick={() => void enableSound()}
          className="rounded-full bg-[var(--brand-green)] px-4 py-2 text-xs font-semibold text-white">Enable sound</button> : null}
        <button type="button" onClick={toggleSound} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Sound {soundOn ? 'ON' : 'OFF'}
        </button>
        {pendingAlerts.length ? <button type="button" disabled={busyId === 'all'} onClick={() => void acknowledgeAll()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-50">
          <CheckCheck className="h-4 w-4" />Mark all as read
        </button> : null}
      </div>
    </div>
    {error ? <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p> : null}
    {open ? <div className="absolute right-2 top-[calc(100%-0.25rem)] z-40 max-h-[min(70vh,34rem)] w-[min(94vw,30rem)] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-2xl sm:right-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold">Notifications</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X className="h-4 w-4" /></button>
      </div>
      {alerts.length ? <div className="space-y-2">{alerts.map((alert) => {
        const active = !alert.acknowledgedAt && !alert.resolvedAt;
        return <article key={alert.id} className={`rounded-xl border p-3 ${active ? 'border-[var(--brand-green)]/40 bg-[var(--brand-green)]/5' : 'border-[var(--border-subtle)] opacity-75'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.title}</p>
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{alert.customerName} · Order {alert.orderNumber}</p>
              <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">Order ID: {alert.orderId}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{alertTypeLabel(alert.type)} · {alertTime(alert.eventAt)}</p>
            </div>
            {active ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-green)]" aria-label="Unread" /> : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" disabled={busyId === alert.id} onClick={() => void openAlert(alert)}
              className="text-xs font-semibold text-[var(--brand-green-dark)] underline underline-offset-2">
              {alert.type === 'ORDER' ? 'View order' : 'View request'}
            </button>
            {active ? <button type="button" disabled={busyId === alert.id} onClick={() => void acknowledge(alert)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              <Check className="h-3 w-3" />Acknowledge
            </button> : <span className="text-[11px] text-[var(--text-secondary)]">{alert.resolvedAt ? 'Resolved' : 'Acknowledged'}</span>}
          </div>
        </article>;
      })}</div> : <p className="rounded-xl bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">No notifications yet.</p>}
    </div> : null}
    {toasts.length ? <div className="fixed right-4 top-4 z-[150] w-[min(92vw,24rem)] space-y-2" aria-live="polite">
      {toasts.slice(0, 3).map((toast) => <div key={toast.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--brand-green)]/50 bg-[var(--bg-card)] p-4 text-[var(--text-primary)] shadow-xl">
        <div><p className="text-sm font-semibold">{toast.title}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{toast.customerName} · Order {toast.orderNumber}</p></div>
        <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss toast"><X className="h-4 w-4" /></button>
      </div>)}
    </div> : null}
  </section>;
}
