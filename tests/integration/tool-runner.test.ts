import { describe, it, expect, afterAll } from "vitest";
import { tools } from "../../lib/ai/tools";
import { prisma } from "../../lib/db";

const hasDb = !!process.env.DATABASE_URL;

// Helper: call a tool's execute without the optional ToolExecutionOptions argument
// (our execute implementations never use the second argument)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exec(tool: object, args: Record<string, unknown> = {}): Promise<unknown> {
  return (tool as { execute: (a: Record<string, unknown>) => Promise<unknown> }).execute(args);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!hasDb)("listFiles tool — integration", () => {
  it("returns a non-empty array of documents", async () => {
    const result = await exec(tools.listFiles);
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBeGreaterThan(0);
  });

  it("includes known knowledge-base files", async () => {
    const result = (await exec(tools.listFiles)) as { path: string }[];
    const paths = result.map(d => d.path);
    expect(paths).toContain("lib/users.ts");
    expect(paths).toContain("lib/auth.ts");
    expect(paths).toContain("docs/glossary.md");
  });

  it("returns path, type and name on each entry", async () => {
    const result = (await exec(tools.listFiles)) as { path: string; type: string; name: string }[];
    for (const d of result) {
      expect(typeof d.path).toBe("string");
      expect(typeof d.type).toBe("string");
      expect(typeof d.name).toBe("string");
    }
  });
});

describe.skipIf(!hasDb)("readFile tool — integration", () => {
  it("returns content for a known file", async () => {
    const result = (await exec(tools.readFile, { path: "lib/users.ts" })) as {
      content: string;
      path: string;
    };
    expect(result.content).toContain("getUserById");
    expect(result.path).toBe("lib/users.ts");
  });

  it("returns an error object for an unknown path", async () => {
    const result = (await exec(tools.readFile, { path: "nonexistent/file.ts" })) as {
      error: string;
    };
    expect(result.error).toMatch(/not found/i);
  });

  it("rejects a path-traversal attempt without throwing", async () => {
    const result = (await exec(tools.readFile, { path: "../../.env" })) as { error: string };
    expect(result.error).toBeDefined();
  });
});

describe.skipIf(!hasDb)("searchCodebase tool — integration", () => {
  it("returns results for a known query", async () => {
    const result = (await exec(tools.searchCodebase, { query: "getUserById user lookup" })) as {
      content: string;
      similarity: number;
    }[];
    expect(result.length).toBeGreaterThan(0);
  });

  it("top result similarity is above 0.4 for a specific function name", async () => {
    const result = (await exec(tools.searchCodebase, { query: "getUserById" })) as {
      similarity: number;
    }[];
    expect(result[0].similarity).toBeGreaterThan(0.4);
  });

  it("each result has content, file, and similarity", async () => {
    const result = (await exec(tools.searchCodebase, { query: "JWT token auth" })) as {
      content: string;
      file: string;
      similarity: number;
    }[];
    for (const r of result) {
      expect(typeof r.content).toBe("string");
      expect(typeof r.file).toBe("string");
      expect(typeof r.similarity).toBe("number");
    }
  });
});

describe.skipIf(!hasDb)("getFunctionDefinition tool — integration", () => {
  it("finds the getUserById function", async () => {
    const result = await exec(tools.getFunctionDefinition, { name: "getUserById" });
    expect(Array.isArray(result)).toBe(true);
    const chunks = result as { content: string }[];
    expect(chunks.some(c => c.content.includes("getUserById"))).toBe(true);
  });

  it("returns an error for a totally unknown function name", async () => {
    const result = (await exec(tools.getFunctionDefinition, {
      name: "xyzNoSuchFunctionEver",
    })) as { error?: string };
    // Either error object or empty array — both are acceptable
    if (!Array.isArray(result)) {
      expect(result.error).toBeDefined();
    } else {
      expect((result as unknown[]).length).toBe(0);
    }
  });
});

describe.skipIf(!hasDb)("lookupGlossaryTerm tool — integration", () => {
  it("finds the settlement cycle term", async () => {
    const result = (await exec(tools.lookupGlossaryTerm, { term: "settlement cycle" })) as {
      content: string;
    }[];
    expect(result.length).toBeGreaterThan(0);
    const combined = result.map(r => r.content.toLowerCase()).join(" ");
    expect(combined).toMatch(/settlement/);
  });

  it("returns markdown sources only", async () => {
    const result = (await exec(tools.lookupGlossaryTerm, { term: "mark to market" })) as {
      source: string;
    }[];
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.source).toMatch(/\.md$/);
    }
  });

  it("returns an error for a term with no documentation", async () => {
    const result = (await exec(tools.lookupGlossaryTerm, {
      term: "xyzCompletelyUnknownTerm12345",
    })) as { error?: string };
    if (!Array.isArray(result)) {
      expect(result.error).toBeDefined();
    }
  });
});
