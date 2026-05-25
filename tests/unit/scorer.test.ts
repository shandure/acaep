import { describe, it, expect } from "vitest";
import { scoreResult } from "../../lib/eval/scorer";
import type { TestCaseInput } from "../../lib/eval/scorer";
import type { AssistantResponse } from "../../lib/ai/structured-output";

function makeOutput(overrides: Partial<AssistantResponse> = {}): AssistantResponse {
  return {
    answer: "The function returns a User object or null",
    evidence: [{ content: "getUserById returns User or null", source: "lib/users.ts" }],
    confidence: "high",
    files_used: ["lib/users.ts"],
    tools_called: [{ name: "getFunctionDefinition", args: { name: "getUserById" } }],
    risk_level: "none",
    missing_information: null,
    suggested_next_step: null,
    ...overrides,
  };
}

function makeTestCase(overrides: Partial<TestCaseInput> = {}): TestCaseInput {
  return {
    expectedAnswer: "returns User object or null",
    requiredEvidence: ["getUserById", "null"],
    expectedFiles: ["lib/users.ts"],
    expectedTools: ["getFunctionDefinition"],
    unacceptablePhrases: ["I don't know"],
    ...overrides,
  };
}

const defaultUsage = { inputTokens: 1000, outputTokens: 200 };

// ── answerScore ───────────────────────────────────────────────────────────────

