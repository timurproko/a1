import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runVersionStats, type VersionStatsOptions } from "../../src/version-stats.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("version stats", () => {
  it("reports installed, stable release, and next preview versions", async () => {
    const harness = await createHarness();
    const code = await runVersionStats({ ...harness.options, runner: async (_command, arguments_) => ({
      code: 0,
      stdout: arguments_[1]?.endsWith("@next") ? "1.2.0-dev.3\n" : "1.1.4\n",
    }) });
    expect(code).toBe(0);
    expect(harness.stdout.join("")).toBe("Installed: 1.1.0\nRelease:   1.1.4\nNext:      1.2.0-dev.3\n");
    expect(harness.stderr).toEqual([]);
  });

  it("keeps installed output and marks remote fields unavailable offline", async () => {
    const harness = await createHarness();
    const code = await runVersionStats({ ...harness.options, runner: async (_command, arguments_) => {
      if (arguments_[1]?.endsWith("@latest")) throw new Error("registry offline");
      return { code: 17, stdout: "" };
    } });
    expect(code).toBe(0);
    expect(harness.stdout.join("")).toContain("Installed: 1.1.0\nRelease:   unavailable\nNext:      unavailable");
    expect(harness.stderr.join("")).toContain("npm latest: registry offline");
    expect(harness.stderr.join("")).toContain("npm next: npm exited with status 17");
  });
});

async function createHarness() {
  const root = await mkdtemp(resolve(tmpdir(), "addone-version-stats-"));
  roots.push(root);
  await mkdir(root, { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ version: "1.1.0" }));
  const stdout: string[] = [];
  const stderr: string[] = [];
  const options: VersionStatsOptions = { packageRoot: root, output: { stdout: value => stdout.push(value), stderr: value => stderr.push(value) } };
  return { options, stdout, stderr };
}
