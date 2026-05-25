import type { Trade } from "./types";

const store = new Map<string, Trade>();

/**
 * Creates a new trade and persists it in the store.
 * Trade starts in "pending" status until it is settled.
 */
export async function createTrade(
  traderId: string,
  symbol: string,
  quantity: number,
  price: number,
  side: "buy" | "sell"
): Promise<Trade> {
  if (quantity <= 0) throw new Error("Quantity must be positive");
  if (price <= 0) throw new Error("Price must be positive");

  const trade: Trade = {
    id: crypto.randomUUID(),
    traderId,
    symbol: symbol.toUpperCase(),
    quantity,
    price,
    side,
    status: "pending",
    createdAt: new Date(),
    settledAt: null,
  };

  store.set(trade.id, trade);
  return trade;
}

/**
 * Retrieves a single trade by its ID.
 * Returns null if the trade does not exist.
 */
export async function getTradeById(id: string): Promise<Trade | null> {
  return store.get(id) ?? null;
}

/**
 * Returns all trades for a specific trader, sorted newest-first.
 */
export async function getTradesByTrader(traderId: string): Promise<Trade[]> {
  return [...store.values()]
    .filter(t => t.traderId === traderId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Marks a trade as settled and records the settlement timestamp.
 */
export async function markTradeSettled(id: string): Promise<Trade> {
  const trade = store.get(id);
  if (!trade) throw new Error(`Trade not found: ${id}`);
  const updated = { ...trade, status: "settled" as const, settledAt: new Date() };
  store.set(id, updated);
  return updated;
}

/**
 * Cancels a pending trade. Throws if the trade is already settled.
 */
export async function cancelTrade(id: string): Promise<Trade> {
  const trade = store.get(id);
  if (!trade) throw new Error(`Trade not found: ${id}`);
  if (trade.status === "settled") throw new Error("Cannot cancel a settled trade");
  const updated = { ...trade, status: "cancelled" as const };
  store.set(id, updated);
  return updated;
}
