// Shared TypeScript types for the TradeLens platform

export interface User {
  id: string;
  email: string;
  role: "admin" | "trader" | "viewer";
  passwordHash: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface Trade {
  id: string;
  symbol: string;        // e.g. "AAPL", "MSFT"
  quantity: number;
  price: number;
  side: "buy" | "sell";
  status: "pending" | "settled" | "cancelled";
  traderId: string;
  createdAt: Date;
  settledAt: Date | null;
}

export interface Settlement {
  id: string;
  tradeId: string;
  settlementDate: Date;  // typically T+2 from trade execution
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  counterpartyId: string;
}

export interface JWTPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
