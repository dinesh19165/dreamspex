import { describe, expect, it } from 'vitest';
import { validateFranchiseApplication, type FranchiseApplicationDraft } from './franchiseApplicationValidation';

const validDraft: FranchiseApplicationDraft = {
  fullName: 'Asha Rao',
  mobileNumber: '+91 98765 43210',
  email: 'asha@example.com',
  preferredCity: 'Hyderabad',
  state: 'Telangana',
  fullAddress: '12 Main Road, Hyderabad',
  investmentBudget: '750000',
  preferredStoreFormat: 'BOUTIQUE',
  additionalMessage: '',
};

describe('franchise application validation', () => {
  it('accepts a complete application with an Indian mobile number', () => {
    expect(validateFranchiseApplication(validDraft)).toEqual({});
  });

  it('requires all application fields except the additional message', () => {
    const errors = validateFranchiseApplication({
      ...validDraft,
      fullName: '',
      mobileNumber: '',
      email: '',
      preferredCity: '',
      state: '',
      fullAddress: '',
      investmentBudget: '',
      preferredStoreFormat: '',
    });

    expect(Object.keys(errors)).toHaveLength(8);
    expect(errors.additionalMessage).toBeUndefined();
  });

  it('rejects invalid email, mobile number, and budget values', () => {
    const errors = validateFranchiseApplication({
      ...validDraft,
      email: 'not-an-email',
      mobileNumber: '123',
      investmentBudget: '0',
    });

    expect(errors.email).toBeDefined();
    expect(errors.mobileNumber).toBeDefined();
    expect(errors.investmentBudget).toBeDefined();
  });
});
