import { generateText } from "ai";
import { model } from "../ai/client";
import { tools } from "../ai/tools";
import { buildUserMessage } from "../ai/prompt-builder";
import { parseAssistantResponse, extractJSON } from "../ai/structured-output";
import type { AssistantResponse } from "../ai/structured-output";
import { retrieve } from "../retrieval/retriever";
import { prisma } from "../db";
import { scoreResult } from "./scorer";
import { loadTestCases } from "./test-cases";
import { finaliseRun } from "./reporter";

export interface RunOptions {
  promptId: string;
  modelName?: string;
  onProgress?: (completed: number, total: number, passed: boolean) => void;
}

export async function runEvaluation(options: RunOptions): Promise<string> {
  const { promptId, modelName = "gpt-4o", onProgress } = options;

  const prompt = await prisma.prompt.findUniqueOrThrow({ where: { id: promptId } });
  const testCases = await loadTestCases();

  const run = await prisma.evalRun.create({
    data: {
      promptId,
      modelName,
      status: "running",
      totalCases: testCases.length,
    },
  });

  let completed = 0;

  for (const tc of testCases) {
    let passed = false;

    try {
      const initialChunks = await retrieve(tc.query, { topK: 5 });
      const startMs = Date.now();

      const result = await generateText({
        model,
        system: prompt.systemText,
        messages: [{ role: "user", content: buildUserMessage(tc.query, initialChunks) }],
        tools,
        maxSteps: 5,
      });

      const latencyMs = Date.now() - startMs;
      const parsed = parseAssistantResponse(extractJSON(result.text));

      let output: AssistantResponse;
      let failureReason: string | null = null;

      if (!parsed.success) {
        // Model produced invalid structured output — record as a failed case
        output = emptyResponse();
        failureReason = `invalid structured output: ${parsed.error}`;
      } else {
        output = parsed.data;
      }

      const scores = parsed.success
        ? scoreResult(
            {
              expectedAnswer: tc.expectedAnswer,
              requiredEvidence: tc.requiredEvidence,
              expectedFiles: tc.expectedFiles,
              expectedTools: tc.expectedTools,
              unacceptablePhrases: tc.unacceptablePhrases,
            },
            output,
            latencyMs,
            { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens }
          )
        : zeroScores(latencyMs);

      if (failureReason) scores.failureReason = failureReason;
      passed = scores.passed;

      const evalResult = await prisma.evalResult.create({
        data: {
          evalRunId: run.id,
          testCaseId: tc.id,
          modelOutput: output as object,
          finalAnswer: output.answer,
          passed: scores.passed,
          failureReason: scores.failureReason,
          answerScore: scores.answerScore,
          evidenceScore: scores.evidenceScore,
          retrievalPrecision: scores.retrievalPrecision,
          retrievalRecall: scores.retrievalRecall,
          toolSelectionScore: scores.toolSelectionScore,
          hallucinated: scores.hallucinated,
          latencyMs: scores.latencyMs,
          promptTokens: scores.promptTokens,
          completionTokens: scores.completionTokens,
          estimatedCostUsd: scores.estimatedCostUsd,
        },
      });

      // Log tool calls — wrapped separately so a logging failure does not
      // trigger the outer catch and create a duplicate EvalResult record.
      const toolResultLogs = result.toolResults ?? [];
      for (const tr of toolResultLogs) {
        try {
          const resultObj = tr.result as Record<string, unknown>;
          const isError = typeof resultObj === "object" && "error" in resultObj;
          await prisma.toolCallLog.create({
            data: {
              evalResultId: evalResult.id,
              toolName: tr.toolName,
              inputArgs: tr.args as object,
              outputResult: resultObj as object,
              durationMs: 0,
              success: !isError,
              errorMessage: isError ? String(resultObj.error) : null,
            },
          });
        } catch (logErr) {
          console.warn(`[harness] Failed to log tool call "${tr.toolName}":`, logErr);
        }
      }
    } catch (err) {
      // Unexpected failure (network error, DB error, etc.) — record as failed
      const errMsg = err instanceof Error ? err.message : String(err);
      await prisma.evalResult.create({
        data: {
          evalRunId: run.id,
          testCaseId: tc.id,
          modelOutput: {},
          finalAnswer: "",
          passed: false,
          failureReason: `exception: ${errMsg}`,
          answerScore: 0,
          evidenceScore: 0,
          retrievalPrecision: 0,
          retrievalRecall: 0,
          toolSelectionScore: 0,
          hallucinated: false,
          latencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCostUsd: 0,
        },
      });
    }

    completed++;
    onProgress?.(completed, testCases.length, passed);
  }

  await finaliseRun(run.id);
  return run.id;
}

function emptyResponse(): AssistantResponse {
  return {
    answer: "",
    evidence: [],
    confidence: "low",
    files_used: [],
    tools_called: [],
    risk_level: "none",
    missing_information: null,
    suggested_next_step: null,
  };
}

function zeroScores(latencyMs: number) {
  return {
    answerScore: 0,
    evidenceScore: 0,
    retrievalPrecision: 0,
    retrievalRecall: 0,
    toolSelectionScore: 0,
    hallucinated: false,
    latencyMs,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    passed: false,
    failureReason: null as string | null,
  };
}
