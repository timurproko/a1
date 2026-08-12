import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("release gate regression policy", () => {
  it("serializes deterministic and packaged PTY scenario files", async () => {
    const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const releaseRunner = await readFile(resolve(repository, "scripts/run-release-gates.mjs"), "utf8");

    expect(manifest.scripts["test:scenario"]).toContain("--no-file-parallelism");
    expect(releaseRunner).toContain("packaged-real-pi.test.ts");
    expect(releaseRunner).toContain("packaged-extension.test.ts");
    expect(releaseRunner).toContain("packaged-multi-cli.test.ts");
    expect(releaseRunner).toContain("update-transition.test.ts");
    expect(releaseRunner).toContain("--no-file-parallelism");
  });

  it("retains strict latency, transaction, and settled-status assertions", async () => {
    const packagedPi = await readFile(resolve(repository, "test/scenarios/packaged-real-pi.test.ts"), "utf8");
    const conversation = await readFile(resolve(repository, "test/scenarios/conversation-stability.test.ts"), "utf8");

    expect(packagedPi).toContain("Math.max(100, directTyped.inputLatencyMs + 60)");
    expect(packagedPi).toContain("measureKeyboardVisibility");
    expect(conversation).toContain("conversationTransactionCount).toBe(201)");
    expect(conversation).toContain("cursor/mode-only frame exposed before conversation cells");
    expect(conversation).toContain("question-${label}-settled");
    expect(conversation).toContain("STATUS ${expectedStatus}");
  });
});
