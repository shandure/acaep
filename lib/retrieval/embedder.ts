import { embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";

const MODEL = openai.embedding("text-embedding-3-small");
const BATCH_SIZE = 100;

/**
 * Embeds an array of text strings using OpenAI text-embedding-3-small via the Vercel AI SDK.
 * Returns a 1536-dimensional float array for each input, in the same order.
 * Batches requests to stay within API limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({ model: MODEL, values: batch });
    results.push(...embeddings);
  }

  return results;
}

/**
 * Embeds a single text string. Convenience wrapper around embedTexts.
 */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: MODEL, value: text });
  return embedding;
}
