export interface ChunkInput {
  content: string;
  startLine: number;
  endLine: number;
}

// ~400 tokens in chars (1 token ≈ 4 chars for English/code)
const MAX_CHUNK_CHARS = 1600;
// ~50-token overlap between consecutive markdown sections
const OVERLAP_CHARS = 200;

// Matches the start of any top-level TypeScript/JavaScript declaration.
// Used to detect natural split points in code files.
const TOP_LEVEL_RE =
  /^(export\s+)?(default\s+)?(async\s+)?function\s+\w|^(export\s+)?(default\s+)?class\s+\w|^(export\s+)?const\s+\w+[\s:=]|^(export\s+)?type\s+\w+\s*=|^(export\s+)?interface\s+\w|^(export\s+)?enum\s+\w/;

/**
 * Splits a file's content into chunks suitable for embedding.
 * - Code files: split at top-level declarations (function, class, const, type, interface)
 * - Markdown/policy files: split at level-2 headings (##) with 50-token overlap
 */
export function chunkFile(
  content: string,
  filePath: string,
  fileType: "code" | "markdown" | "policy"
): ChunkInput[] {
  if (!content.trim()) return [];
  return fileType === "code"
    ? chunkCode(content, filePath)
    : chunkMarkdown(content);
}

// ── Code chunker ─────────────────────────────────────────────────────────────

function chunkCode(content: string, filePath: string): ChunkInput[] {
  const lines = content.split("\n");
  const chunks: ChunkInput[] = [];

  let blockStart = 0;
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (TOP_LEVEL_RE.test(line) && blockLines.length > 0) {
      flush(chunks, blockLines, blockStart, i - 1, filePath);
      blockStart = i;
      blockLines = [];
    }

    blockLines.push(line);
  }

  if (blockLines.length > 0) {
    flush(chunks, blockLines, blockStart, lines.length - 1, filePath);
  }

  // If nothing matched the pattern, treat the whole file as one chunk
  if (chunks.length === 0) {
    return [
      {
        content: `// ${filePath}\n${content.trim()}`,
        startLine: 0,
        endLine: lines.length - 1,
      },
    ];
  }

  return chunks.flatMap(splitIfTooLarge);
}

function flush(
  out: ChunkInput[],
  lines: string[],
  start: number,
  end: number,
  filePath: string
): void {
  const body = lines.join("\n").trim();
  if (body) {
    out.push({ content: `// ${filePath}\n${body}`, startLine: start, endLine: end });
  }
}

function splitIfTooLarge(chunk: ChunkInput): ChunkInput[] {
  if (chunk.content.length <= MAX_CHUNK_CHARS) return [chunk];

  // Split at blank lines when a chunk is too large
  const lines = chunk.content.split("\n");
  const result: ChunkInput[] = [];
  let current: string[] = [];
  let currentStart = chunk.startLine;

  for (let i = 0; i < lines.length; i++) {
    current.push(lines[i]);
    if (current.join("\n").length > MAX_CHUNK_CHARS && lines[i] === "") {
      const body = current.join("\n").trim();
      if (body) result.push({ content: body, startLine: currentStart, endLine: chunk.startLine + i });
      currentStart = chunk.startLine + i + 1;
      current = [];
    }
  }

  if (current.length > 0) {
    const body = current.join("\n").trim();
    if (body) result.push({ content: body, startLine: currentStart, endLine: chunk.endLine });
  }

  return result.length > 0 ? result : [chunk];
}

// ── Markdown chunker ──────────────────────────────────────────────────────────

function chunkMarkdown(content: string): ChunkInput[] {
  const lines = content.split("\n");
  const chunks: ChunkInput[] = [];

  let blockStart = 0;
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ") && blockLines.length > 0) {
      const body = blockLines.join("\n").trim();
      if (body) chunks.push({ content: body, startLine: blockStart, endLine: i - 1 });
      blockStart = i;
      blockLines = [];
    }

    blockLines.push(line);
  }

  if (blockLines.length > 0) {
    const body = blockLines.join("\n").trim();
    if (body) chunks.push({ content: body, startLine: blockStart, endLine: lines.length - 1 });
  }

  // Add overlap: each chunk gets the last OVERLAP_CHARS of the previous chunk prepended.
  // This prevents relevant context that straddles a section boundary from being missed.
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = chunks[i - 1].content;
    const overlap = prev.slice(-OVERLAP_CHARS).trim();
    return { ...chunk, content: `[...${overlap}]\n\n${chunk.content}` };
  });
}
