import { Langfuse } from "langfuse";

export interface RetrievedChunkMeta {
  file: string;
  similarity: number;
}

export interface ToolCallMeta {
  tool: string;
  input: Record<string, unknown>;
  durationMs: number;
}

export interface RunTrace {
  traceId: string;
  query: string;
  promptVersion: string;
  modelName: string;
  startedAt: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  steps: number;
  retrievedChunks: RetrievedChunkMeta[];
  toolCalls: ToolCallMeta[];
  structuredOutputValid: boolean;
  injectionDetected: boolean;
  failureReason?: string;
}

const INPUT_PRICE_PER_TOKEN = 5 / 1_000_000;
const OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000;

export function estimateCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN;
}

// Langfuse client — only initialised when both keys are present.
// Callers do not need to know whether Langfuse is active.
function getLangfuse(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return null;
  return new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
    flushAt: 1, // flush immediately for serverless environments
  });
}

export function logTrace(trace: RunTrace): void {
  // Always emit as structured JSON to stdout
  console.log(JSON.stringify({ level: "INFO", event: "chat.trace", ...trace }));

  // Optionally forward to Langfuse when credentials are configured
  const langfuse = getLangfuse();
  if (!langfuse) return;

  const lfTrace = langfuse.trace({
    id: trace.traceId,
    name: "chat.request",
    metadata: {
      promptVersion: trace.promptVersion,
      modelName: trace.modelName,
      injectionDetected: trace.injectionDetected,
      steps: trace.steps,
    },
    tags: [trace.promptVersion, trace.modelName],
  });

  lfTrace.generation({
    name: "chat-completion",
    model: trace.modelName,
    input: [{ role: "user", content: trace.query }],
    output: trace.structuredOutputValid ? "valid" : trace.failureReason ?? "invalid",
    usage: {
      input: trace.inputTokens,
      output: trace.outputTokens,
      total: trace.totalTokens,
      unit: "TOKENS",
    },
    metadata: {
      latencyMs: trace.latencyMs,
      estimatedCostUsd: trace.estimatedCostUsd,
      retrievedChunks: trace.retrievedChunks,
      toolCalls: trace.toolCalls,
    },
  });

  // Fire-and-forget flush — don't await in the request path
  langfuse.flushAsync().catch(err =>
    console.warn("[langfuse] flush failed:", err instanceof Error ? err.message : err)
  );
}
