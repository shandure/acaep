import dotenv from "dotenv";
import path from "path";

// Load .env.local before any test file imports lib/db.ts (which creates the pg Pool)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
