import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  consumeSeedPrompt,
  MAX_SEED_PROMPT_BYTES,
  SEED_PROMPT_FILE,
  SEED_PROMPT_SCHEMA,
} from "../../../src/foundation/resident-tabs/seed-prompt.js";

const directories: string[] = [];
afterEach(() => { while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true }); });

function tabDataDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "a1-seed-"));
  directories.push(directory);
  return directory;
}

function seed(directory: string, body: unknown): string {
  const file = join(directory, SEED_PROMPT_FILE);
  writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
  return file;
}

describe("resident tab seed prompt", () => {
  it("reads the server's seed once and deletes it", () => {
    const directory = tabDataDir();
    const file = seed(directory, { schema: SEED_PROMPT_SCHEMA, text: "What does this\nrepository build?" });
    expect(consumeSeedPrompt(directory)).toBe("What does this\nrepository build?");
    expect(existsSync(file)).toBe(false);
    expect(consumeSeedPrompt(directory), "a seed is consumed at most once").toBeNull();
  });

  it("returns nothing for an absent directory or file", () => {
    expect(consumeSeedPrompt(join(tabDataDir(), "missing"))).toBeNull();
    expect(consumeSeedPrompt(tabDataDir())).toBeNull();
  });

  it.each([
    ["malformed JSON", "{"],
    ["another schema", { schema: "a1-tab-seed-prompt-v2", text: "hello" }],
    ["a missing text", { schema: SEED_PROMPT_SCHEMA }],
    ["a non-string text", { schema: SEED_PROMPT_SCHEMA, text: 7 }],
    ["blank text", { schema: SEED_PROMPT_SCHEMA, text: "  \n " }],
    ["oversized text", { schema: SEED_PROMPT_SCHEMA, text: "x".repeat(MAX_SEED_PROMPT_BYTES + 1) }],
    ["an oversized file", "x".repeat(MAX_SEED_PROMPT_BYTES * 7)],
  ])("rejects and deletes %s", (_name, body) => {
    const directory = tabDataDir();
    const file = seed(directory, body);
    expect(consumeSeedPrompt(directory)).toBeNull();
    expect(existsSync(file)).toBe(false);
  });

  it("accepts a prompt at the byte bound", () => {
    const directory = tabDataDir();
    seed(directory, { schema: SEED_PROMPT_SCHEMA, text: "é".repeat(MAX_SEED_PROMPT_BYTES / 2) });
    expect(consumeSeedPrompt(directory)).toHaveLength(MAX_SEED_PROMPT_BYTES / 2);
  });
});
