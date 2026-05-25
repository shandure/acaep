# TradeLens API Reference

## Authentication

All API endpoints (except `/api/auth/login`) require a valid JWT in an HttpOnly cookie named `token`. The cookie is set automatically on successful login and expires after 8 hours.

## POST /api/auth/login

Authenticates a user and sets the session cookie.

**Request body:**
```json
{ "email": "trader@firm.com", "password": "secret" }
```

**Success response (200):**
```json
{ "success": true, "role": "trader" }
```

**Error responses:**
- `400` — missing email or password
- `401` — invalid credentials

## DELETE /api/auth/login

Clears the session cookie (logout).

## GET /api/trades

Returns all trades for the authenticated trader, sorted newest-first.

**Success response (200):**
```json
{ "trades": [{ "id": "...", "symbol": "AAPL", "quantity": 100, "price": 175.50, "side": "buy", "status": "pending" }] }
```

## POST /api/trades

Creates a new trade order.

**Request body:**
```json
{ "symbol": "AAPL", "quantity": 100, "price": 175.50, "side": "buy" }
```

**Validation rules:**
- `symbol`: 1–5 uppercase letters
- `quantity`: positive integer
- `price`: positive number
- `side`: "buy" or "sell"

**Error responses:**
- `401` — not authenticated
- `403` — viewer role cannot create trades
- `422` — validation failed

## POST /api/settlements

Initiates settlement for a trade. Admin only.

**Request body:**
```json
{ "tradeId": "...", "counterpartyId": "..." }
```

## GET /api/settlements/date?tradeDate=2024-01-15

Returns the expected T+2 settlement date for a given trade date.

**Success response (200):**
```json
{ "tradeDate": "2024-01-15", "settlementDate": "2024-01-17T00:00:00.000Z" }
```
