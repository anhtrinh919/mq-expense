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
