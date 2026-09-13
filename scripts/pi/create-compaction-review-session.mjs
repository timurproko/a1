#!/usr/bin/env node
/** Create a disposable, synthetic Pi session for reviewing prompt-style compaction without a model call. */
import { resolve } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";

const directory = resolve(process.argv[2] ?? ".artifacts/compaction-review");
const manager = SessionManager.create(process.cwd(), directory);
let timestamp = Date.now();
const user = text => manager.appendMessage({ role: "user", content: text, timestamp: timestamp++ });
const assistant = text => manager.appendMessage({
  role: "assistant", content: [{ type: "text", text }], api: "openai-responses", provider: "openai", model: "gpt-5",
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  stopReason: "stop", timestamp: timestamp++,
});

manager.appendSessionInfo("Prompt-style compaction visual review (synthetic)");
user("Synthetic earlier conversation to compact.");
assistant("Synthetic earlier answer.");
const kept = user("First ordinary prompt after the compaction checkpoint.");
const summary = [
  "## Visual review",
  "This is synthetic review content, not a private conversation. The Compacted from 281,483 tokens header above must not be bold.",
  "Scroll inside this summary to pin its header and original timestamp. Click the pinned row to return here. Ctrl+O must not hide this content.",
  "Use Shift+Up and Shift+Down to navigate this compaction and the ordinary prompts. Alt+Home also navigates backward.",
  "Summary **bold emphasis** and `inline code` should keep their own styling.",
  "[Web link](https://example.com/compaction-review) and [file link](file:///D:/example/compaction-review.md) keep normal web/file colors. The file target is illustrative; do not expect it to exist.",
  ...Array.from({ length: 24 }, (_, index) => `### Summary section ${index + 1}\n\nSynthetic retained detail ${index + 1}. Select and copy this text, resize the terminal, and verify that normal prompt spacing and background continue through the full summary.`),
  "END OF FULL COMPACTION SUMMARY",
].join("\n\n");
manager.appendCompaction(summary, kept, 281483);
assistant(Array.from({ length: 32 }, (_, index) => `Post-compaction response row ${index + 1}: scroll back to review the summary.`).join("\n\n"));
user("Last ordinary prompt: use Shift+Up to return to the earlier prompt and compaction.");
assistant(Array.from({ length: 32 }, (_, index) => `Final response row ${index + 1}: this gives the pinned header room to become quiet.`).join("\n\n"));

const path = manager.getSessionFile();
if (!path) throw new Error("Pi did not create the disposable review session");
console.log(path);
