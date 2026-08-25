import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runVersionStats, type VersionStatsOptions } from "../../src/cli/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("version stats", () => {
  it("reports current, develop preview, and stable release versions from one query", async () => {
    const harness = await createHarness();
    const calls: Array<{ command: string; arguments_: readonly string[] }> = [];
    const code = await runVersionStats({ ...harness.options, runner: async (command, arguments_) => {
      calls.push({ command, arguments_ });
      return { code: 0, stdout: JSON.stringify({ latest: "1.1.4", next: "1.2.0-dev.3" }) };
    } });

    expect(code).toBe(0);
    expect(harness.stdout.join("")).toBe("Current: 1.1.0\nDevelop: 1.2.0-dev.3\nRelease: 1.1.4\n");
    expect(harness.stderr).toEqual([]);
    expect(calls).toEqual([
      { command: "npm", arguments_: ["view", "@timurproko/a1", "dist-tags", "--json"] },
    ]);
  });

  it("treats an absent optional development tag as normally unavailable", async () => {
    const harness = await createHarness();
    const code = await runVersionStats({
      ...harness.options,
      runner: async () => ({ code: 0, stdout: JSON.stringify({ latest: "1.1.4" }) }),
    });

    expect(code).toBe(0);
    expect(harness.stdout.join("")).toBe("Current: 1.1.0\nDevelop: unavailable\nRelease: 1.1.4\n");
    expect(harness.stderr).toEqual([]);
  });

  it.each([
    ["nonzero registry exit", async () => ({ code: 17, stdout: "" }), "npm exited with status 17"],
    ["process startup failure", async () => { throw new Error("registry offline"); }, "registry offline"],
  ] as const)("keeps installed output and emits one A1 diagnostic for %s", async (_name, runner, expected) => {
    const harness = await createHarness();
    const code = await runVersionStats({ ...harness.options, runner });

    expect(code).toBe(0);
    expect(harness.stdout.join("")).toBe("Current: 1.1.0\nDevelop: unavailable\nRelease: unavailable\n");
    expect(harness.stderr).toHaveLength(1);
    expect(harness.stderr[0]).toContain("A1 could not resolve npm dist-tags");
    expect(harness.stderr[0]).toContain(expected);
  });

  it.each([
    ["invalid JSON", "not-json", "Unexpected token"],
    ["non-object JSON", "[]", "non-object dist-tags"],
    ["missing latest", JSON.stringify({ next: "1.2.0-dev.1" }), "npm latest"],
    ["invalid latest", JSON.stringify({ latest: "newest" }), "npm latest"],
    ["invalid development tag", JSON.stringify({ latest: "1.1.4", next: "preview" }), "npm development channel"],
  ])("fails closed with one diagnostic for %s", async (_name, stdout, expected) => {
    const harness = await createHarness();
    const code = await runVersionStats({ ...harness.options, runner: async () => ({ code: 0, stdout }) });

    expect(code).toBe(0);
    expect(harness.stdout.join("")).toContain("Develop: unavailable\nRelease: unavailable");
    expect(harness.stderr).toHaveLength(1);
    expect(harness.stderr[0]).toContain("A1 could not resolve npm dist-tags");
    expect(harness.stderr[0]).toContain(expected);
  });

  it("keeps version execution dependency-light and outside interactive runtime owners", async () => {
    const source = await readFile(resolve("src/cli/version-stats.ts"), "utf8");
    expect(source).not.toMatch(/features\/|foundation\//);
    expect(source).not.toMatch(/runBootstrap|runOwnedUi|runTransparentForeground|CohortStateStore/);
  });
});

async function createHarness() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-version-stats-"));
  roots.push(root);
  await mkdir(root, { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ version: "1.1.0" }));
  const stdout: string[] = [];
  const stderr: string[] = [];
  const options: VersionStatsOptions = { packageRoot: root, output: { stdout: value => stdout.push(value), stderr: value => stderr.push(value) } };
  return { options, stdout, stderr };
}
