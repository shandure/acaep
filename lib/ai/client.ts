import { openai } from "@ai-sdk/openai";

// The openai() call returns a language model instance configured for the given
// model ID. OPENAI_API_KEY is read automatically from process.env by the SDK.
// Swap the model ID here to switch the whole application to a different model.
// Use .chat() to target the Chat Completions API — @ai-sdk/openai v3 defaults
// to the newer Responses API which rejects our tool parameter schemas.
export const model = openai.chat("gpt-4o");
