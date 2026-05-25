import { prisma } from "../../../../lib/db";
import { runEvaluation } from "../../../../lib/eval/harness";

// POST /api/eval/run
// Body: { promptId?: string; modelName?: string }
//
// Runs the full evaluation harness synchronously. For a local dev tool
// this is acceptable; in production you'd offload to a queue worker.
// Returns the completed EvalRun with aggregate stats.

export async function POST(req: Request): Promise<Response> {
  let body: { promptId?: string; modelName?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — we'll use the active prompt
  }

  // Resolve prompt: use the provided ID or fall back to the active prompt
  let promptId = body.promptId;
  if (!promptId) {
    const active = await prisma.prompt.findFirst({ where: { isActive: true } });
    if (!active) {
      return Response.json(
        { error: "No active prompt found. Seed one with npm run seed:prompt." },
        { status: 400 }
      );
    }
    promptId = active.id;
  }

  const testCaseCount = await prisma.testCase.count();
  if (testCaseCount === 0) {
    return Response.json(
      { error: "No test cases found. Seed them with npm run seed:cases." },
      { status: 400 }
    );
  }

  try {
    const runId = await runEvaluation({
      promptId,
      modelName: body.modelName ?? "gpt-4o",
    });

    const run = await prisma.evalRun.findUniqueOrThrow({
      where: { id: runId },
      include: { prompt: { select: { name: true, version: true } } },
    });

    return Response.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
