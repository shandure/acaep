# TradeLens Architecture

## Overview

TradeLens is a Next.js 16 application using the App Router. It provides a REST API for trade execution and settlement, backed by a PostgreSQL database.

## Request Lifecycle

When a trader submits a trade via `POST /api/trades`:
1. The route handler in `app/api/trades/route.ts` extracts the JWT from the request cookie
2. `verifyJWT` in `lib/jwt.ts` validates and decodes the token
3. `validateTradeInput` in `lib/validators.ts` checks symbol, quantity, price, and side
4. `createTrade` in `lib/trades.ts` persists the trade with status "pending"
5. The response returns the created trade object with HTTP 201

## Authentication Flow

Login flow (`POST /api/auth/login`):
1. `validateCredentials` in `lib/auth.ts` looks up the user by email
2. Password is compared against the stored bcrypt hash
3. `generateJWT` in `lib/jwt.ts` creates a signed token with userId and role
4. The token is returned as an HttpOnly cookie — not readable by JavaScript

HttpOnly cookies prevent XSS attacks from stealing session tokens. Secure and SameSite=Strict flags prevent CSRF and man-in-the-middle attacks.

## Key Libraries

| Library | Purpose |
|---------|---------|
| `lib/users.ts` | User lookup and creation |
| `lib/auth.ts` | Credential validation, password hashing |
| `lib/jwt.ts` | Token generation and verification |
| `lib/trades.ts` | Trade CRUD operations |
| `lib/settlements.ts` | Settlement date calculation and processing |
| `lib/currency.ts` | Currency formatting and conversion |
| `lib/validators.ts` | Input validation for trades and users |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for signing JWTs — must be a long random string in production |
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key (used by the AI assistant layer) |

The production database host and credentials are not stored in the repository. They are injected via environment variables at deployment time.
