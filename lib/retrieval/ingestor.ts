import fs from "fs";
import path from "path";
import { prisma } from "../db";
import { chunkFile } from "./chunker";
import { embedTexts } from "./embedder";

const KB_DIR = path.join(process.cwd(), "data", "knowledge-base");

type FileType = "code" | "markdown" | "policy";

function resolveFileType(filePath: string): FileType {
  return filePath.endsWith(".md") ? "markdown" : "code";
}

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (/\.(ts|md)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Reads every .ts and .md file from data/knowledge-base/, chunks each one,
 * embeds the chunks via OpenAI, and stores Document + Chunk records in PostgreSQL.
 *
 * Safe to re-run: existing chunks for a document are deleted before re-ingesting.
 */
export async function ingestKnowledgeBase(): Promise<{
  documents: number;
  chunks: number;
}> {
  const absPaths = collectFiles(KB_DIR);
  let totalChunks = 0;

  for (const absPath of absPaths) {
    const relPath = path.relative(KB_DIR, absPath).replace(/\\/g, "/");
    const content = fs.readFileSync(absPath, "utf-8");
    const type = resolveFileType(relPath);

    // Upsert the Document record
    const doc = await prisma.document.upsert({
      where: { path: relPath },
      create: { name: path.basename(relPath), path: relPath, type, content },
      update: { content },
    });

    // Remove stale chunks (FK: RetrievedChunk → Chunk, so delete children first)
    const existing = await prisma.chunk.findMany({
      where: { documentId: doc.id },
      select: { id: true },
    });
    if (existing.length > 0) {
      await prisma.retrievedChunk.deleteMany({
        where: { chunkId: { in: existing.map(c => c.id) } },
      });
      await prisma.chunk.deleteMany({ where: { documentId: doc.id } });
    }

    const chunkInputs = chunkFile(content, relPath, type);
    if (chunkInputs.length === 0) {
      console.log(`  – ${relPath} → no chunks`);
      continue;
    }

    const embeddings = await embedTexts(chunkInputs.map(c => c.content));

    for (let i = 0; i < chunkInputs.length; i++) {
      const chunk = await prisma.chunk.create({
        data: {
          documentId: doc.id,
          content: chunkInputs[i].content,
          startLine: chunkInputs[i].startLine,
          endLine: chunkInputs[i].endLine,
        },
      });

      // Prisma 7 can't write the Unsupported("vector") column directly,
      // so we use a raw UPDATE to store the pgvector embedding.
      const vectorStr = `[${embeddings[i].join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Chunk" SET embedding = ${vectorStr}::vector WHERE id = ${chunk.id}
      `;
    }

    totalChunks += chunkInputs.length;
    console.log(`  ✓ ${relPath} → ${chunkInputs.length} chunks`);
  }

  return { documents: absPaths.length, chunks: totalChunks };
}
