import { prisma } from "../db";

export async function finaliseRun(runId: string): Promise<void> {
  const results = await prisma.evalResult.findMany({ where: { evalRunId: runId } });

  if (results.length === 0) {
    await prisma.evalRun.update({
      where: { id: runId },
      data: { status: "completed", completedAt: new Date() },
    });
    return;
  }

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;
  const passRate = passCount / results.length;
  const avgLatencyMs =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
  const totalTokens = results.reduce(
    (sum, r) => sum + r.promptTokens + r.completionTokens,
    0
  );
  const estimatedCostUsd = results.reduce(
    (sum, r) => sum + r.estimatedCostUsd,
    0
  );

  const judgedResults = results.filter(r => r.judgeScore !== null);
  const avgJudgeScore =
    judgedResults.length > 0
      ? judgedResults.reduce((sum, r) => sum + (r.judgeScore ?? 0), 0) / judgedResults.length
      : null;

  await prisma.evalRun.update({
    where: { id: runId },
    data: {
      status: "completed",
      completedAt: new Date(),
      passCount,
      failCount,
      passRate,
      avgLatencyMs,
      totalTokens,
      estimatedCostUsd,
      avgJudgeScore,
    },
  });
}
