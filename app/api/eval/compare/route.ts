import { prisma } from "../../../../lib/db";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const runAId = url.searchParams.get("runA");
  const runBId = url.searchParams.get("runB");

  if (!runAId || !runBId) {
    return Response.json({ error: "runA and runB query params are required" }, { status: 400 });
  }

  const [runA, runB] = await Promise.all([fetchRun(runAId), fetchRun(runBId)]);

  if (!runA) return Response.json({ error: `Run ${runAId} not found` }, { status: 404 });
  if (!runB) return Response.json({ error: `Run ${runBId} not found` }, { status: 404 });

  // Compute deltas (runB relative to runA — positive means runB improved)
  const deltas = {
    passRate: diff(runB.passRate, runA.passRate),
    avgLatencyMs: diff(runB.avgLatencyMs, runA.avgLatencyMs),
    estimatedCostUsd: diff(runB.estimatedCostUsd, runA.estimatedCostUsd),
    hallucinationCount:
      runB.results.filter(r => r.hallucinated).length -
      runA.results.filter(r => r.hallucinated).length,
    avgAnswerScore:
      avg(runB.results.map(r => r.answerScore)) -
      avg(runA.results.map(r => r.answerScore)),
    avgToolScore:
      avg(runB.results.map(r => r.toolSelectionScore)) -
      avg(runA.results.map(r => r.toolSelectionScore)),
  };

  // Per-case diff keyed by testCaseId
  const caseMapA = new Map(runA.results.map(r => [r.testCaseId, r]));
  const caseMapB = new Map(runB.results.map(r => [r.testCaseId, r]));

  const allCaseIds = new Set([...caseMapA.keys(), ...caseMapB.keys()]);
  const perCase = Array.from(allCaseIds).map(caseId => {
    const a = caseMapA.get(caseId);
    const b = caseMapB.get(caseId);
    return {
      testCaseId: caseId,
      query: a?.testCase.query ?? b?.testCase.query ?? "",
      category: a?.testCase.category ?? b?.testCase.category ?? "",
      difficulty: a?.testCase.difficulty ?? b?.testCase.difficulty ?? "",
      passedA: a?.passed ?? null,
      passedB: b?.passed ?? null,
      answerScoreA: a?.answerScore ?? null,
      answerScoreB: b?.answerScore ?? null,
      isRegression: a?.passed === true && b?.passed === false,
      isImprovement: a?.passed === false && b?.passed === true,
    };
  });

  return Response.json({ runA, runB, deltas, perCase });
}

async function fetchRun(id: string) {
  return prisma.evalRun.findUnique({
    where: { id },
    include: {
      prompt: { select: { name: true, version: true } },
      results: {
        select: {
          id: true,
          testCaseId: true,
          passed: true,
          answerScore: true,
          evidenceScore: true,
          retrievalPrecision: true,
          retrievalRecall: true,
          toolSelectionScore: true,
          hallucinated: true,
          latencyMs: true,
          failureReason: true,
          testCase: {
            select: { query: true, category: true, difficulty: true },
          },
        },
      },
    },
  });
}

function diff(b: number | null | undefined, a: number | null | undefined): number | null {
  if (b == null || a == null) return null;
  return b - a;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
