export type FranchiseApplicationDraft = {
  fullName: string;
  mobileNumber: string;
  email: string;
  preferredCity: string;
  state: string;
  fullAddress: string;
  investmentBudget: string;
  preferredStoreFormat: string;
  additionalMessage: string;
};

export type FranchiseApplicationFieldErrors = Partial<Record<keyof FranchiseApplicationDraft, string>>;

export function validateFranchiseApplication(draft: FranchiseApplicationDraft): FranchiseApplicationFieldErrors {
  const errors: FranchiseApplicationFieldErrors = {};
  const requiredFields: Array<keyof FranchiseApplicationDraft> = [
    'fullName', 'mobileNumber', 'email', 'preferredCity', 'state',
    'fullAddress', 'investmentBudget', 'preferredStoreFormat',
  ];

  for (const field of requiredFields) {
    if (!draft[field].trim()) errors[field] = 'This field is required.';
  }

  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  const compactPhone = draft.mobileNumber.trim().replace(/[\s().-]/g, '');
  const digits = compactPhone.replace(/\D/g, '');
  const validMobile = /^\+[1-9]\d{7,14}$/.test(compactPhone)
    || /^[6-9]\d{9}$/.test(digits)
    || /^91[6-9]\d{9}$/.test(digits)
    || /^0[6-9]\d{9}$/.test(digits);
  if (draft.mobileNumber.trim() && !validMobile) {
    errors.mobileNumber = 'Enter a valid mobile number.';
  }

  if (draft.investmentBudget.trim()
    && (!Number.isFinite(Number(draft.investmentBudget)) || Number(draft.investmentBudget) < 1)) {
    errors.investmentBudget = 'Enter an investment budget greater than zero.';
  }

  return errors;
}
