import { readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export const SEED_PROMPT_FILE = "seed-prompt.json";
export const SEED_PROMPT_SCHEMA = "a1-tab-seed-prompt-v1";
export const MAX_SEED_PROMPT_BYTES = 64 * 1024;
// Rationale: JSON escaping can grow each byte to a six-byte `\u` escape.
const MAX_SEED_FILE_BYTES = MAX_SEED_PROMPT_BYTES * 6 + 256;

/**
 * Takes the seeded first prompt the server wrote into this tab's private data directory. The file
 * is deleted before it is parsed, so a prompt is consumed at most once even across a crash; an
 * absent, oversized, or invalid file yields nothing.
 */
export function consumeSeedPrompt(dataDir: string): string | null {
  const file = join(dataDir, SEED_PROMPT_FILE);
  let bytes: Buffer | null = null;
  try {
    if (statSync(file).size <= MAX_SEED_FILE_BYTES) bytes = readFileSync(file);
  } catch {
    return null;
  }
  try { rmSync(file, { force: true }); } catch {
    // Compatibility: a read-only leftover is removed by the server once consumption is reported.
  }
  if (bytes === null) return null;
  let document: unknown;
  try { document = JSON.parse(bytes.toString("utf8")); } catch { return null; }
  if (typeof document !== "object" || document === null) return null;
  const { schema, text } = document as { readonly schema?: unknown; readonly text?: unknown };
  if (schema !== SEED_PROMPT_SCHEMA || typeof text !== "string") return null;
  if (text.trim().length === 0 || Buffer.byteLength(text, "utf8") > MAX_SEED_PROMPT_BYTES) return null;
  return text;
}
