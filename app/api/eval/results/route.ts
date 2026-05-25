import { prisma } from "../../../../lib/db";

// GET /api/eval/results
// Returns all EvalRuns with aggregate stats, newest first.
// Each run includes the prompt name/version but not individual case results
// (those are fetched separately by the dashboard detail view).

export async function GET(): Promise<Response> {
  const runs = await prisma.evalRun.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      prompt: { select: { name: true, version: true } },
      results: {
        select: {
          id: true,
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

  return Response.json(runs);
}
