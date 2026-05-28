import { prisma } from "../../../lib/db";

// POST /api/feedback
// Body: { evalResultId: string, rating: 0 | 1, notes?: string }
// Creates or replaces the HumanFeedback row for the given result.
export async function POST(req: Request): Promise<Response> {
  let body: { evalResultId?: unknown; rating?: unknown; notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { evalResultId, rating, notes } = body;

  if (typeof evalResultId !== "string" || !evalResultId) {
    return Response.json({ error: "evalResultId is required" }, { status: 400 });
  }
  if (rating !== 0 && rating !== 1) {
    return Response.json({ error: "rating must be 0 or 1" }, { status: 400 });
  }
  if (notes !== undefined && typeof notes !== "string") {
    return Response.json({ error: "notes must be a string if provided" }, { status: 400 });
  }

  const result = await prisma.evalResult.findUnique({ where: { id: evalResultId } });
  if (!result) {
    return Response.json({ error: "EvalResult not found" }, { status: 404 });
  }

  const feedback = await prisma.humanFeedback.upsert({
    where: { evalResultId },
    create: { evalResultId, rating: rating as number, notes: notes as string | undefined },
    update: { rating: rating as number, notes: notes as string | undefined },
  });

  return Response.json(feedback, { status: 200 });
}

// DELETE /api/feedback?evalResultId=xxx
export async function DELETE(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const evalResultId = url.searchParams.get("evalResultId");
  if (!evalResultId) {
    return Response.json({ error: "evalResultId query param required" }, { status: 400 });
  }

  try {
    await prisma.humanFeedback.delete({ where: { evalResultId } });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }
}
