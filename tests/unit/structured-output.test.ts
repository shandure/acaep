import { describe, it, expect } from "vitest";
import { parseAssistantResponse, extractJSON, AssistantResponseSchema } from "../../lib/ai/structured-output";

// A minimal valid response matching the Zod schema
const validResponse = {
  answer: "getUserById returns a User object with id, email, and role, or null if not found.",
  evidence: [{ content: "async function getUserById(id: string)...", source: "lib/users.ts" }],
  confidence: "high" as const,
  files_used: ["lib/users.ts"],
  tools_called: [{ name: "getFunctionDefinition", args: { name: "getUserById" } }],
  risk_level: "none" as const,
  missing_information: null,
  suggested_next_step: null,
};

// ── parseAssistantResponse ────────────────────────────────────────────────────

describe("parseAssistantResponse", () => {
  it("accepts a fully valid response", () => {
    const result = parseAssistantResponse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answer).toBe(validResponse.answer);
      expect(result.data.confidence).toBe("high");
      expect(result.data.risk_level).toBe("none");
    }
  });

  it("accepts optional evidence.similarity field", () => {
    const withSimilarity = {
      ...validResponse,
      evidence: [{ content: "...", source: "lib/users.ts", similarity: 0.87 }],
    };
    expect(parseAssistantResponse(withSimilarity).success).toBe(true);
  });

  it("rejects a missing answer field", () => {
    const { answer: _, ...noAnswer } = validResponse;
    const result = parseAssistantResponse(noAnswer);
    expect(result.success).toBe(false);
  });

  it("rejects an empty answer string", () => {
    const result = parseAssistantResponse({ ...validResponse, answer: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid confidence value", () => {
    const result = parseAssistantResponse({ ...validResponse, confidence: "very-high" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid risk_level value", () => {
    const result = parseAssistantResponse({ ...validResponse, risk_level: "critical" });
    expect(result.success).toBe(false);
  });

  it("accepts null for missing_information and suggested_next_step", () => {
    const result = parseAssistantResponse({
      ...validResponse,
      missing_information: null,
      suggested_next_step: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts non-null strings for missing_information and suggested_next_step", () => {
    const result = parseAssistantResponse({
      ...validResponse,
      missing_information: "The function signature was not found",
      suggested_next_step: "Try searching for related functions",
    });
    expect(result.success).toBe(true);
  });

  it("returns a failure result for null input", () => {
    const result = parseAssistantResponse(null);
    expect(result.success).toBe(false);
  });

  it("returns a failure result for a plain string", () => {
    const result = parseAssistantResponse("not json");
    expect(result.success).toBe(false);
  });
});

// ── extractJSON ───────────────────────────────────────────────────────────────

describe("extractJSON", () => {
  it("parses a plain JSON string", () => {
    const json = JSON.stringify(validResponse);
    expect(extractJSON(json)).toEqual(validResponse);
  });

  it("strips markdown json code fences", () => {
    const json = "```json\n" + JSON.stringify(validResponse) + "\n```";
    expect(extractJSON(json)).toEqual(validResponse);
  });

  it("strips plain code fences without language tag", () => {
    const json = "```\n" + JSON.stringify(validResponse) + "\n```";
    expect(extractJSON(json)).toEqual(validResponse);
  });

  it("returns null for non-JSON text", () => {
    expect(extractJSON("This is not JSON.")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractJSON("")).toBeNull();
  });
});
