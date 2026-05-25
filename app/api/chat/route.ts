import { generateText } from "ai";
import { randomUUID } from "crypto";
import { model } from "../../../lib/ai/client";
import { tools } from "../../../lib/ai/tools";
import { SYSTEM_PROMPT_V1, buildUserMessage } from "../../../lib/ai/prompt-builder";
import { retrieve } from "../../../lib/retrieval/retriever";
import { parseAssistantResponse, extractJSON } from "../../../lib/ai/structured-output";
import { sanitizeInput } from "../../../lib/security/sanitizer";
import { logTrace, estimateCost } from "../../../lib/telemetry/logger";

// POST /api/chat
//
// Full request/response flow:
//   1. Validate and sanitise the incoming query (injection detection)
//   2. Pre-retrieve the top-5 most relevant chunks from pgvector
//   3. Call generateText with the 5 tools and maxSteps: 5
//   4. Strip any markdown fences from the final text and JSON.parse it
//   5. Validate the parsed object with Zod — reject malformed outputs cleanly
//   6. Emit a structured trace log and return the validated response

export async function POST(req: Request): Promise<Response> {
  const traceId = randomUUID();
  let rawQuery: string;

  try {
    const body = await req.json();
    if (!body.query || typeof body.query !== "string") {
      return Response.json({ error: "query must be a non-empty string" }, { status: 400 });
    }
    rawQuery = body.query;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sanitized = sanitizeInput(rawQuery);

  if (!sanitized.safe) {
    logTrace({
      traceId,
      query: sanitized.query,
      promptVersion: "system-v1",
      modelName: "gpt-4o",
      startedAt: new Date().toISOString(),
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      steps: 0,
      retrievedChunks: [],
      toolCalls: [],
      structuredOutputValid: false,
      injectionDetected: true,
      failureReason: sanitized.reason,
    });

    return Response.json(
      { error: "Query rejected: potential prompt injection detected." },
      { status: 400 }
    );
  }

  const query = sanitized.query;

  // Pre-fetch context so the model has something to work with immediately.
  const initialChunks = await retrieve(query, { topK: 5 });

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT_V1,
    messages: [{ role: "user", content: buildUserMessage(query, initialChunks) }],
    tools,
    maxSteps: 5,
  });

  const latencyMs = Date.now() - startMs;

  // Parse and validate the structured JSON output
  const parsed = parseAssistantResponse(extractJSON(result.text));

  // Build tool call metadata from steps
  const toolCalls = result.steps.flatMap(step =>
    (step.toolCalls ?? []).map(tc => ({
      tool: tc.toolName,
      input: (tc.input ?? {}) as Record<string, unknown>,
      durationMs: 0, // Vercel AI SDK v6 does not expose per-call duration
    }))
  );

  logTrace({
    traceId,
    query,
    promptVersion: "system-v1",
    modelName: "gpt-4o",
    startedAt,
    latencyMs,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    estimatedCostUsd: estimateCost(result.usage.inputTokens, result.usage.outputTokens),
    steps: result.steps.length,
    retrievedChunks: initialChunks.map(c => ({ file: c.documentPath, similarity: c.similarity })),
    toolCalls,
    structuredOutputValid: parsed.success,
    injectionDetected: false,
    ...(!parsed.success && { failureReason: "structured output validation failed" }),
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Model produced invalid structured output",
        details: parsed.error,
        rawOutput: result.text,
      },
      { status: 500 }
    );
  }

  return Response.json({
    ...parsed.data,
    _meta: {
      latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      steps: result.steps.length,
    },
  });
}
