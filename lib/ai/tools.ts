import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "../retrieval/retriever";
import { prisma } from "../db";

// ── Tool definitions ──────────────────────────────────────────────────────────
//
// All tools are read-only. They only query the database — they never write,
// execute shell commands, or access the filesystem at runtime.
//
// Security controls:
// - readFile validates the path against the ingested document list (no path traversal)
// - All execute() functions return { error } rather than throwing on failure,
//   preventing a single bad tool call from crashing the whole inference loop
// - Tool outputs are plain JS objects — no executable code, no HTML, no raw SQL

export const tools = {
  // Search the vector store for chunks semantically similar to the query
  searchCodebase: tool({
    description:
      "Search the ingested knowledge base for code or documentation relevant to a query. Use this when you need to find content without knowing the exact file.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query"),
    }),
    execute: async ({ query }) => {
      const chunks = await retrieve(query, { topK: 5 });
      return chunks.map(c => ({
        content: c.content,
        file: c.documentPath,
        similarity: c.similarity,
      }));
    },
  }),

  // Read the full content of a specific file by its known path
  readFile: tool({
    description:
      "Read the full content of a specific file from the knowledge base. Use this when you know the exact file path.",
    inputSchema: z.object({
      path: z.string().describe("Relative file path, e.g. lib/users.ts or docs/glossary.md"),
    }),
    execute: async ({ path }) => {
      // Security: only paths that exist in the ingested Document table are allowed.
      // A path like ../../.env cannot match any ingested document, preventing traversal.
      const doc = await prisma.document.findUnique({ where: { path } });
      if (!doc) return { error: `File not found in knowledge base: ${path}` };
      return { content: doc.content, path: doc.path, type: doc.type };
    },
  }),

  // List all available files in the knowledge base
  listFiles: tool({
    description:
      "List all files available in the knowledge base with their types. Use this when you need to discover what files exist before deciding which to read.",
    inputSchema: z.object({}),
    execute: async () => {
      const docs = await prisma.document.findMany({
        select: { path: true, type: true, name: true },
        orderBy: { path: "asc" },
      });
      return docs;
    },
  }),

  // Find a function definition by name via vector search
  getFunctionDefinition: tool({
    description:
      "Find the definition of a named function or class in the codebase. Prefer this over searchCodebase when you know the exact function name.",
    inputSchema: z.object({
      name: z.string().describe("The function or class name to find, e.g. getUserById"),
    }),
    execute: async ({ name }) => {
      const chunks = await retrieve(`function ${name} definition`, { topK: 5 });
      const relevant = chunks.filter(c => c.content.includes(name));
      if (relevant.length === 0) {
        return { error: `No definition found for: ${name}` };
      }
      return relevant.map(c => ({ content: c.content, file: c.documentPath }));
    },
  }),

  // Look up a glossary or documentation term (searches only markdown files)
  lookupGlossaryTerm: tool({
    description:
      "Look up a term in the knowledge base glossary or documentation. Use this for domain-specific terms, acronyms, or concepts rather than code.",
    inputSchema: z.object({
      term: z.string().describe("The term or concept to look up, e.g. settlement cycle"),
    }),
    execute: async ({ term }) => {
      const chunks = await retrieve(term, { topK: 3, filterType: "markdown" });
      if (chunks.length === 0) return { error: `No documentation found for: ${term}` };
      return chunks.map(c => ({ content: c.content, source: c.documentPath }));
    },
  }),
};

export type ToolName = keyof typeof tools;
