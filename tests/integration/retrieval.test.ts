import { describe, it, expect, afterAll } from "vitest";
import { retrieve } from "../../lib/retrieval/retriever";
import { prisma } from "../../lib/db";

const hasDb = !!process.env.DATABASE_URL;

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!hasDb)("retriever — integration", () => {
  it("returns at least one chunk for a known query", async () => {
    const chunks = await retrieve("getUserById function", { topK: 3 });
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("top result for getUserById query contains the function name", async () => {
    const chunks = await retrieve("getUserById", { topK: 3 });
    expect(chunks[0].content).toContain("getUserById");
  });

  it("returns similarity scores between 0 and 1", async () => {
    const chunks = await retrieve("JWT token", { topK: 5 });
    for (const c of chunks) {
      expect(c.similarity).toBeGreaterThanOrEqual(0);
      expect(c.similarity).toBeLessThanOrEqual(1);
    }
  });

  it("returns results in descending similarity order", async () => {
    const chunks = await retrieve("validateCredentials bcrypt password", { topK: 5 });
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i - 1].similarity).toBeGreaterThanOrEqual(chunks[i].similarity);
    }
  });

  it("respects the topK limit", async () => {
    const chunks = await retrieve("user authentication", { topK: 2 });
    expect(chunks.length).toBeLessThanOrEqual(2);
  });

  it("filterType markdown returns only .md file paths", async () => {
    const chunks = await retrieve("settlement cycle T+2", {
      topK: 5,
      filterType: "markdown",
    });
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) {
      expect(c.documentPath).toMatch(/\.md$/);
    }
  });

  it("top result for settlement glossary query mentions T+2 or settlement", async () => {
    const chunks = await retrieve("what is settlement cycle T+2", { topK: 3 });
    const text = chunks.map(c => c.content.toLowerCase()).join(" ");
    expect(text).toMatch(/settlement|t\+2/i);
  });

  it("returns documentPath and content on every chunk", async () => {
    const chunks = await retrieve("trade validation", { topK: 5 });
    for (const c of chunks) {
      expect(typeof c.documentPath).toBe("string");
      expect(c.documentPath.length).toBeGreaterThan(0);
      expect(typeof c.content).toBe("string");
      expect(c.content.length).toBeGreaterThan(0);
    }
  });
});
