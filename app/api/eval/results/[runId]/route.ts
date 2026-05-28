import { prisma } from "../../../../../lib/db";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const { runId } = await params;

  const run = await prisma.evalRun.findUnique({
    where: { id: runId },
    include: {
      prompt: { select: { name: true, version: true } },
      results: {
        include: {
          testCase: {
            select: {
              query: true,
              expectedAnswer: true,
              category: true,
              difficulty: true,
              expectedTools: true,
              expectedFiles: true,
            },
          },
          toolCallLogs: { orderBy: { createdAt: "asc" } },
          humanFeedback: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  return Response.json(run);
}
