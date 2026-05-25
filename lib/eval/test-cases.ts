import { prisma } from "../db";
import type { TestCase } from "../../app/generated/prisma/client";

export type { TestCase };

export async function loadTestCases(): Promise<TestCase[]> {
  return prisma.testCase.findMany({ orderBy: { createdAt: "asc" } });
}
