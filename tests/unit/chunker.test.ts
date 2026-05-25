import { describe, it, expect } from "vitest";
import { chunkFile } from "../../lib/retrieval/chunker";

// ── Code chunker ─────────────────────────────────────────────────────────────

describe("chunkFile — TypeScript code", () => {
  it("returns empty array for empty content", () => {
    expect(chunkFile("", "lib/empty.ts", "code")).toEqual([]);
  });

  it("returns empty array for whitespace-only content", () => {
    expect(chunkFile("   \n\n   ", "lib/blank.ts", "code")).toEqual([]);
  });

  it("treats a file with no top-level declarations as a single chunk", () => {
    // An if-block does not match the top-level declaration pattern
    const content = `if (process.env.DEBUG) {\n  console.log("debug mode on");\n}`;
    const chunks = chunkFile(content, "lib/simple.ts", "code");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("debug mode on");
  });

  it("includes the file path in every chunk", () => {
    const content = `export function greet() { return "hello"; }`;
    const chunks = chunkFile(content, "lib/greet.ts", "code");
    for (const chunk of chunks) {
      expect(chunk.content).toContain("lib/greet.ts");
    }
  });

  it("splits on export function declarations", () => {
    const content = [
      "export function foo() {",
      '  return "foo";',
      "}",
      "",
      "export function bar() {",
      '  return "bar";',
      "}",
    ].join("\n");

    const chunks = chunkFile(content, "lib/fns.ts", "code");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain("foo");
    expect(chunks[1].content).toContain("bar");
  });

  it("splits on async function declarations", () => {
    const content = [
      "export async function fetchUser(id: string) {",
      "  return db.users.findById(id);",
      "}",
      "",
      "export async function createUser(email: string) {",
      "  return db.users.create({ email });",
      "}",
    ].join("\n");

    const chunks = chunkFile(content, "lib/users.ts", "code");
    expect(chunks).toHaveLength(2);
  });

  it("splits on class declarations", () => {
    const content = [
      "export class TradeService {",
      "  create() {}",
      "}",
      "",
      "export class SettlementService {",
      "  process() {}",
      "}",
    ].join("\n");

    const chunks = chunkFile(content, "lib/services.ts", "code");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain("TradeService");
    expect(chunks[1].content).toContain("SettlementService");
  });

  it("records correct startLine and endLine", () => {
    const content = [
      "export function first() {",  // line 0
      "  return 1;",                 // line 1
      "}",                           // line 2
      "",                            // line 3
      "export function second() {",  // line 4
      "  return 2;",                 // line 5
      "}",                           // line 6
    ].join("\n");

    const chunks = chunkFile(content, "lib/lines.ts", "code");
    expect(chunks[0].startLine).toBe(0);
    expect(chunks[1].startLine).toBe(4);
  });
});

// ── Markdown chunker ──────────────────────────────────────────────────────────

describe("chunkFile — Markdown", () => {
  it("returns empty array for empty content", () => {
    expect(chunkFile("", "docs/empty.md", "markdown")).toEqual([]);
  });

  it("returns a single chunk when there are no ## headings", () => {
    const content = "# Title\n\nJust some content without subheadings.";
    const chunks = chunkFile(content, "docs/test.md", "markdown");
    expect(chunks).toHaveLength(1);
  });

  it("splits at ## headings", () => {
    // Content starts directly at ##; text before the first ## becomes its own chunk.
    const content = [
      "## Settlement Cycle",
      "The T+2 settlement period.",
      "",
      "## Mark to Market",
      "Revaluing at current prices.",
    ].join("\n");

    const chunks = chunkFile(content, "docs/glossary.md", "markdown");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toContain("Settlement Cycle");
    expect(chunks[1].content).toContain("Mark to Market");
  });

  it("does not split at ### headings (level 3)", () => {
    const content = [
      "## Section One",
      "### Subsection A",
      "Content A.",
      "### Subsection B",
      "Content B.",
    ].join("\n");

    const chunks = chunkFile(content, "docs/test.md", "markdown");
    expect(chunks).toHaveLength(1);
  });

  it("adds overlap from the previous section into the next chunk", () => {
    const content = [
      "## Alpha",
      "Alpha content goes here.",
      "",
      "## Beta",
      "Beta content goes here.",
    ].join("\n");

    const chunks = chunkFile(content, "docs/test.md", "markdown");
    expect(chunks).toHaveLength(2);
    // Second chunk should include tail of the first
    expect(chunks[1].content).toContain("Alpha");
  });

  it("policy fileType is chunked like markdown", () => {
    const content = "## Section\nSome policy text.";
    const chunks = chunkFile(content, "docs/policy.md", "policy");
    expect(chunks).toHaveLength(1);
  });
});
