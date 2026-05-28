import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractJSON } from "../ai/structured-output";

export interface JudgeResult {
  score: number;      // 0.0 – 1.0
  reasoning: string;  // one-sentence explanation
}

// Cheaper model for batch judging — gpt-4o-mini is ~30× cheaper than gpt-4o
// while still being capable of semantic answer evaluation.
const judgeModel = openai.chat("gpt-4o-mini");

const JUDGE_SYSTEM = `You are an evaluation judge for an AI assistant that answers questions about a software codebase.
You will be given a question, the expected correct answer, and the model's actual answer.
Score the model answer from 0.0 to 1.0 based on:
- Factual correctness: does it get the key facts right?
- Completeness: does it cover what the expected answer covers?
- No hallucination: does it avoid inventing information not in the expected answer?

Respond with ONLY a JSON object — no markdown, no preamble:
{ "score": <0.0 to 1.0>, "reasoning": "<one sentence>" }`;

export async function judgeAnswer(
  query: string,
  expectedAnswer: string,
  modelAnswer: string
): Promise<JudgeResult> {
  try {
    const result = await generateText({
      model: judgeModel,
      system: JUDGE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Question: ${query}\n\nExpected answer: ${expectedAnswer}\n\nModel answer: ${modelAnswer}`,
        },
      ],
      maxTokens: 200,
    });

    const parsed = extractJSON(result.text) as { score?: number; reasoning?: string } | null;
    if (
      parsed &&
      typeof parsed.score === "number" &&
      typeof parsed.reasoning === "string"
    ) {
      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning,
      };
    }
  } catch (err) {
    console.warn("[judge] Failed to score answer:", err instanceof Error ? err.message : err);
  }

  return { score: 0, reasoning: "judge call failed" };
}

// Pricing for gpt-4o-mini (USD per token) — used by reporter to separate judge cost
export const JUDGE_INPUT_PRICE = 0.15 / 1_000_000;
export const JUDGE_OUTPUT_PRICE = 0.60 / 1_000_000;
