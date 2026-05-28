export interface RunSummary {
  id: string;
  modelName: string;
  status: string;
  totalCases: number;
  passCount: number;
  failCount: number;
  passRate: number | null;
  avgLatencyMs: number | null;
  totalTokens: number;
  estimatedCostUsd: number | null;
  avgJudgeScore: number | null;
  startedAt: string;
  completedAt: string | null;
  prompt: { name: string; version: number };
}

export interface HumanFeedback {
  rating: number;   // 1 = thumbs up, 0 = thumbs down
  notes?: string | null;
}

export interface CaseResult {
  id: string;
  testCaseId: string;
  passed: boolean;
  answerScore: number;
  evidenceScore: number;
  retrievalPrecision: number;
  retrievalRecall: number;
  toolSelectionScore: number;
  hallucinated: boolean;
  judgeScore: number | null;
  judgeReasoning: string | null;
  latencyMs: number;
  failureReason: string | null;
  finalAnswer?: string;
  humanFeedback?: HumanFeedback | null;
  testCase: {
    query: string;
    category: string;
    difficulty: string;
    expectedAnswer?: string;
    expectedTools?: string[];
    expectedFiles?: string[];
  };
}

export interface RunDetail extends RunSummary {
  results: CaseResult[];
}

export interface CompareResponse {
  runA: RunSummary & { results: CaseResult[] };
  runB: RunSummary & { results: CaseResult[] };
  deltas: {
    passRate: number | null;
    avgLatencyMs: number | null;
    estimatedCostUsd: number | null;
    hallucinationCount: number;
    avgAnswerScore: number;
    avgToolScore: number;
  };
  perCase: Array<{
    testCaseId: string;
    query: string;
    category: string;
    difficulty: string;
    passedA: boolean | null;
    passedB: boolean | null;
    answerScoreA: number | null;
    answerScoreB: number | null;
    isRegression: boolean;
    isImprovement: boolean;
  }>;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 0.75) return "text-green-700";
  if (score >= 0.45) return "text-yellow-700";
  return "text-red-700";
}

export function scoreBg(score: number): string {
  if (score >= 0.75) return "bg-green-500";
  if (score >= 0.45) return "bg-yellow-500";
  return "bg-red-500";
}

export const CATEGORY_COLORS: Record<string, string> = {
  "direct-retrieval": "bg-blue-100 text-blue-800",
  "multi-chunk": "bg-purple-100 text-purple-800",
  glossary: "bg-orange-100 text-orange-800",
  "tool-required": "bg-green-100 text-green-800",
  "tool-not-needed": "bg-gray-100 text-gray-700",
  unanswerable: "bg-yellow-100 text-yellow-800",
  adversarial: "bg-red-100 text-red-800",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  hard: "bg-orange-100 text-orange-700",
};
