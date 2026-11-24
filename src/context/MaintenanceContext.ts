import { createContext, useContext } from 'react';
import type { PublicMaintenanceStatus } from '../services/maintenanceService';

export type MaintenanceContextValue = {
  status: PublicMaintenanceStatus | null;
  loading: boolean;
  unavailable: boolean;
  refresh: () => Promise<void>;
};

export const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (!context) throw new Error('useMaintenance must be used within MaintenanceProvider');
  return context;
}