describe("scoreResult — answerScore", () => {
  it("returns 1 when output contains all expected keywords", () => {
    const tc = makeTestCase({ expectedAnswer: "returns user null" });
    const out = makeOutput({ answer: "The function returns a user object or null if not found" });
    const { answerScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(answerScore).toBeGreaterThan(0.9);
  });

  it("returns 0 when output shares no keywords with expected", () => {
    const tc = makeTestCase({ expectedAnswer: "settlement cycle T+2" });
    const out = makeOutput({ answer: "The sky is blue and clouds are white" });
    const { answerScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(answerScore).toBe(0);
  });

  it("returns 1 when expectedAnswer is empty (no keywords to match)", () => {
    const tc = makeTestCase({ expectedAnswer: "" });
    const { answerScore } = scoreResult(tc, makeOutput(), 100, defaultUsage);
    expect(answerScore).toBe(1);
  });

  it("ignores short words (< 3 chars) in scoring", () => {
    // "is", "a", "or" are below the 3-char threshold and should not count
    const tc = makeTestCase({ expectedAnswer: "is a or" });
    const out = makeOutput({ answer: "completely unrelated answer here" });
    const { answerScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(answerScore).toBe(1); // no scoreable tokens → score 1
  });
});

// ── evidenceScore ─────────────────────────────────────────────────────────────

describe("scoreResult — evidenceScore", () => {
  it("returns 1 when all required phrases are in evidence", () => {
    const tc = makeTestCase({ requiredEvidence: ["getUserById", "null"] });
    const out = makeOutput({
      evidence: [{ content: "getUserById returns null if not found", source: "lib/users.ts" }],
    });
    const { evidenceScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(evidenceScore).toBe(1);
  });

  it("returns 0 when any required phrase is missing from evidence", () => {
    const tc = makeTestCase({ requiredEvidence: ["getUserById", "Promise"] });
    const out = makeOutput({
      evidence: [{ content: "getUserById returns null", source: "lib/users.ts" }],
    });
    const { evidenceScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(evidenceScore).toBe(0);
  });

  it("returns 1 when requiredEvidence is empty", () => {
    const tc = makeTestCase({ requiredEvidence: [] });
    const { evidenceScore } = scoreResult(tc, makeOutput(), 100, defaultUsage);
    expect(evidenceScore).toBe(1);
  });

  it("checks across all evidence items combined", () => {
    const tc = makeTestCase({ requiredEvidence: ["phrase-a", "phrase-b"] });
    const out = makeOutput({
      evidence: [
        { content: "phrase-a is here", source: "lib/a.ts" },
        { content: "phrase-b is here", source: "lib/b.ts" },
      ],
    });
    const { evidenceScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(evidenceScore).toBe(1);
  });
});

// ── retrievalPrecision / retrievalRecall ──────────────────────────────────────

describe("scoreResult — retrieval metrics", () => {
  it("precision = 1 when all retrieved files are expected", () => {
    const tc = makeTestCase({ expectedFiles: ["lib/users.ts", "lib/auth.ts"] });
    const out = makeOutput({ files_used: ["lib/users.ts"] });
    const { retrievalPrecision } = scoreResult(tc, out, 100, defaultUsage);
    expect(retrievalPrecision).toBe(1);
  });

  it("precision < 1 when retrieved files include unexpected ones", () => {
    const tc = makeTestCase({ expectedFiles: ["lib/users.ts"] });
    const out = makeOutput({ files_used: ["lib/users.ts", "lib/other.ts"] });
    const { retrievalPrecision } = scoreResult(tc, out, 100, defaultUsage);
    expect(retrievalPrecision).toBe(0.5);
  });

  it("recall = 1 when all expected files are retrieved", () => {
    const tc = makeTestCase({ expectedFiles: ["lib/users.ts"] });
    const out = makeOutput({ files_used: ["lib/users.ts", "lib/extra.ts"] });
    const { retrievalRecall } = scoreResult(tc, out, 100, defaultUsage);
    expect(retrievalRecall).toBe(1);
  });

  it("recall < 1 when some expected files are not retrieved", () => {
    const tc = makeTestCase({ expectedFiles: ["lib/users.ts", "lib/auth.ts"] });
    const out = makeOutput({ files_used: ["lib/users.ts"] });
    const { retrievalRecall } = scoreResult(tc, out, 100, defaultUsage);
    expect(retrievalRecall).toBe(0.5);
  });

  it("precision and recall are both 1 when no files are expected", () => {
    const tc = makeTestCase({ expectedFiles: [] });
    const out = makeOutput({ files_used: [] });
    const { retrievalPrecision, retrievalRecall } = scoreResult(tc, out, 100, defaultUsage);
    expect(retrievalPrecision).toBe(1);
    expect(retrievalRecall).toBe(1);
  });
});

// ── toolSelectionScore ────────────────────────────────────────────────────────

describe("scoreResult — toolSelectionScore", () => {
  it("returns 1 when all expected tools are called", () => {
    const tc = makeTestCase({ expectedTools: ["getFunctionDefinition"] });
    const out = makeOutput({ tools_called: [{ name: "getFunctionDefinition", args: {} }] });
    const { toolSelectionScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(toolSelectionScore).toBe(1);
  });

  it("returns partial credit when only some expected tools are called", () => {
    const tc = makeTestCase({ expectedTools: ["searchCodebase", "readFile"] });
    const out = makeOutput({ tools_called: [{ name: "searchCodebase", args: {} }] });
    const { toolSelectionScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(toolSelectionScore).toBe(0.5);
  });

  it("returns 1 when no tools are expected (tool-not-needed cases)", () => {
    const tc = makeTestCase({ expectedTools: [] });
    const out = makeOutput({ tools_called: [] });
    const { toolSelectionScore } = scoreResult(tc, out, 100, defaultUsage);
    expect(toolSelectionScore).toBe(1);
  });
});

// ── hallucination ─────────────────────────────────────────────────────────────

describe("scoreResult — hallucination", () => {
  it("returns hallucinated=false when no unacceptable phrases present", () => {
    const tc = makeTestCase({ unacceptablePhrases: ["I don't know"] });
    const out = makeOutput({ answer: "The function returns a User object." });
    const { hallucinated } = scoreResult(tc, out, 100, defaultUsage);
    expect(hallucinated).toBe(false);
  });

  it("returns hallucinated=true when an unacceptable phrase is in the answer", () => {
    const tc = makeTestCase({ unacceptablePhrases: ["I don't know"] });
    const out = makeOutput({ answer: "I don't know what this function does." });
    const { hallucinated } = scoreResult(tc, out, 100, defaultUsage);
    expect(hallucinated).toBe(true);
  });

  it("is case-insensitive", () => {
    const tc = makeTestCase({ unacceptablePhrases: ["DATABASE_URL"] });
    const out = makeOutput({ answer: "The database_url is postgres://localhost/db" });
    const { hallucinated } = scoreResult(tc, out, 100, defaultUsage);
    expect(hallucinated).toBe(true);
  });
});

// ── pass/fail ─────────────────────────────────────────────────────────────────

describe("scoreResult — pass/fail", () => {
  it("passes when answerScore is above threshold and no hallucination", () => {
    const tc = makeTestCase({ expectedAnswer: "returns user null object" });
    const out = makeOutput({ answer: "The function returns a user object or null" });
    const { passed } = scoreResult(tc, out, 100, defaultUsage);
    expect(passed).toBe(true);
  });

  it("fails when hallucination is detected even with high answer score", () => {
    const tc = makeTestCase({
      expectedAnswer: "returns user null",
      unacceptablePhrases: ["I don't know"],
    });
    const out = makeOutput({
      answer: "returns user null but I don't know the details",
    });
    const { passed, failureReason } = scoreResult(tc, out, 100, defaultUsage);
    expect(passed).toBe(false);
    expect(failureReason).toContain("hallucination");
  });

  it("fails when answerScore is below threshold", () => {
    const tc = makeTestCase({ expectedAnswer: "settlement counterparty T+2 exchange" });
    const out = makeOutput({ answer: "completely unrelated response about nothing" });
    const { passed, failureReason } = scoreResult(tc, out, 100, defaultUsage);
    expect(passed).toBe(false);
    expect(failureReason).toContain("answer score");
  });
});

// ── cost estimation ───────────────────────────────────────────────────────────

describe("scoreResult — cost estimation", () => {
  it("estimates cost correctly based on token counts", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
    const { estimatedCostUsd } = scoreResult(makeTestCase(), makeOutput(), 100, usage);
    // 1M input × $5/M + 1M output × $15/M = $20
    expect(estimatedCostUsd).toBeCloseTo(20, 5);
  });

  it("records latencyMs from the argument", () => {
    const { latencyMs } = scoreResult(makeTestCase(), makeOutput(), 3141, defaultUsage);
    expect(latencyMs).toBe(3141);
  });
});
