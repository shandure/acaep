import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────────────────────────

export const EvidenceSchema = z.object({
  content: z.string(),
  source: z.string(),
  similarity: z.number().min(0).max(1).optional(),
});

export const ToolCallSummarySchema = z.object({
  name: z.string(),
  args: z.record(z.unknown()),
  resultSummary: z.string().optional(),
});

// ── Main response schema ──────────────────────────────────────────────────────

// Every response the LLM produces must match this shape.
// The system prompt instructs the model to always respond with this JSON structure.
// Zod validates it at runtime — if the model deviates, we catch it and handle it
// gracefully rather than letting malformed data reach the UI or the eval harness.
export const AssistantResponseSchema = z.object({
  answer: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  confidence: z.enum(["high", "medium", "low"]),
  files_used: z.array(z.string()),
  tools_called: z.array(ToolCallSummarySchema),
  risk_level: z.enum(["none", "low", "medium", "high"]),
  missing_information: z.string().nullable(),
  suggested_next_step: z.string().nullable(),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

// ── Safe parser ───────────────────────────────────────────────────────────────

// Returns a discriminated union instead of throwing.
// Callers always handle the failure branch, keeping the app stable even when
// the model produces unexpected output.
export function parseAssistantResponse(
  raw: unknown
): { success: true; data: AssistantResponse } | { success: false; error: string } {
  const result = AssistantResponseSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.message };
}

// ── JSON extraction helper ────────────────────────────────────────────────────

// Models sometimes wrap JSON in markdown code fences despite being told not to.
// This strips the fences before parsing.
export function extractJSON(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
