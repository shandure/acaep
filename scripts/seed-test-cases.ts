import "./_load-env";
import { prisma } from "../lib/db";
import goldenDataset from "../data/golden-dataset.json";

async function main() {
  const existing = await prisma.testCase.count();
  if (existing > 0) {
    console.log(`${existing} test cases already in DB. Skipping seed.`);
    console.log("To re-seed, delete existing test cases from the database first.");
    return;
  }

  for (const tc of goldenDataset) {
    await prisma.testCase.create({
      data: {
        query: tc.query,
        expectedAnswer: tc.expectedAnswer,
        requiredEvidence: tc.requiredEvidence,
        expectedFiles: tc.expectedFiles,
        expectedTools: tc.expectedTools,
        unacceptablePhrases: tc.unacceptablePhrases,
        scoringNotes: tc.scoringNotes,
        category: tc.category,
        difficulty: tc.difficulty,
      },
    });
  }

  console.log(`Seeded ${goldenDataset.length} test cases.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
