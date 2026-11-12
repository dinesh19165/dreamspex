import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type FranchiseApplicationSubmission = {
  fullName: string;
  mobileNumber: string;
  email: string;
  preferredCity: string;
  state: string;
  fullAddress: string;
  investmentBudget: number;
  preferredStoreFormat: string;
  additionalMessage: string;
};

export type FranchiseApplicationStatus =
  | 'PENDING'
  | 'CONTACTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type FranchiseApplicationCreated = {
  referenceId: string;
  status: FranchiseApplicationStatus;
  createdAt: string;
};

export type AdminFranchiseApplication = Omit<FranchiseApplicationSubmission, 'additionalMessage'> & {
  additionalMessage: string | null;
  id: string;
  referenceId: string;
  status: FranchiseApplicationStatus;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

async function errorMessage(response: Response, fallback: string) {
  const problem = await response.json().catch(() => ({})) as {
    message?: string;
    fieldErrors?: Array<{ field?: string; message?: string }>;
  };
  const fieldErrors = problem.fieldErrors
    ?.map((item) => [item.field, item.message].filter(Boolean).join(': '))
    .filter(Boolean);
  return [problem.message, ...(fieldErrors ?? [])].filter(Boolean).join(' ') || `${fallback} (${response.status}).`;
}

export const franchiseApplicationService = {
  async submit(application: FranchiseApplicationSubmission): Promise<FranchiseApplicationCreated> {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/franchise-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    });
    if (!response.ok) throw new Error(await errorMessage(response, 'Unable to submit the franchise application'));
    return response.json() as Promise<FranchiseApplicationCreated>;
  },

  async adminList(accessToken: string): Promise<AdminFranchiseApplication[]> {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/admin/franchise-applications`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load franchise applications'));
    return response.json() as Promise<AdminFranchiseApplication[]>;
  },

  async adminUpdate(accessToken: string, id: string, status: FranchiseApplicationStatus, internalNote: string) {
    const response = await apiFetch(`${apiBaseUrl}/api/v1/admin/franchise-applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, internalNote }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, 'Unable to update the franchise application'));
    return response.json() as Promise<AdminFranchiseApplication>;
  },
};
