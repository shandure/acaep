const SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "JPY"] as const;
type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const DECIMAL_PLACES: Record<Currency, number> = {
  USD: 2,
  GBP: 2,
  EUR: 2,
  JPY: 0, // Yen has no subunit
};

/**
 * Formats a numeric amount as a currency string.
 * @param amount - The numeric amount (e.g. 1234.5)
 * @param currency - ISO 4217 currency code (default: "USD")
 * @returns Formatted string e.g. "$1,234.50" or "£999.00"
 */
export function formatCurrency(amount: number, currency: Currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: DECIMAL_PLACES[currency],
    maximumFractionDigits: DECIMAL_PLACES[currency],
  }).format(amount);
}

/**
 * Parses a formatted currency string back to a number.
 * Strips currency symbols, commas, and whitespace before parsing.
 * Returns NaN if the string cannot be parsed.
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  return parseFloat(cleaned);
}

/**
 * Converts an amount between two supported currencies using a fixed rate table.
 * In production, rates are fetched from the FX rates service.
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number
): number {
  if (from === to) return amount;
  const decimals = DECIMAL_PLACES[to];
  const converted = amount * rate;
  return parseFloat(converted.toFixed(decimals));
}

/**
 * Calculates the total trade value in a given currency.
 * quantity × price, formatted as a currency string.
 */
export function tradeValue(quantity: number, price: number, currency: Currency = "USD"): string {
  return formatCurrency(quantity * price, currency);
}
