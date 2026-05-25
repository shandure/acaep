const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SYMBOL_RE = /^[A-Z]{1,5}$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  if (!email || email.trim().length === 0) errors.push("Email is required");
  else if (!EMAIL_RE.test(email)) errors.push("Email format is invalid");
  return { valid: errors.length === 0, errors };
}

/**
 * Validates the inputs for a new trade order.
 * Symbol must be 1–5 uppercase letters (e.g. "AAPL", "MSFT").
 */
export function validateTradeInput(
  symbol: string,
  quantity: number,
  price: number,
  side: string
): ValidationResult {
  const errors: string[] = [];

  if (!SYMBOL_RE.test(symbol)) errors.push("Symbol must be 1–5 uppercase letters");
  if (!Number.isInteger(quantity) || quantity <= 0) errors.push("Quantity must be a positive integer");
  if (typeof price !== "number" || price <= 0) errors.push("Price must be a positive number");
  if (side !== "buy" && side !== "sell") errors.push('Side must be "buy" or "sell"');

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that an amount is within acceptable range for a trade.
 * Rejects values over $10M to guard against input errors.
 */
export function validateAmount(amount: number): ValidationResult {
  const errors: string[] = [];
  if (typeof amount !== "number" || isNaN(amount)) errors.push("Amount must be a number");
  else if (amount <= 0) errors.push("Amount must be positive");
  else if (amount > 10_000_000) errors.push("Amount exceeds maximum single-trade limit of $10,000,000");
  return { valid: errors.length === 0, errors };
}
