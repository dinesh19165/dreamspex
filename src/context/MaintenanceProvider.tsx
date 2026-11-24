import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MaintenanceContext } from './MaintenanceContext';
import { maintenanceService, type PublicMaintenanceStatus } from '../services/maintenanceService';

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PublicMaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const request = (async () => {
      try {
        setStatus(await maintenanceService.publicStatus());
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      } finally {
        setLoading(false);
      }
    })();
    inFlight.current = request;
    try {
      await request;
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return (
    <MaintenanceContext.Provider value={{ status, loading, unavailable, refresh }}>
      {children}
    </MaintenanceContext.Provider>
  );
}
