import type { AssistantResponse } from "../ai/structured-output";

export interface TestCaseInput {
  expectedAnswer: string;
  requiredEvidence: string[];
  expectedFiles: string[];
  expectedTools: string[];
  unacceptablePhrases: string[];
}

export interface UsageInput {
  inputTokens: number;
  outputTokens: number;
}

export interface Scores {
  answerScore: number;
  evidenceScore: number;
  retrievalPrecision: number;
  retrievalRecall: number;
  toolSelectionScore: number;
  hallucinated: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  passed: boolean;
  failureReason: string | null;
}

// GPT-4o pricing (USD per token)
const INPUT_PRICE = 5.0 / 1_000_000;
const OUTPUT_PRICE = 15.0 / 1_000_000;

// Minimum answer score to pass. Keyword overlap is a noisy metric — 0.4 is
// a realistic floor before adding a judge model in a later phase.
const PASS_ANSWER_THRESHOLD = 0.4;

export function scoreResult(
  testCase: TestCaseInput,
  output: AssistantResponse,
  latencyMs: number,
  usage: UsageInput
): Scores {
  // ── Answer score: keyword recall against expected answer ──────────────────
  // Splits on non-word characters (strips punctuation), filters stopwords by
  // keeping tokens ≥ 3 chars. Simple but fast and deterministic.
  const expectedTokens = tokenise(testCase.expectedAnswer);
  const outputSet = new Set(tokenise(output.answer));
  const answerScore =
    expectedTokens.length > 0
      ? expectedTokens.filter(w => outputSet.has(w)).length / expectedTokens.length
      : 1;

  // ── Evidence score: all required phrases must appear in evidence content ──
  const evidenceText = output.evidence
    .map(e => e.content.toLowerCase())
    .join(" ");
  const evidenceScore =
    testCase.requiredEvidence.length === 0
      ? 1
      : testCase.requiredEvidence.every(phrase =>
          evidenceText.includes(phrase.toLowerCase())
        )
      ? 1
      : 0;

  // ── Retrieval precision/recall against expected files ─────────────────────
  const retrieved = output.files_used;
  const expected = testCase.expectedFiles;
  const overlap = retrieved.filter(f => expected.includes(f));
  const retrievalPrecision =
    retrieved.length > 0
      ? overlap.length / retrieved.length
      : expected.length === 0
      ? 1
      : 0;
  const retrievalRecall =
    expected.length > 0 ? overlap.length / expected.length : 1;

  // ── Tool selection score ──────────────────────────────────────────────────
  const calledTools = new Set(output.tools_called.map(t => t.name));
  const correctTools = testCase.expectedTools.filter(t => calledTools.has(t));
  const toolSelectionScore =
    testCase.expectedTools.length > 0
      ? correctTools.length / testCase.expectedTools.length
      : 1;

  // ── Hallucination: any unacceptable phrase in the answer ──────────────────
  const answerLower = output.answer.toLowerCase();
  const hallucinated = testCase.unacceptablePhrases.some(phrase =>
    answerLower.includes(phrase.toLowerCase())
  );

  // ── Token usage and cost ──────────────────────────────────────────────────
  const promptTokens = usage.inputTokens;
  const completionTokens = usage.outputTokens;
  const estimatedCostUsd =
    promptTokens * INPUT_PRICE + completionTokens * OUTPUT_PRICE;

  // ── Pass/fail ─────────────────────────────────────────────────────────────
  const passed = answerScore >= PASS_ANSWER_THRESHOLD && !hallucinated;
  const reasons = [
    answerScore < PASS_ANSWER_THRESHOLD &&
      `low answer score (${answerScore.toFixed(2)} < ${PASS_ANSWER_THRESHOLD})`,
    hallucinated && "hallucination detected",
  ].filter((r): r is string => Boolean(r));

  return {
    answerScore,
    evidenceScore,
    retrievalPrecision,
    retrievalRecall,
    toolSelectionScore,
    hallucinated,
    latencyMs,
    promptTokens,
    completionTokens,
    estimatedCostUsd,
    passed,
    failureReason: reasons.length > 0 ? reasons.join("; ") : null,
  };
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= 3);
}
