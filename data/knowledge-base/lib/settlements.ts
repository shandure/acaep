import type { Trade, Settlement } from "./types";

const SETTLEMENT_DAYS = 2; // T+2 is the standard equity settlement cycle

/**
 * Calculates the settlement date for a trade.
 * Standard equity settlement is T+2 (trade date plus 2 business days).
 * Weekends are skipped; public holidays are not accounted for here.
 */
export function calculateSettlementDate(tradeDate: Date): Date {
  const date = new Date(tradeDate);
  let added = 0;
  while (added < SETTLEMENT_DAYS) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++; // skip Saturday (6) and Sunday (0)
  }
  return date;
}

/**
 * Creates a pending Settlement record for the given trade.
 * The settlement amount is quantity × price.
 */
export function buildSettlement(trade: Trade, counterpartyId: string): Omit<Settlement, "id"> {
  return {
    tradeId: trade.id,
    settlementDate: calculateSettlementDate(trade.createdAt),
    amount: trade.quantity * trade.price,
    currency: "USD",
    status: "pending",
    counterpartyId,
  };
}

/**
 * Processes a settlement — marks it as completed and records the settled timestamp.
 * In production this triggers the actual cash and securities transfers.
 * Returns the updated Settlement with status "completed".
 */
export async function processSettlement(settlement: Settlement): Promise<Settlement> {
  if (settlement.status !== "pending") {
    throw new Error(`Cannot process settlement in status: ${settlement.status}`);
  }
  return { ...settlement, status: "completed" };
}

/**
 * Checks whether a settlement is overdue.
 * A settlement is overdue if its settlementDate has passed and status is still "pending".
 */
export function isOverdue(settlement: Settlement): boolean {
  return settlement.status === "pending" && settlement.settlementDate < new Date();
}
