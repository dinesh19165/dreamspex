import { describe, expect, it } from 'vitest';
import {
  validateFranchiseApplication,
  validateFranchiseEnquiry,
  type FranchiseApplicationDraft,
  type FranchiseEnquiryDraft,
} from './franchiseApplicationValidation';

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

const validEnquiry: FranchiseEnquiryDraft = {
  fullName: 'Asha Rao',
  mobileNumber: '+91 98765 43210',
  email: '',
  preferredCity: 'Hyderabad',
  state: 'Telangana',
  currentOccupation: '',
  availableInvestmentRange: '',
  preferredStoreLocation: '',
  ownsCommercialProperty: '',
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

describe('franchise enquiry validation', () => {
  it('accepts optional email and optional enquiry details', () => {
    expect(validateFranchiseEnquiry(validEnquiry)).toEqual({});
  });

  it('requires contact and preferred location fields and validates supplied email and mobile', () => {
    const errors = validateFranchiseEnquiry({
      ...validEnquiry,
      fullName: '',
      mobileNumber: '123',
      email: 'not-an-email',
      preferredCity: '',
      state: '',
    });

    expect(errors.fullName).toBeDefined();
    expect(errors.mobileNumber).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.preferredCity).toBeDefined();
    expect(errors.state).toBeDefined();
  });
});
