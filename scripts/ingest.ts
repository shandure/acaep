// _load-env MUST be first — sets DATABASE_URL and OPENAI_API_KEY before lib/db.ts loads
import "./_load-env";
import { ingestKnowledgeBase } from "../lib/retrieval/ingestor";

async function main() {
  console.log("Starting knowledge base ingestion...\n");
  const { documents, chunks } = await ingestKnowledgeBase();
  console.log(`\nDone: ${documents} documents → ${chunks} chunks ingested.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
