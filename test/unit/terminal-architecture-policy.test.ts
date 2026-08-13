import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("terminal-core architecture policy", () => {
  it("enforces retired-module and application-specific terminal prohibitions", async () => {
    const policy = await readFile("scripts/check-architecture.mjs", "utf8");
    for (const diagnostic of [
      "retired PTY/emulator import",
      "retired terminal presentation import",
      "retired terminal module remains",
      "CLI identity or CLI-named configuration",
      "executable or argument inspection",
      "CLI-named environment inspection",
      "visible-content rendering branch",
      "CLI-specific input-mode fallback",
    ]) expect(policy).toContain(diagnostic);

    const result = spawnSync(process.execPath, ["scripts/check-architecture.mjs"], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("Architecture boundaries OK");
  });
});
