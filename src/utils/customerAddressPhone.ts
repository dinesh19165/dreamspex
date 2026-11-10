import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

export type PhoneCountry = {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
};

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

function flagForCountry(code: string) {
  return String.fromCodePoint(...[...code].map((letter) => letter.charCodeAt(0) + 127397));
}

export const phoneCountries: PhoneCountry[] = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    callingCode: getCountryCallingCode(code),
    flag: flagForCountry(code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function resolveCountryCode(value: string | null | undefined): CountryCode {
  const normalized = value?.trim().toUpperCase();
  if (normalized && phoneCountries.some((country) => country.code === normalized)) {
    return normalized as CountryCode;
  }
  const matchingName = phoneCountries.find((country) =>
    country.name.toLocaleLowerCase() === value?.trim().toLocaleLowerCase());
  return matchingName?.code ?? 'IN';
}

export function formatPhoneInput(value: string, countryCode: string) {
  const country = resolveCountryCode(countryCode);
  const raw = value.trim();
  const parsed = parsePhoneNumberFromString(raw, country);
  const callingCode = getCountryCallingCode(country);
  if (parsed?.isValid() && parsed.countryCallingCode === callingCode
      && (!parsed.country || parsed.country === country)) {
    return {
      phone: parsed.number,
      nationalNumber: parsed.nationalNumber,
    };
  }

  if (!raw.startsWith('+')) {
    const digits = raw.replace(/\D/g, '');
    const nationalNumber = digits.startsWith(callingCode) && digits.length > callingCode.length
      ? digits.slice(callingCode.length)
      : digits;
    const localNumber = parsePhoneNumberFromString(nationalNumber, country);
    if (localNumber?.isValid()) {
      return {
        phone: localNumber.number,
        nationalNumber: localNumber.nationalNumber,
      };
    }
  }
  return null;
}

export function phoneInputFromSavedAddress(phone: string, countryCode: string) {
  const resolvedCountry = resolveCountryCode(countryCode);
  const formattedPhone = formatPhoneInput(phone, resolvedCountry);
  if (formattedPhone) {
    return {
      countryCode: resolvedCountry,
      phone: formattedPhone.nationalNumber,
    };
  }

  const digits = phone.replace(/\D/g, '');
  const callingCode = getCountryCallingCode(resolvedCountry);
  return {
    countryCode: resolvedCountry,
    phone: digits.startsWith(callingCode) && digits.length > callingCode.length
      ? digits.slice(callingCode.length)
      : digits,
  };
}
