// Smoke-test for the retriever. Usage: npm run query "your question here"
import "./_load-env";
import { retrieve } from "../lib/retrieval/retriever";

async function main() {
  const query = process.argv[2] ?? "getUserById function";
  console.log(`Query: "${query}"\n`);

  const results = await retrieve(query, { topK: 3 });

  if (results.length === 0) {
    console.log("No results — have you run npm run ingest?");
    return;
  }

  for (const r of results) {
    const location = `${r.documentPath}:${r.startLine ?? "?"}–${r.endLine ?? "?"}`;
    console.log(`[${r.similarity.toFixed(3)}] ${location}`);
    console.log(r.content.slice(0, 300).replace(/\n/g, "\n  "));
    console.log("─".repeat(60));
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
