@AGENTS.md

# ACAEP — Project Context for AI Assistants

## What this project is

ACAEP (AI Codebase Assistant Evaluation Platform) is a full-stack TypeScript/Next.js application that:
1. Lets users query a small codebase/doc set via an LLM with RAG + tool-calling
2. Runs a golden-dataset evaluation harness against the AI system
3. Displays metrics, run history, and prompt comparison in a dashboard

The knowledge base it answers questions about is a fictional fintech codebase called **TradeLens**, located in `data/knowledge-base/`.

See `README.md` for full architecture, schema, setup, and design decisions.

## Current build status

| Phase | Status | What was built |
|---|---|---|
| Phase 0 — Environment | ✅ Done | Next.js 16, Prisma 7, PostgreSQL + pgvector, Vitest, all deps |
| Phase 1 — Retrieval | ✅ Done | Chunker, embedder, ingestor, retriever, 84 chunks in DB |
| Phase 2 — AI workflow | ✅ Done | Vercel AI SDK, 5 tools, Zod output schema, `/api/chat`, 29 unit tests |
| Phase 3 — Chat UI | ✅ Done | ChatWindow, MessageBubble, StructuredOutputPanel, ToolCallBadge |
| Phase 4 — Eval harness | ✅ Done | 20-case golden dataset, scorer (24 tests), harness, reporter, `/api/eval/run`, `/api/eval/results` |
| Phase 5 — Dashboard | ✅ Done | /dashboard run list, /eval/[runId] detail, /eval/compare, PromptCompareView, system-v2 prompt | Run list, per-case detail, prompt comparison |
| Phase 6 — Telemetry + security | ✅ Done | Logger, sanitiser, injection detection, 30 new tests |
| Phase 7 — Tests + docs | ✅ Done | Integration tests (22), full README (phases 3-7 documented) |

## Critical patterns to know

### Prisma 7 Driver Adapter (NOT standard Prisma usage)
The project uses Prisma 7's TypeScript-native generator. `PrismaClient` requires a Driver Adapter — it does NOT read `DATABASE_URL` from env automatically:

```typescript
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
```

The singleton lives in `lib/db.ts`. Import `prisma` from there everywhere.

### pgvector columns use raw SQL
The `Chunk.embedding` column is `Unsupported("vector(1536)")`. Prisma cannot read/write it via the ORM. Always use:
- Write: `prisma.$executeRaw\`UPDATE "Chunk" SET embedding = ${vec}::vector WHERE id = ${id}\``
- Read: `prisma.$queryRaw<Row[]>\`SELECT ..., (1 - (c.embedding <=> ${vec}::vector))::float8 AS similarity ...\``

The `::float8` cast is required — without it, the numeric result becomes a JavaScript `BigInt`.

### Vercel AI SDK v6 breaking changes from v4/v5
Two API renames that are NOT covered by most documentation or examples online:

1. **`tool()` uses `inputSchema` not `parameters`**:
   ```typescript
   tool({ inputSchema: z.object({ query: z.string() }), execute: async ({ query }) => {} })
   // NOT: parameters: z.object(...)
   ```

2. **`result.usage` uses `inputTokens`/`outputTokens` not `promptTokens`/`completionTokens`**:
   ```typescript
   result.usage.inputTokens   // was promptTokens
   result.usage.outputTokens  // was completionTokens
   result.usage.totalTokens   // unchanged
   ```

3. **`openai()` defaults to the Responses API in `@ai-sdk/openai` v3** — use `openai.chat("gpt-4o")` to target the Chat Completions API if needed.

### CLI scripts need `_load-env` as their first import
Next.js loads `.env.local` automatically. CLI scripts run by `tsx` do not get this. Every script in `scripts/` must start with:

```typescript
import "./_load-env";  // MUST be first — sets DATABASE_URL before lib/db.ts loads
```

This works because tsx compiles imports to CJS `require()` calls, which execute in order.

### Prisma-generated client location
The client is generated into `app/generated/prisma/client.ts` (not the standard `@prisma/client`). Always import from:

```typescript
import { PrismaClient } from "../app/generated/prisma/client";  // in scripts/lib
import { PrismaClient } from "@/app/generated/prisma/client";   // in Next.js (via path alias)
```

Run `npm run db:generate` after any schema change.

## File locations quick reference

| What you need | Where it is |
|---|---|
| DB singleton | `lib/db.ts` |
| Chunker | `lib/retrieval/chunker.ts` |
| Embedder (Vercel AI SDK) | `lib/retrieval/embedder.ts` |
| Ingestor | `lib/retrieval/ingestor.ts` |
| Retriever (pgvector) | `lib/retrieval/retriever.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Prisma config | `prisma.config.ts` |
| Env template | `.env.example` |
| Knowledge base | `data/knowledge-base/` |
| Unit tests | `tests/unit/` |
| Telemetry logger | `lib/telemetry/logger.ts` |
| Security sanitizer | `lib/security/sanitizer.ts` |

## Commands

```bash
npm run dev          # dev server
npm test             # unit tests
npm run ingest       # ingest knowledge base → DB
npm run query "..."  # test retrieval
npm run db:migrate   # run migrations
npm run db:studio    # Prisma Studio (visual DB browser)
```
