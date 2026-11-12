import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type AdminSmsNotification = {
  id: string;
  orderNumber: string;
  maskedPhoneNumber: string;
  notificationType: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  providerMessageId: string | null;
  timestamp: string;
};

export const customerSmsService = {
  async adminHistory(accessToken: string): Promise<AdminSmsNotification[]> {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/admin/sms-notifications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(problem.message ?? `Unable to load SMS notification history (${response.status}).`);
    }
    return response.json() as Promise<AdminSmsNotification[]>;
  },
};
