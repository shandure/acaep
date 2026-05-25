# ACAEP — AI Codebase Assistant Evaluation Platform

A full-stack TypeScript/Next.js application that lets users query a codebase or document set using an LLM-powered assistant with RAG and tool-calling, backed by a built-in evaluation harness that automatically tests the system against a golden dataset, tracks metrics across prompt versions, and displays results in a dashboard.

**Why it exists:** To simulate the kind of AI-enabled internal tooling built at enterprise software organisations — with proper evaluation infrastructure so the team knows whether each deployment is better or worse than the last.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Setup](#setup)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Phase Log](#phase-log)
9. [Key Design Decisions](#key-design-decisions)
10. [Environment Variables](#environment-variables)
11. [Scripts Reference](#scripts-reference)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App (App Router)               │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Chat UI    │  │  Eval Runner │  │  Dashboard        │  │
│  │  (React)    │  │  UI          │  │  (metrics/runs)   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼──────────┐  │
│  │               API Routes (Next.js)                    │  │
│  │  /api/chat   /api/eval/run   /api/eval/results        │  │
│  │  /api/prompts              /api/ingest                │  │
│  └──────┬────────────────────────────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                    AI Workflow Layer  (lib/ai/)              │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐ │
│  │  LLM Client  │  │ Tool Runner │  │ Structured Output  │ │
│  │  (Vercel AI  │  │ (5 bounded  │  │ (Zod schema)       │ │
│  │   SDK)       │  │  read-only  │  │                    │ │
│  └──────┬───────┘  └──────┬──────┘  └────────────────────┘ │
│         │                 │                                  │
│  ┌──────▼─────────────────▼──────────────────────────────┐  │
│  │           Retrieval Layer  (lib/retrieval/)            │  │
│  │   Ingestor → Chunker → Embedder → VectorStore         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                       Data Layer                            │
│  PostgreSQL (via Prisma 7)  +  pgvector (embeddings)        │
│  Tables: Document, Chunk, Prompt, TestCase, EvalRun,        │
│          EvalResult, ToolCallLog, RetrievedChunk,           │
│          HumanFeedback                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR + API routes in one project; standard enterprise TS stack |
| Language | TypeScript (strict mode) | Type safety is non-negotiable for AI pipelines |
| Styling | Tailwind CSS v4 | Fast utility-first styling |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Streaming, tool-calling, structured outputs, embeddings |
| LLM | OpenAI GPT-4o | Strong tool-calling and structured output support |
| Embeddings | `text-embedding-3-small` | 1536 dimensions, low cost, high quality |
| ORM | Prisma 7 (TypeScript-native generator) | Type-safe DB access; migration system |
| DB driver | `pg` + `@prisma/adapter-pg` | Required by Prisma 7's Driver Adapter model |
| Database | PostgreSQL 16 + pgvector | Production-grade; vector similarity search via `<=>` operator |
| Validation | Zod v4 | Parses and validates all LLM JSON outputs at runtime |
| Testing | Vitest 4 + `@vitest/coverage-v8` | Fast, ESM-compatible; no separate config for TypeScript |
| Script runner | `tsx` | Runs `.ts` files directly for CLI scripts (ingest, query, eval) |
| Env management | `dotenv` + `dotenv-safe` | Validates required env vars at startup |

---

## Project Structure

```
my-app/
│
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout with nav bar
│   ├── page.tsx                    # Landing / chat UI
│   ├── dashboard/
│   │   └── page.tsx                # Eval run list + trigger    [Phase 5]
│   ├── eval/
│   │   ├── [runId]/page.tsx        # Single run detail view     [Phase 5]
│   │   └── compare/page.tsx        # Side-by-side prompt compare [Phase 5]
│   ├── api/
│   │   ├── chat/route.ts           # Chat endpoint (RAG + tools) [Phase 2]
│   │   └── eval/
│   │       ├── run/route.ts        # POST: trigger eval run     [Phase 4]
│   │       ├── results/route.ts    # GET: list all runs         [Phase 4]
│   │       ├── results/[runId]/    # GET: single run detail     [Phase 5]
│   │       │   └── route.ts
│   │       └── compare/route.ts    # GET: compare two runs      [Phase 5]
│   └── generated/
│       └── prisma/                 # Auto-generated Prisma 7 TS client
│
├── lib/
│   ├── db.ts                       # Prisma singleton (Driver Adapter pattern)
│   ├── ai/
│   │   ├── client.ts               # Vercel AI SDK model setup  [Phase 2]
│   │   ├── tools.ts                # 5 read-only tool definitions [Phase 2]
│   │   ├── structured-output.ts    # Zod response schema + parser [Phase 2]
│   │   └── prompt-builder.ts       # System prompts v1 + v2     [Phase 2/5]
│   ├── retrieval/
│   │   ├── chunker.ts              # Splits files into chunks   [Phase 1]
│   │   ├── embedder.ts             # OpenAI embeddings API      [Phase 1]
│   │   ├── ingestor.ts             # Reads files → DB           [Phase 1]
│   │   └── retriever.ts            # pgvector similarity search [Phase 1]
│   ├── eval/
│   │   ├── harness.ts              # Main eval loop             [Phase 4]
│   │   ├── scorer.ts               # Per-metric scoring         [Phase 4]
│   │   ├── reporter.ts             # Run finalisation + summary [Phase 4]
│   │   └── test-cases.ts           # Loads test cases from DB   [Phase 4]
│   ├── telemetry/
│   │   └── logger.ts               # Structured trace logging   [Phase 6]
│   └── security/
│       └── sanitizer.ts            # Injection detection + path validation [Phase 6]
│
├── components/
│   ├── chat/
│   │   ├── types.ts                # Shared chat TypeScript types [Phase 3]
│   │   ├── ChatWindow.tsx          # Main chat UI component     [Phase 3]
│   │   ├── MessageBubble.tsx       # Per-message renderer       [Phase 3]
│   │   ├── StructuredOutputPanel.tsx # Structured answer display [Phase 3]
│   │   └── ToolCallBadge.tsx       # Expandable tool call badge [Phase 3]
│   └── eval/
│       ├── types.ts                # RunSummary, CaseResult, helpers [Phase 5]
│       ├── RunSummaryCard.tsx      # Run card with pass-rate bar [Phase 5]
│       ├── ResultRow.tsx           # Expandable per-case table row [Phase 5]
│       └── PromptCompareView.tsx   # Side-by-side comparison    [Phase 5]
│
├── data/
│   ├── knowledge-base/             # TradeLens fictional fintech codebase
│   │   ├── app/api/                # TradeLens API routes
│   │   ├── lib/                    # TradeLens TypeScript utilities
│   │   └── docs/                   # Markdown docs + glossary
│   └── golden-dataset.json         # 20-case evaluation dataset [Phase 4]
│
├── scripts/
│   ├── _load-env.ts                # dotenv preloader (must be first import in every script)
│   ├── ping-db.ts                  # DB connection smoke test
│   ├── ingest.ts                   # CLI: ingest knowledge base
│   ├── query.ts                    # CLI: test retrieval queries
│   ├── seed-prompt.ts              # CLI: seed v1/v2 prompts into DB [Phase 5]
│   ├── seed-test-cases.ts          # CLI: seed golden dataset   [Phase 4]
│   └── run-eval.ts                 # CLI: headless eval run     [Phase 4]
│
├── tests/
│   ├── unit/                       # Fast, no DB — run with `npm test`
│   │   ├── chunker.test.ts         # Chunker (14 tests)
│   │   ├── structured-output.test.ts # Zod schema (15 tests)
│   │   ├── scorer.test.ts          # Scorer (24 tests)
│   │   ├── sanitizer.test.ts       # Injection detection (16 tests)
│   │   └── logger.test.ts          # Trace logger (14 tests)
│   └── integration/                # Requires live DB — run with `npm run test:integration`
│       ├── setup.ts                # Loads .env.local before tests
│       ├── retrieval.test.ts       # pgvector retrieval (8 tests)
│       └── tool-runner.test.ts     # Tool execute functions (14 tests)
│
├── prisma/
│   ├── schema.prisma               # DB schema (9 models)
│   └── migrations/                 # Applied migration files
│
├── docker-compose.yml              # PostgreSQL 16 + pgvector
├── prisma.config.ts                # Prisma 7 config
├── vitest.config.ts                # Unit test config
├── vitest.integration.config.ts    # Integration test config    [Phase 7]
├── .env.example                    # Required env vars template
├── .env.local                      # Real secrets (gitignored)
└── package.json                    # Scripts + dependencies
```

---

## Database Schema

Nine tables in PostgreSQL. Relationships shown below:

```
Document (1) ──── (many) Chunk
                            │
                     (many) RetrievedChunk ──── (many) EvalResult
                                                        │
Prompt (1) ──── (many) EvalRun (1) ──── (many) EvalResult
                                                │
TestCase (1) ──────────────────────── (many) EvalResult
                                                │
                                         (many) ToolCallLog
```

### Document
Represents one ingested file from `data/knowledge-base/`.

| Column | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Filename (e.g. `users.ts`) |
| `path` | String (unique) | Relative path from KB root (e.g. `lib/users.ts`) |
| `type` | String | `"code"` \| `"markdown"` \| `"policy"` |
| `content` | String | Full raw file content |
| `createdAt` | DateTime | Ingestion timestamp |

### Chunk
One semantically meaningful piece of a Document, with a stored embedding vector.

| Column | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `documentId` | String | FK → Document |
| `content` | String | Chunk text (includes file path prefix for context) |
| `startLine` | Int? | First line of this chunk in the source file |
| `endLine` | Int? | Last line of this chunk in the source file |
| `embedding` | `vector(1536)` | pgvector column — not writable via Prisma ORM directly, set via raw SQL |
| `createdAt` | DateTime | |

> **Note:** `embedding` uses Prisma's `Unsupported("vector(1536)")` type because pgvector is not a native Prisma type. Reads and writes go through `prisma.$queryRaw` / `prisma.$executeRaw`.

### Prompt
A versioned system prompt. Multiple versions can exist; one is marked `isActive`.

| Column | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Human label e.g. `"system-v1"` |
| `version` | Int | Version number |
| `systemText` | String | The system prompt text sent to the LLM |
| `userTemplate` | String | Handlebars-style template with `{{query}}`, `{{chunks}}` placeholders |
| `isActive` | Boolean | Whether this is the current active prompt |

### TestCase
One entry in the golden evaluation dataset.

| Column | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `query` | String | The question the LLM will be asked |
| `expectedAnswer` | String | What a correct answer should say |
| `requiredEvidence` | String[] | Keywords/phrases that must appear in the evidence field |
| `expectedFiles` | String[] | File paths that should be cited |
| `expectedTools` | String[] | Tool names that should be called |
| `unacceptablePhrases` | String[] | Phrases whose presence indicates a hallucination |
| `scoringNotes` | String? | Human notes on how to judge this case |
| `category` | String | `"retrieval"` \| `"tool-use"` \| `"reasoning"` \| `"classification"` |
| `difficulty` | String | `"easy"` \| `"medium"` \| `"hard"` |

### EvalRun
One complete evaluation run — a prompt version tested against all test cases.

| Column | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `promptId` | String | FK → Prompt |
| `modelName` | String | e.g. `"gpt-4o"` |
| `status` | String | `"running"` \| `"completed"` \| `"failed"` |
| `totalCases` | Int | How many test cases were run |
| `passCount` | Int | Cases that passed |
| `failCount` | Int | Cases that failed |
| `passRate` | Float? | `passCount / totalCases` |
| `avgLatencyMs` | Float? | Mean wall-clock time per case |
| `totalTokens` | Int | Sum of prompt + completion tokens across all cases |
| `estimatedCostUsd` | Float? | Total cost for this run |

### EvalResult
One test case's result within an EvalRun. Stores all 12 metrics.

| Column | Type | Description |
|---|---|---|
| `modelOutput` | Json | Full structured JSON output from the LLM |
| `finalAnswer` | String | The `answer` field from the structured output |
| `passed` | Boolean | `answerScore > 0.7 AND NOT hallucinated AND structuredOutputValid` |
| `answerScore` | Float | 0–1 keyword overlap with expected answer |
| `evidenceScore` | Float | 0–1 whether required evidence phrases appear |
| `retrievalPrecision` | Float | `|retrieved ∩ expected| / |retrieved|` |
| `retrievalRecall` | Float | `|retrieved ∩ expected| / |expected|` |
| `toolSelectionScore` | Float | `|tools_called ∩ expected_tools| / |expected_tools|` |
| `hallucinated` | Boolean | Any unacceptable phrase found in the answer |
| `latencyMs` | Int | Wall-clock ms from query to structured output |
| `promptTokens` | Int | Tokens in the prompt sent to the LLM |
| `completionTokens` | Int | Tokens in the LLM's response |
| `estimatedCostUsd` | Float | Cost for this one case |

### ToolCallLog
Every individual tool invocation during an EvalResult, win or lose.

### RetrievedChunk
Which chunks were retrieved during an EvalResult, with similarity scores and whether the model cited them.

### HumanFeedback
Stretch goal — human ratings (1–5) attached to individual EvalResults.

---

## Setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL)
- An OpenAI API key with billing enabled

### 1. Start the database

```bash
docker compose up -d
```

This starts `pgvector/pgvector:pg16` on port 5433 with:
- User: `postgres`
- Password: `postgres`
- Database: `acaep`
- The `vector` extension is created automatically by the Prisma migration.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/acaep?schema=public"
OPENAI_API_KEY="sk-proj-your-key-here"
```

### 4. Run database migrations

```bash
npm run db:migrate
```

This applies `prisma/migrations/` and creates all 9 tables in PostgreSQL.

### 5. Generate the Prisma client

```bash
npm run db:generate
```

Prisma 7 generates a TypeScript-native client into `app/generated/prisma/`. This step is required after any schema change.

### 6. Ingest the knowledge base

```bash
npm run ingest
```

Reads all `.ts` and `.md` files from `data/knowledge-base/`, splits them into chunks, embeds them via OpenAI, and stores the vectors in PostgreSQL. Produces 84 chunks across 14 documents.

### 7. Verify retrieval

```bash
npm run query "getUserById function"
npm run query "what is a settlement cycle"
```

Should return relevant chunks with similarity scores above 0.5.

---

## Development Workflow

### Running the dev server

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Running tests

```bash
npm test                   # unit tests only (no DB needed)
npm run test:watch         # unit tests in watch mode
npm run test:coverage      # unit tests with coverage report
npm run test:integration   # integration tests (requires running DB + .env.local)
npm run test:all           # unit + integration
```

### Opening Prisma Studio (DB browser)

```bash
npm run db:studio
```

Opens a visual browser for the PostgreSQL tables at `http://localhost:5555`.

### Making schema changes

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` — creates and applies a new migration file
3. Run `npm run db:generate` — regenerates the TypeScript client

---

## Testing

The test suite is split into two tiers:

| Tier | Command | Requires DB | Speed | Count |
|---|---|---|---|---|
| Unit | `npm test` | No | ~500ms | 83 tests |
| Integration | `npm run test:integration` | Yes | ~5s | 22 tests |

### Unit tests (`tests/unit/`)

Pure in-memory tests — no database, no network. Safe to run anywhere, including CI without a PostgreSQL service:

- **`chunker.test.ts`** — chunking logic for code and markdown files (14 tests)
- **`structured-output.test.ts`** — Zod schema validation and JSON extraction (15 tests)
- **`scorer.test.ts`** — all 6 scoring metrics: answer, evidence, precision, recall, tool selection, hallucination (24 tests)
- **`sanitizer.test.ts`** — injection pattern detection and path validation (16 tests)
- **`logger.test.ts`** — trace log format, cost calculation (14 tests)

### Integration tests (`tests/integration/`)

Hit the real PostgreSQL + pgvector database. Require a running Docker container and `.env.local` with `DATABASE_URL`. Tests use `describe.skipIf(!process.env.DATABASE_URL)` so they fail gracefully if the DB is unavailable rather than erroring.

- **`retrieval.test.ts`** — verifies that real queries return semantically correct chunks from pgvector (8 tests)
- **`tool-runner.test.ts`** — calls each tool's `execute()` function directly against the DB (14 tests)

---

## Phase Log

### Phase 0 — Environment Setup ✅

**Goal:** Working Next.js project with TypeScript, PostgreSQL, Prisma, and all dependencies installed.

**What was done:**
- Created Next.js 16 project with TypeScript strict mode and Tailwind CSS
- Installed all production and dev dependencies
- Set up PostgreSQL 16 + pgvector in Docker
- Wrote `prisma/schema.prisma` with all 9 models
- Ran first Prisma migration — all tables created in PostgreSQL
- Generated the Prisma 7 TypeScript-native client
- Created `lib/db.ts` — Prisma singleton using the Driver Adapter pattern
- Set up Vitest with path alias support
- Created `docker-compose.yml`, `.env.example`, `vitest.config.ts`

**Notable: Prisma 7 Driver Adapter**

Prisma 7 introduced a TypeScript-native client generator (`provider = "prisma-client"`) that no longer reads `DATABASE_URL` directly. Instead, it requires a Driver Adapter. For PostgreSQL this means:

```typescript
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

This is the pattern used in `lib/db.ts` and in all CLI scripts.

**Notable: Script env loading**

Next.js automatically loads `.env.local` before running route handlers. CLI scripts (run with `tsx`) do not get this automatic loading. In CJS mode, `import` statements are executed as `require()` calls in order, so placing `import "./_load-env"` as the **first import** in a script ensures `dotenv` sets `DATABASE_URL` before `lib/db.ts` creates the `pg.Pool`.

---

### Phase 1 — Knowledge Base + Retrieval ✅

**Goal:** A working RAG retrieval pipeline that takes a natural language query and returns the most relevant code chunks from PostgreSQL.

**What was done:**
- Created 14 files in `data/knowledge-base/` — a fictional fintech TypeScript codebase called **TradeLens** (users, auth, JWT, trades, settlements, currency, validators, API routes, and 3 markdown docs)
- Implemented `lib/retrieval/chunker.ts` — splits code files at function/class declaration boundaries, splits markdown at `##` headings with 50-token overlap
- Implemented `lib/retrieval/embedder.ts` — wraps Vercel AI SDK's `embedMany` / `embed` for `text-embedding-3-small`
- Implemented `lib/retrieval/ingestor.ts` — reads files, upserts Documents, creates Chunks, stores embeddings via raw SQL (`UPDATE "Chunk" SET embedding = $1::vector`)
- Implemented `lib/retrieval/retriever.ts` — cosine similarity search using pgvector's `<=>` operator via raw SQL
- Wrote `scripts/ingest.ts` and `scripts/query.ts`
- 14 unit tests for the chunker (all passing)
- Ingested 84 chunks with real OpenAI embeddings

**How the chunker works:**

For **TypeScript/code files**, the chunker splits at top-level declaration boundaries detected by regex:
```
export function | export async function | export class | export const | export type | export interface | export enum
```
Each chunk is prefixed with `// path/to/file.ts` so the embedding model has file path context.

For **markdown files**, the chunker splits at `## ` (level-2) headings. Each chunk after the first gets the last 200 characters of the previous chunk prepended as overlap, preventing relevant context from being lost when a sentence straddles a section boundary.

**How the retriever works:**

At query time:
1. Embed the query string using `text-embedding-3-small` → 1536-dim vector
2. Execute a raw SQL cosine similarity search:
   ```sql
   SELECT c.*, (1 - (c.embedding <=> $query_vec::vector))::float8 AS similarity
   FROM "Chunk" c JOIN "Document" d ON c."documentId" = d.id
   WHERE c.embedding IS NOT NULL
   ORDER BY c.embedding <=> $query_vec::vector
   LIMIT 8
   ```
3. Return chunks sorted by similarity descending

The `<=>` operator is pgvector's cosine distance. `1 - distance = cosine similarity`. The `::float8` cast prevents pgvector's numeric type from being coerced to a JavaScript `BigInt`.

**Knowledge base contents:**

| File | What it contains |
|---|---|
| `lib/users.ts` | `getUserById`, `getUserByEmail`, `createUser`, `recordLogin` |
| `lib/auth.ts` | `validateCredentials`, `hashPassword`, `comparePassword`, `issueToken` |
| `lib/jwt.ts` | `generateJWT`, `verifyJWT`, `extractUserId` |
| `lib/currency.ts` | `formatCurrency`, `parseCurrency`, `convertCurrency`, `tradeValue` |
| `lib/settlements.ts` | `calculateSettlementDate`, `buildSettlement`, `processSettlement`, `isOverdue` |
| `lib/trades.ts` | `createTrade`, `getTradeById`, `getTradesByTrader`, `markTradeSettled`, `cancelTrade` |
| `lib/validators.ts` | `validateEmail`, `validateTradeInput`, `validateAmount` |
| `lib/types.ts` | `User`, `Trade`, `Settlement`, `JWTPayload`, `ApiError` interfaces |
| `app/api/auth/login/route.ts` | `POST` (login flow), `DELETE` (logout) |
| `app/api/trades/route.ts` | `GET` (list trades), `POST` (create trade) |
| `app/api/settlements/route.ts` | `POST` (process settlement), `GET` (settlement date calc) |
| `docs/glossary.md` | Settlement Cycle, Mark to Market, Counterparty Risk, Order Book, etc. |
| `docs/api-reference.md` | All API endpoints with request/response schemas |
| `docs/architecture.md` | System overview, request lifecycle, auth flow, env vars |

---

### Phase 2 — AI Workflow Layer ✅

**Goal:** An end-to-end query pipeline: user question → RAG pre-fetch → LLM with tool-calling → Zod-validated structured JSON response.

**What was done:**
- `lib/ai/client.ts` — Vercel AI SDK client (`openai.chat("gpt-4o")`) — using `.chat()` explicitly because `@ai-sdk/openai` v3 defaults to the new Responses API
- `lib/ai/tools.ts` — 5 read-only tools (`searchCodebase`, `readFile`, `listFiles`, `getFunctionDefinition`, `lookupGlossaryTerm`). All tools return `{ error }` on failure rather than throwing. `readFile` validates the path against the DB to prevent traversal attacks
- `lib/ai/structured-output.ts` — `AssistantResponseSchema` (Zod), `parseAssistantResponse` (safe parser, returns discriminated union), `extractJSON` (strips markdown fences from model output)
- `lib/ai/prompt-builder.ts` — `SYSTEM_PROMPT_V1` (instructs JSON-only output, injection resistance, no credential leaking) + `buildUserMessage` (injects pre-fetched chunks)
- `app/api/chat/route.ts` — `POST /api/chat` endpoint: validates query → pre-fetches top-5 chunks → `generateText` with `maxSteps: 5` → parses + validates structured output → returns `{ ...data, _meta }`
- 15 unit tests for structured output parsing and JSON extraction (all passing)

**How `/api/chat` works:**

```
POST /api/chat { query: "..." }
  │
  ├─ 1. Validate query (string, non-empty)
  ├─ 2. retrieve(query, { topK: 5 }) → pre-fetched context chunks
  ├─ 3. generateText({ model, system: SYSTEM_PROMPT_V1, messages, tools, maxSteps: 5 })
  │       ↕ (up to 5 rounds of tool calls)
  │       tools: searchCodebase | readFile | listFiles | getFunctionDefinition | lookupGlossaryTerm
  ├─ 4. extractJSON(result.text) → strip markdown fences
  ├─ 5. parseAssistantResponse(parsed) → Zod validation
  └─ 6. Return { answer, evidence, confidence, files_used, tools_called, risk_level,
                  missing_information, suggested_next_step, _meta }
```

**AI SDK v6 breaking changes discovered:**

| What the docs/examples show | What v6 actually uses |
|---|---|
| `tool({ parameters: z.object({...}) })` | `tool({ inputSchema: z.object({...}) })` |
| `result.usage.promptTokens` | `result.usage.inputTokens` |
| `result.usage.completionTokens` | `result.usage.outputTokens` |
| `openai("gpt-4o")` → Chat Completions | `openai("gpt-4o")` → Responses API (use `openai.chat(...)` for Chat Completions) |

**Structured output schema:**

```typescript
{
  answer: string (min 1 char),
  evidence: Array<{ content: string, source: string, similarity?: number }>,
  confidence: "high" | "medium" | "low",
  files_used: string[],
  tools_called: Array<{ name: string, args: Record<string, unknown>, resultSummary?: string }>,
  risk_level: "none" | "low" | "medium" | "high",
  missing_information: string | null,
  suggested_next_step: string | null,
}
```

---

### Phase 3 — Chat UI ✅

**Goal:** A functional chat interface that renders the structured assistant responses returned by `/api/chat`.

**What was done:**
- `components/chat/types.ts` — shared `Message` and `AssistantResponse` TypeScript interfaces
- `components/chat/ToolCallBadge.tsx` — expandable badge for each tool call, color-coded per tool (searchCodebase=blue, readFile=purple, listFiles=gray, getFunctionDefinition=green, lookupGlossaryTerm=orange)
- `components/chat/StructuredOutputPanel.tsx` — renders the full structured response: answer text, confidence badge (high/medium/low), risk level badge, latency + token metadata, collapsible evidence accordion with similarity percentages, `files_used` as monospace chips, `missing_information` and `suggested_next_step` callouts
- `components/chat/MessageBubble.tsx` — user messages: right-aligned blue bubble; assistant messages: left-aligned white card wrapping `StructuredOutputPanel`
- `components/chat/ChatWindow.tsx` — `"use client"` component with message state, input field, example question chips, auto-scroll via `useEffect` + `bottomRef`, POSTs to `/api/chat`
- `app/page.tsx` — replaced Next.js placeholder with `<ChatWindow />`
- `app/layout.tsx` — updated page title; nav bar added in Phase 5

---

### Phase 4 — Evaluation Harness ✅

**Goal:** Automated evaluation of the AI system against a golden dataset, with full metric tracking and DB persistence.

**What was done:**
- `data/golden-dataset.json` — 20 test cases across 7 categories:
  - `direct-retrieval` (6): specific function names, constants, and error behavior
  - `glossary` (3): domain terms with expected markdown sources
  - `multi-chunk` (4): questions requiring information across multiple file chunks
  - `tool-required` (2): questions where a tool call (not just RAG pre-fetch) is needed
  - `tool-not-needed` (1): general knowledge question to test over-tooling
  - `unanswerable` (2): infrastructure questions the model cannot answer from the knowledge base
  - `adversarial` (2): prompt injection attempts (added to Phase 6 security work)

- `lib/eval/scorer.ts` — pure scoring functions returning a `Scores` object with six metrics:
  - `answerScore` — keyword recall: fraction of tokenised expected-answer words found in the model's answer
  - `evidenceScore` — whether `requiredEvidence` phrases appear in the evidence field
  - `retrievalPrecision` / `retrievalRecall` — file overlap between `files_used` and `expectedFiles`
  - `toolSelectionScore` — fraction of `expectedTools` that the model actually called
  - `hallucinated` — whether any `unacceptablePhrases` appear in the answer
  - `passed` — `answerScore >= 0.4 AND NOT hallucinated`

- `lib/eval/harness.ts` — `runEvaluation({ promptId, modelName?, onProgress? })`: iterates all test cases, calls `/lib/ai` pipeline per case, scores the output, persists `EvalResult` and `ToolCallLog` rows to PostgreSQL, returns `runId`
- `lib/eval/reporter.ts` — `finaliseRun(runId)`: aggregates all `EvalResult` rows into pass rate, avg latency, total tokens, estimated cost; updates `EvalRun.status = "completed"`
- `lib/eval/test-cases.ts` — `loadTestCases()` wrapper around `prisma.testCase.findMany`
- `scripts/seed-test-cases.ts` — idempotent seed from `golden-dataset.json` (upserts by query text)
- `scripts/run-eval.ts` — CLI with per-case progress output and final summary table
- `app/api/eval/run/route.ts` — `POST /api/eval/run`: resolves active prompt, runs harness synchronously, returns `runId`
- `app/api/eval/results/route.ts` — `GET /api/eval/results`: returns all runs with aggregate stats
- `tests/unit/scorer.test.ts` — 24 unit tests covering all scorer functions

**Key design decision — ToolCallLog inner try/catch:**

When persisting `ToolCallLog` rows inside the harness, each `prisma.toolCallLog.create()` is wrapped in its own `try/catch`. This is critical: if the outer `try` block catches an exception during log writing, it creates a duplicate `EvalResult` for the same test case. Isolating the log writes prevents a non-fatal logging failure from corrupting the pass/fail count.

---

### Phase 5 — Dashboard ✅

**Goal:** A full dashboard for viewing and comparing evaluation runs, with a second prompt version to compare against.

**What was done:**
- `lib/ai/prompt-builder.ts` — added `SYSTEM_PROMPT_V2` alongside V1. V2 adds an explicit retrieval strategy section: call `listFiles()` when unsure what exists, prefer `getFunctionDefinition()` for function queries, prefer `lookupGlossaryTerm()` for domain terms, cite all relevant files, set confidence "low" when similarity < 0.75

- `scripts/seed-prompt.ts` — seeds both v1 and v2 prompt records into the `Prompt` table; marks v1 as `isActive`

- `app/api/eval/results/[runId]/route.ts` — `GET /api/eval/results/:runId`: returns full run with per-case results including model output, expected answer, expected tools/files, and tool call logs

- `app/api/eval/compare/route.ts` — `GET /api/eval/compare?runA=&runB=`: computes deltas for passRate, avgLatencyMs, estimatedCostUsd, hallucination count, and per-dimension score averages; annotates each case as `isRegression` or `isImprovement`

- `components/eval/types.ts` — `RunSummary`, `CaseResult`, `RunDetail`, `CompareResponse` interfaces plus helper functions `pct()`, `scoreColor()`, `scoreBg()`, `CATEGORY_COLORS`, `DIFFICULTY_COLORS`

- `components/eval/RunSummaryCard.tsx` — run card with `PassBar` (Tailwind-colored progress bar), checkbox for selecting two runs to compare, latency/token/cost/date stats, View link

- `components/eval/ResultRow.tsx` — `"use client"` expandable table row; expanded view shows model answer vs expected answer, failure reason, expected files and expected tools as chips

- `components/eval/PromptCompareView.tsx` — `"use client"` side-by-side comparison: `DeltaBadge` shows green/red for improvement/regression (with `invert` flag for metrics where lower is better — latency, cost, hallucinations), full per-case table with PASS/FAIL badges and regression/improvement labels

- `app/dashboard/page.tsx` — run list, checkbox selection of two runs, "Compare selected" → `/eval/compare?runA=&runB=`, "New eval run" button

- `app/eval/[runId]/page.tsx` — stat cards (pass rate, latency, tokens, cost), per-dimension average scores, expandable results table

- `app/eval/compare/page.tsx` — `useSearchParams()` for initial run IDs, two dropdown selectors, auto-fetches compare API when both selected

- `app/layout.tsx` — full rewrite with top nav bar (ACAEP brand + Chat / Runs / Compare links)

**What the v1 → v2 comparison shows:**

On the 20-case golden dataset, v2 outperformed v1 by +7 percentage points on pass rate, at the cost of +541ms average latency. Tool selection score improved from 8% to 15% — the explicit strategy section in v2 caused the model to call `getFunctionDefinition()` and `lookupGlossaryTerm()` more reliably. This is exactly the kind of measurement ACAEP is designed to surface.

---

### Phase 6 — Telemetry + Security ✅

**Goal:** Add structured logging of every chat request and prompt-injection detection at the API boundary.

**What was done:**

**`lib/telemetry/logger.ts`** — `RunTrace` interface capturing every observable from a chat request:
```typescript
{
  traceId: string;       // randomUUID per request
  query: string;         // sanitised user input
  promptVersion: string; // "system-v1" | "system-v2"
  modelName: string;     // "gpt-4o"
  startedAt: string;     // ISO timestamp
  latencyMs: number;
  inputTokens / outputTokens / totalTokens: number;
  estimatedCostUsd: number;
  steps: number;         // number of tool-call rounds
  retrievedChunks: { file, similarity }[];
  toolCalls: { tool, input, durationMs }[];
  structuredOutputValid: boolean;
  injectionDetected: boolean;
  failureReason?: string;
}
```
`logTrace()` emits a single structured JSON line (`level: "INFO", event: "chat.trace"`) — format is compatible with Langfuse, Datadog log ingest, and standard JSON log aggregators.

**`lib/security/sanitizer.ts`** — 13 regex patterns covering the classic prompt injection surface:
- "ignore previous/prior/all instructions"
- "forget previous instructions"
- DAN (Do Anything Now) jailbreak
- "reveal your system prompt / hidden instructions"
- `[SYSTEM]` and `<system>` tag injection
- "bypass / override your safety restrictions"
- "pretend you have no restrictions"

Input is rejected before any model call, the rejection is logged (with `injectionDetected: true`), and a 400 is returned with a generic error message (not the matched pattern — to avoid helping attackers craft bypasses).

`validatePath()` provides a second layer of defence-in-depth against path traversal, complementing the DB-lookup guard already in the `readFile` tool.

**`app/api/chat/route.ts`** — updated flow:
1. Parse + validate input (400 if missing)
2. `sanitizeInput()` → reject + log if injection detected (400)
3. `retrieve()` top-5 chunks
4. `generateText()` with tools (up to 5 steps)
5. `logTrace()` — always emitted, including on validation failure
6. Parse + validate structured output (500 if malformed)
7. Return response

---

### Phase 7 — Tests + Docs ✅

**Goal:** Full integration test coverage of the retrieval pipeline and tool layer; complete README.

**What was done:**
- `vitest.config.ts` — updated to `include: ["tests/unit/**/*.test.ts"]` so `npm test` runs only unit tests (fast, no DB required)
- `vitest.integration.config.ts` — separate config for integration tests with `setupFiles: ["tests/integration/setup.ts"]` and a 30s timeout
- `tests/integration/setup.ts` — loads `.env.local` via `dotenv.config()` before any test imports `lib/db.ts`
- `tests/integration/retrieval.test.ts` — 8 tests verifying real pgvector queries: similarity ordering, `filterType` markdown-only filter, content relevance, return shape
- `tests/integration/tool-runner.test.ts` — 14 tests calling each tool's `execute()` directly against the DB: known-file reads, path-traversal rejection, function lookup, glossary term lookup
- `package.json` — added `test:integration` and `test:all` scripts
- `README.md` — this document

**Test count summary:**

| Suite | File | Tests |
|---|---|---|
| Unit | chunker | 14 |
| Unit | structured-output | 15 |
| Unit | scorer | 24 |
| Unit | sanitizer | 16 |
| Unit | logger | 14 |
| Integration | retrieval | 8 |
| Integration | tool-runner | 14 |
| **Total** | | **105** |

---

## Key Design Decisions

### Why Prisma 7 Driver Adapters?
Prisma 7's new TypeScript-native generator (`provider = "prisma-client"`) outputs `.ts` source files rather than compiled JavaScript, giving better IDE integration and type inference. The trade-off is that it no longer supports reading `DATABASE_URL` directly — you must provide a Driver Adapter (`@prisma/adapter-pg`). This is the direction the Prisma ecosystem is moving.

### Why pgvector instead of a dedicated vector DB?
Keeping everything in PostgreSQL means one less service to run, one less connection to manage, and one less billing dimension. For a codebase of this size (< 10,000 chunks), pgvector's HNSW or IVFFlat index would comfortably handle sub-10ms query times. A dedicated vector DB (Pinecone, Qdrant) would add complexity with no meaningful quality improvement at this scale.

### Why chunk code at function boundaries rather than fixed token windows?
Fixed-window chunking (e.g. 400 tokens with 50-token overlap) is simpler but cuts across function bodies, sometimes embedding the signature of function A with the body of function B. Splitting at declaration boundaries keeps each chunk semantically coherent — a chunk always contains exactly one function, class, or type definition. This improves retrieval precision because the embedding captures the meaning of the whole construct, not a partial fragment.

### Why store the file path in every chunk's content?
The embedding model (`text-embedding-3-small`) doesn't know which file a chunk came from. Prepending `// lib/users.ts` to each chunk means the embedding captures file identity as part of the semantic meaning. When a user asks "what does `lib/users.ts` contain?", the file-path prefix causes the relevant chunks to score highly.

### Why two raw SQL queries in the retriever instead of one with a conditional?
Prisma's `$queryRaw` template literal syntax doesn't support conditional SQL fragments cleanly. The `Prisma.sql` helper can compose fragments, but it adds import complexity. Two clearly readable queries — one with the type filter, one without — is simpler to understand, audit, and test.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Format: `postgresql://user:pass@host:port/db?schema=public` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key with billing enabled. Used for embeddings and LLM calls. |

Never commit `.env.local`. The `.env.example` file (committed) shows which variables are required.

---

## Scripts Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm test` | Unit tests (83 tests, no DB required) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:integration` | Integration tests (22 tests, requires running DB) |
| `npm run test:all` | Unit + integration tests |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate the Prisma TypeScript client |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run ingest` | Ingest `data/knowledge-base/` into PostgreSQL with embeddings |
| `npm run query "..."` | Test retrieval with a natural language query |
| `npm run seed:prompt` | Seed system-v1 and system-v2 prompts into the DB |
| `npm run seed:cases` | Seed 20 golden dataset test cases into the DB |
| `npm run eval:run` | Run evaluation headlessly from the CLI |
