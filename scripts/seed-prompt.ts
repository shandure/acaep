import "./_load-env";
import { prisma } from "../lib/db";
import { SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2 } from "../lib/ai/prompt-builder";

const PROMPTS = [
  { name: "system-v1", version: 1, systemText: SYSTEM_PROMPT_V1 },
  { name: "system-v2", version: 2, systemText: SYSTEM_PROMPT_V2 },
];

async function main() {
  for (const p of PROMPTS) {
    const existing = await prisma.prompt.findFirst({ where: { name: p.name } });
    if (existing) {
      console.log(`Prompt "${p.name}" already exists (id: ${existing.id}). Skipping.`);
      continue;
    }
    const created = await prisma.prompt.create({
      data: {
        name: p.name,
        version: p.version,
        systemText: p.systemText,
        userTemplate: "Question: {{query}}\n\n{{chunks}}",
        isActive: false,
      },
    });
    console.log(`Created prompt "${p.name}" with id: ${created.id}`);
  }

  // Mark v1 as the active prompt (safe default)
  await prisma.prompt.updateMany({ where: {}, data: { isActive: false } });
  const v1 = await prisma.prompt.findFirst({ where: { name: "system-v1" } });
  if (v1) {
    await prisma.prompt.update({ where: { id: v1.id }, data: { isActive: true } });
    console.log(`Marked "system-v1" as active.`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
