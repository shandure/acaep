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

export function logTrace(trace: RunTrace): void {
  // Emit as a single structured JSON line — easy to ingest by Langfuse, Datadog, or similar
  console.log(JSON.stringify({ level: "INFO", event: "chat.trace", ...trace }));
}
