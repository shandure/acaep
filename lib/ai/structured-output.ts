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

// Models sometimes wrap JSON in markdown fences or add prose before/after the
// JSON object despite being instructed not to. This function tries three
// strategies in order so it handles all common deviation patterns.
export function extractJSON(text: string): unknown {
  // 1. Happy path: the whole response is valid JSON
  try {
    return JSON.parse(text.trim());
  } catch {
    // fall through
  }

  // 2. JSON is wrapped in a code fence anywhere in the text
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // fall through
    }
  }

  // 3. Find the first '{' and walk to its matching '}' character-by-character,
  //    handling nested objects and string literals correctly.
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
