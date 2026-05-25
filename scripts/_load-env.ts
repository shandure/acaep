// This module MUST be the first import in every CLI script.
// In CJS (tsx) mode, imports are executed in order — so placing this first
// ensures DATABASE_URL and OPENAI_API_KEY are set before lib/db.ts is loaded.
import { config } from "dotenv";
config({ path: ".env.local" });
