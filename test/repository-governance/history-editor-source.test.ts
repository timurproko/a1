import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- governance policy is an executable JavaScript module, not a production contract.
import { isExactPrintableHelper, PRINTABLE_HELPER_PATH } from "../../scripts/governance/history-editor-source-policy.mjs";

describe("editor-local source allowance", () => {
  it("ties every retained unit to the terminal package actually resolved by pinned Pi", async () => {
    const observed = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { createRequire } from 'node:module';
      import { readFileSync } from 'node:fs';
      import { dirname, join } from 'node:path';
      import { createHash } from 'node:crypto';
      const terminal=createRequire(import.meta.resolve('@earendil-works/pi-coding-agent')).resolve('@earendil-works/pi-tui');
      console.log(JSON.stringify(Object.fromEntries(['components/editor','keys','utils','undo-stack','kill-ring','word-navigation'].map(unit=>[
        'packages/tui/src/'+unit+'.ts',createHash('sha256').update(JSON.parse(readFileSync(join(dirname(terminal),unit+'.js.map'),'utf8')).sourcesContent[0]).digest('hex')
      ]))));
    `], { encoding: "utf8" })) as Record<string, string>;
    const ledger = JSON.parse(await readFile("config/baselines/pinned-pi-source-port-ledger.json", "utf8")) as { records: Array<{ upstreamPath: string; sha256: string }> };
    for (const [path, hash] of Object.entries(observed)) {
      expect(ledger.records.find(record => record.upstreamPath === path)?.sha256, path).toBe(hash);
    }
  });

  it("allows only the exact pinned printable helper, not a broadened input parser", async () => {
    const upstream = execFileSync(process.execPath, ["--input-type=module", "-e", "import { readPinnedKeySource } from './scripts/governance/history-editor-source-policy.mjs'; process.stdout.write(await readPinnedKeySource());"], { encoding: "utf8" });
    const owned = await readFile(PRINTABLE_HELPER_PATH, "utf8");
    expect(isExactPrintableHelper(owned, upstream)).toBe(true);
    expect(isExactPrintableHelper(owned + "\nprocess.stdin.on('data', console.log);", upstream)).toBe(false);
    expect(isExactPrintableHelper(owned.replace("parsed.codepoint < 32", "parsed.codepoint < 0"), upstream)).toBe(false);
    expect(isExactPrintableHelper(owned, upstream.replace("parsed.codepoint < 32", "parsed.codepoint < 0"))).toBe(false);
  });
});
