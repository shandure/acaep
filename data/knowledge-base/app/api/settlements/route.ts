import { getTradeById } from "../../../lib/trades";
import { buildSettlement, processSettlement, calculateSettlementDate } from "../../../lib/settlements";
import { verifyJWT } from "../../../lib/jwt";

function extractToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * POST /api/settlements
 *
 * Initiates settlement for a given trade.
 * Body: { tradeId: string, counterpartyId: string }
 *
 * Only admin users can trigger settlements.
 * The settlement date is calculated as T+2 business days from the trade date.
 */
export async function POST(req: Request): Promise<Response> {
  const token = extractToken(req);
  const payload = token ? verifyJWT(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (payload.role !== "admin") {
    return Response.json({ error: "Only admins can trigger settlements" }, { status: 403 });
  }

  const { tradeId, counterpartyId } = await req.json();
  if (!tradeId || !counterpartyId) {
    return Response.json({ error: "tradeId and counterpartyId are required" }, { status: 400 });
  }

  const trade = await getTradeById(tradeId);
  if (!trade) return Response.json({ error: "Trade not found" }, { status: 404 });
  if (trade.status !== "pending") {
    return Response.json({ error: `Trade is already ${trade.status}` }, { status: 409 });
  }

  const settlementData = buildSettlement(trade, counterpartyId);
  const settlement = await processSettlement({ ...settlementData, id: crypto.randomUUID() });

  return Response.json({ settlement }, { status: 201 });
}

/**
 * GET /api/settlements/date?tradeDate=2024-01-15
 *
 * Returns the expected settlement date (T+2) for a given trade date.
 * Useful for pre-trade settlement date display in the UI.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const tradeDateStr = url.searchParams.get("tradeDate");
  if (!tradeDateStr) {
    return Response.json({ error: "tradeDate query parameter is required" }, { status: 400 });
  }

  const tradeDate = new Date(tradeDateStr);
  if (isNaN(tradeDate.getTime())) {
    return Response.json({ error: "Invalid date format" }, { status: 400 });
  }

  const settlementDate = calculateSettlementDate(tradeDate);
  return Response.json({ tradeDate: tradeDateStr, settlementDate: settlementDate.toISOString() });
}
