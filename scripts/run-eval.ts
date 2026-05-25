import "./_load-env";
import { prisma } from "../lib/db";
import { runEvaluation } from "../lib/eval/harness";

async function main() {
  const activePrompt = await prisma.prompt.findFirst({ where: { isActive: true } });
  if (!activePrompt) {
    console.error("No active prompt found. Run `npm run seed:prompt` first.");
    process.exit(1);
  }

  const testCaseCount = await prisma.testCase.count();
  if (testCaseCount === 0) {
    console.error("No test cases found. Run `npm run seed:cases` first.");
    process.exit(1);
  }

  console.log(`Running eval: prompt="${activePrompt.name}", model=gpt-4o, cases=${testCaseCount}`);
  console.log("This may take several minutes...\n");

  const runId = await runEvaluation({
    promptId: activePrompt.id,
    onProgress: (completed, total, passed) => {
      const status = passed ? "PASS" : "FAIL";
      console.log(`  [${completed}/${total}] ${status}`);
    },
  });

  const run = await prisma.evalRun.findUniqueOrThrow({ where: { id: runId } });
  console.log(`\nCompleted run: ${runId}`);
  console.log(`  Pass rate:    ${((run.passRate ?? 0) * 100).toFixed(1)}%`);
  console.log(`  Avg latency:  ${run.avgLatencyMs?.toFixed(0)}ms`);
  console.log(`  Total tokens: ${run.totalTokens}`);
  console.log(`  Est. cost:    $${run.estimatedCostUsd?.toFixed(4)}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
