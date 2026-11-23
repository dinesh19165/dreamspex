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

export type FranchiseEnquiryDraft = {
  fullName: string;
  mobileNumber: string;
  email: string;
  preferredCity: string;
  state: string;
  currentOccupation: string;
  availableInvestmentRange: string;
  preferredStoreLocation: string;
  ownsCommercialProperty: string;
  additionalMessage: string;
};

export type FranchiseEnquiryFieldErrors = Partial<Record<keyof FranchiseEnquiryDraft, string>>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidMobileNumber(value: string) {
  const compactPhone = value.trim().replace(/[\s().-]/g, '');
  const digits = compactPhone.replace(/\D/g, '');
  return /^\+[1-9]\d{7,14}$/.test(compactPhone)
    || /^[6-9]\d{9}$/.test(digits)
    || /^91[6-9]\d{9}$/.test(digits)
    || /^0[6-9]\d{9}$/.test(digits);
}

export function validateFranchiseApplication(draft: FranchiseApplicationDraft): FranchiseApplicationFieldErrors {
  const errors: FranchiseApplicationFieldErrors = {};
  const requiredFields: Array<keyof FranchiseApplicationDraft> = [
    'fullName', 'mobileNumber', 'email', 'preferredCity', 'state',
    'fullAddress', 'investmentBudget', 'preferredStoreFormat',
  ];

  for (const field of requiredFields) {
    if (!draft[field].trim()) errors[field] = 'This field is required.';
  }

  if (draft.email.trim() && !isValidEmail(draft.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (draft.mobileNumber.trim() && !isValidMobileNumber(draft.mobileNumber)) {
    errors.mobileNumber = 'Enter a valid mobile number.';
  }

  if (draft.investmentBudget.trim()
    && (!Number.isFinite(Number(draft.investmentBudget)) || Number(draft.investmentBudget) < 1)) {
    errors.investmentBudget = 'Enter an investment budget greater than zero.';
  }

  return errors;
}

export function validateFranchiseEnquiry(draft: FranchiseEnquiryDraft): FranchiseEnquiryFieldErrors {
  const errors: FranchiseEnquiryFieldErrors = {};
  const requiredFields: Array<keyof FranchiseEnquiryDraft> = [
    'fullName', 'mobileNumber', 'preferredCity', 'state',
  ];

  for (const field of requiredFields) {
    if (!draft[field].trim()) errors[field] = 'This field is required.';
  }

  if (draft.email.trim() && !isValidEmail(draft.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (draft.mobileNumber.trim() && !isValidMobileNumber(draft.mobileNumber)) {
    errors.mobileNumber = 'Enter a valid mobile number.';
  }

  return errors;
}
