import { createTrade, getTradesByTrader } from "../../../lib/trades";
import { validateTradeInput } from "../../../lib/validators";
import { verifyJWT } from "../../../lib/jwt";

function extractToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/trades
 *
 * Returns all trades for the authenticated trader.
 * Requires a valid JWT cookie.
 */
export async function GET(req: Request): Promise<Response> {
  const token = extractToken(req);
  const payload = token ? verifyJWT(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const trades = await getTradesByTrader(payload.userId);
  return Response.json({ trades });
}

/**
 * POST /api/trades
 *
 * Creates a new trade order for the authenticated trader.
 * Body: { symbol: string, quantity: number, price: number, side: "buy" | "sell" }
 *
 * Validates inputs with validateTradeInput before persisting.
 * Returns the created trade with its assigned ID and "pending" status.
 */
export async function POST(req: Request): Promise<Response> {
  const token = extractToken(req);
  const payload = token ? verifyJWT(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (payload.role === "viewer") {
    return Response.json({ error: "Viewers cannot create trades" }, { status: 403 });
  }

  const body = await req.json();
  const { symbol, quantity, price, side } = body;

  const validation = validateTradeInput(symbol, quantity, price, side);
  if (!validation.valid) {
    return Response.json({ error: "Validation failed", details: validation.errors }, { status: 422 });
  }

  const trade = await createTrade(payload.userId, symbol, quantity, price, side);
  return Response.json({ trade }, { status: 201 });
}
