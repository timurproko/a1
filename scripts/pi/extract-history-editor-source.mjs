import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const agent = import.meta.resolve("@earendil-works/pi-coding-agent");
const terminal = createRequire(agent).resolve("@earendil-works/pi-tui");
const output = join(root, ".artifacts", "history-editor-upstream");
const units = ["components/editor", "utils", "keys", "word-navigation", "kill-ring", "undo-stack"];
const records = [];
for (const unit of units) {
  const map = JSON.parse(await readFile(join(dirname(terminal), `${unit}.js.map`), "utf8"));
  if (map.sourcesContent?.length !== 1 || typeof map.sourcesContent[0] !== "string") throw new Error(`Missing source: ${unit}`);
  const source = map.sourcesContent[0];
  const destination = join(output, `${unit}.ts`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, source);
  records.push({ unit, source: map.sources[0], sha256: createHash("sha256").update(source).digest("hex") });
}
await writeFile(join(output, "inventory.json"), JSON.stringify(records, null, 2) + "\n");
console.log(`Extracted ${records.length} reference units to .artifacts/history-editor-upstream; owned source was not overwritten.`);
