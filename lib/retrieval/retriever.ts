import { prisma } from "../db";
import { embedText } from "./embedder";

export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: string;
  documentPath: string;
  documentName: string;
  startLine: number | null;
  endLine: number | null;
  similarity: number;
}

type RawRow = {
  id: string;
  content: string;
  documentId: string;
  documentPath: string;
  documentName: string;
  startLine: number | null;
  endLine: number | null;
  similarity: number;
};

export interface RetrieveOptions {
  topK?: number;
  filterType?: "code" | "markdown" | "policy";
}

/**
 * Performs a vector similarity search against the ingested knowledge base.
 * Embeds the query, then uses pgvector's cosine distance operator (<=>)
 * to find the top-k most similar chunks.
 *
 * Returns chunks ordered by similarity descending (most relevant first).
 */
export async function retrieve(
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { topK = 8, filterType } = options;

  const embedding = await embedText(query);
  const vectorStr = `[${embedding.join(",")}]`;

  // Two query variants to keep template literal syntax clean.
  // Cosine similarity = 1 - cosine_distance; cast to float8 to avoid bigint coercion.
  let rows: RawRow[];

  if (filterType) {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        c.id,
        c.content,
        c."documentId",
        d.path  AS "documentPath",
        d.name  AS "documentName",
        c."startLine",
        c."endLine",
        (1 - (c.embedding <=> ${vectorStr}::vector))::float8 AS similarity
      FROM "Chunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c.embedding IS NOT NULL
        AND d.type = ${filterType}
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT ${topK}
    `;
  } else {
    rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        c.id,
        c.content,
        c."documentId",
        d.path  AS "documentPath",
        d.name  AS "documentName",
        c."startLine",
        c."endLine",
        (1 - (c.embedding <=> ${vectorStr}::vector))::float8 AS similarity
      FROM "Chunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT ${topK}
    `;
  }

  return rows;
}
