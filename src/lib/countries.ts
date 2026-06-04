// Country → reimbursement-currency seeding for onboarding/Settings.
// The picked currency is only a sensible default — the user can override it.

export interface CountryOption {
  country: string;
  currency: string; // ISO 4217
}

// SEA team first (the primary users), then a small set of common others.
export const COUNTRY_OPTIONS: CountryOption[] = [
  { country: "Vietnam", currency: "VND" },
  { country: "Thailand", currency: "THB" },
  { country: "Cambodia", currency: "KHR" },
  { country: "Myanmar", currency: "MMK" },
  { country: "Australia", currency: "AUD" },
  { country: "Singapore", currency: "SGD" },
  { country: "Malaysia", currency: "MYR" },
  { country: "Indonesia", currency: "IDR" },
  { country: "Philippines", currency: "PHP" },
  { country: "United States", currency: "USD" },
  { country: "United Kingdom", currency: "GBP" },
];

const CURRENCY_BY_COUNTRY = new Map(COUNTRY_OPTIONS.map((o) => [o.country, o.currency]));

/** The default reimbursement currency for a home country. Falls back to VND. */
export function currencyForCountry(country: string): string {
  return CURRENCY_BY_COUNTRY.get(country) ?? "VND";
}

// Friendly names for the currencies a reimbursement might use. Used in the picker label.
export const CURRENCY_NAME: Record<string, string> = {
  VND: "Vietnamese đồng",
  THB: "Thai baht",
  KHR: "Cambodian riel",
  MMK: "Myanmar kyat",
  AUD: "Australian dollar",
  SGD: "Singapore dollar",
  MYR: "Malaysian ringgit",
  IDR: "Indonesian rupiah",
  PHP: "Philippine peso",
  USD: "US dollar",
  GBP: "Pound sterling",
};

/** Distinct reimbursement currencies offered in the override picker. */
export const CURRENCIES: string[] = Array.from(new Set(COUNTRY_OPTIONS.map((o) => o.currency)));

export function currencyLabel(code: string): string {
  const name = CURRENCY_NAME[code];
  return name ? `${code} — ${name}` : code;
}
