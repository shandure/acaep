// Patterns that signal prompt-injection or jailbreak attempts.
// Kept as a list so they can be audited and extended independently.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|context)/i,
  /you\s+are\s+now\s+(?!a\s+(?:helpful|assistant))/i, // "you are now DAN / unrestricted AI"
  /pretend\s+(you('re|\s+are)\s+)?(?!a\s+helpful)/i,  // "pretend you have no restrictions"
  /act\s+as\s+(if\s+you\s+(?:have\s+no|are\s+(?:an?\s+)?unfiltered|are\s+DAN))/i,
  /\bDAN\b/,                                             // Do Anything Now jailbreak
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|secret)/i,
  /show\s+me\s+(your\s+)?(system\s+prompt|hidden\s+instructions?)/i,
  /what\s+is\s+your\s+(system\s+prompt|full\s+instructions?)/i,
  /bypass\s+(your\s+)?(safety|filter|restriction|guideline)/i,
  /override\s+(your\s+)?(instructions?|safety|restriction)/i,
  /\bsudo\b.*\b(mode|prompt|system)\b/i,
  /\[SYSTEM\]/i,                                         // injecting a fake system turn
  /<\s*system\s*>/i,
];

export interface SanitizeResult {
  safe: boolean;
  query: string;
  injectionDetected: boolean;
  reason?: string;
}

const MAX_QUERY_LENGTH = 2000;

export function sanitizeInput(raw: string): SanitizeResult {
  const query = raw.trim().slice(0, MAX_QUERY_LENGTH);

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        safe: false,
        query,
        injectionDetected: true,
        reason: `Potential prompt injection detected (matched: ${pattern.source})`,
      };
    }
  }

  return { safe: true, query, injectionDetected: false };
}

// Validate that a file path cannot escape the knowledge-base root.
// The real guard is the DB lookup in readFile tool, but this is a
// second layer for defence in depth.
export function validatePath(path: string): boolean {
  const normalised = path.replace(/\\/g, "/");
  return (
    !normalised.includes("../") &&
    !normalised.includes("./") &&
    !normalised.startsWith("/") &&
    !normalised.includes("%2e") && // URL-encoded dot
    normalised.length <= 256
  );
}
