import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  assertValidationImpact,
  classifyRenderingImpact,
  collectCommitChanges,
  parseNameStatusZ,
  selectValidationImpact,
} from "../../scripts/release/validation-impact.mjs";

const execFileAsync = promisify(execFile);

async function git(repository: string, ...arguments_: string[]) {
  return (await execFileAsync("git", arguments_, { cwd: repository, encoding: "utf8" })).stdout.trim();
}

async function put(repository: string, path: string, source: string) {
  await mkdir(dirname(join(repository, path)), { recursive: true });
  await writeFile(join(repository, path), source);
}

async function commit(repository: string, message: string) {
  await git(repository, "add", "-A");
  await git(repository, "commit", "-m", message);
  return await git(repository, "rev-parse", "HEAD");
}

async function fixtureRepository() {
  const repository = await mkdtemp(join(tmpdir(), "a1-validation-impact-"));
  await git(repository, "init");
  await git(repository, "config", "user.email", "fixture@example.test");
  await git(repository, "config", "user.name", "Fixture");
  await put(repository, "test/support/rendering/rendering-producer-worker.ts", "import '../../../src/rendered.js';\n");
  await put(repository, "src/rendered.ts", "export * from './leaf.js';\n");
  await put(repository, "src/leaf.ts", "export const leaf = 1;\n");
  await put(repository, "src/unrelated.ts", "export const unrelated = 1;\n");
  const base = await commit(repository, "base");
  return { repository, base };
}

describe("development validation impact", () => {
  it("parses complete name-status records without losing rename sources or spaces", () => {
    const value = ["M", "src/a.ts", "A", "src/new file.ts", "R091", "src/old.ts", "src/new.ts", "C100", "src/a.ts", "src/copy.ts", "D", "src/gone.ts", ""].join("\0");
    expect(parseNameStatusZ(value)).toEqual([
      { status: "M", path: "src/a.ts" },
      { status: "A", path: "src/new file.ts" },
      { status: "R", score: 91, oldPath: "src/old.ts", path: "src/new.ts" },
      { status: "C", score: 100, oldPath: "src/a.ts", path: "src/copy.ts" },
      { status: "D", path: "src/gone.ts" },
    ]);
    expect(parseNameStatusZ("M\0src\\windows.ts\0")).toEqual([{ status: "M", path: "src/windows.ts" }]);
  });

  it("collects additions, copies, deletions, renames, modifications, and spaced paths from Git", async () => {
    const { repository, base } = await fixtureRepository();
    await put(repository, "src/leaf.ts", "export const leaf = 2;\n");
    await copyFile(join(repository, "src/unrelated.ts"), join(repository, "src/copied file.ts"));
    await git(repository, "mv", "src/rendered.ts", "src/renamed.ts");
    await put(repository, "scripts/new file.mjs", "export const added = true;\n");
    await git(repository, "rm", "test/support/rendering/rendering-producer-worker.ts");
    const head = await commit(repository, "all statuses");
    const changes = await collectCommitChanges(repository, base, head);
    expect(changes.map(change => change.status)).toEqual(expect.arrayContaining(["M", "C", "R", "A", "D"]));
    expect(changes).toContainEqual(expect.objectContaining({ status: "C", oldPath: "src/unrelated.ts", path: "src/copied file.ts" }));
    expect(changes).toContainEqual(expect.objectContaining({ status: "R", oldPath: "src/rendered.ts", path: "src/renamed.ts" }));
  });

  it("classifies transitive rendering dependencies and unrelated source", async () => {
    const { repository, base } = await fixtureRepository();
    await put(repository, "src/leaf.ts", "export const leaf = 2;\n");
    const head = await commit(repository, "leaf");
    const selected = await selectValidationImpact({ repository, base, head });
    expect(selected.rendering).toMatchObject({ tier: "smoke", fallbacks: [] });
    expect(selected.rendering.reasons.join(" ")).toContain("src/rendered.ts -> src/leaf.ts");

    await put(repository, "src/unrelated.ts", "export const unrelated = 2;\n");
    const unrelatedHead = await commit(repository, "unrelated");
    const unrelatedChanges = await collectCommitChanges(repository, head, unrelatedHead);
    expect(await classifyRenderingImpact(repository, head, unrelatedHead, unrelatedChanges)).toMatchObject({ tier: "none" });
  });

  it("uses base reachability for a deleted dependency and full for invalidators", async () => {
    const { repository, base } = await fixtureRepository();
    await git(repository, "rm", "src/leaf.ts");
    await put(repository, "src/rendered.ts", "export const rendered = 1;\n");
    const head = await commit(repository, "delete leaf");
    const deleted = await selectValidationImpact({ repository, base, head });
    expect(deleted.rendering.tier).toBe("smoke");
    expect(deleted.changes).toContainEqual(expect.objectContaining({ status: "D", path: "src/leaf.ts" }));

    await put(repository, "config/validation-suites.json", "{}\n");
    const fullHead = await commit(repository, "validation config");
    const changes = await collectCommitChanges(repository, head, fullHead);
    expect(await classifyRenderingImpact(repository, head, fullHead, changes)).toMatchObject({ tier: "full" });
    for (const path of ["package-lock.json", "scripts/release/validation-impact.mjs", "src/integrations/pi/components/theme.asset"]) {
      expect(await classifyRenderingImpact(repository, fullHead, fullHead, [{ status: "M", path }]), path).toMatchObject({ tier: "full" });
    }
  });

  it("fails closed when a reachable relative dependency cannot resolve", async () => {
    const { repository, base } = await fixtureRepository();
    await put(repository, "src/rendered.ts", "export * from './missing.js';\n");
    const head = await commit(repository, "break graph");
    expect(await selectValidationImpact({ repository, base, head })).toMatchObject({
      rendering: { tier: "full", fallbacks: ["dependency-resolution-incomplete"] },
    });
  });

  it("includes local modified, staged, renamed, and untracked documentation inputs", async () => {
    const { repository } = await fixtureRepository();
    await put(repository, "src/unrelated.ts", "// Rationale: changed fixture.\nexport const unrelated = 2;\n");
    await git(repository, "mv", "src/leaf.ts", "src/renamed.ts");
    await git(repository, "add", "src/renamed.ts");
    await put(repository, "scripts/new tool.mjs", "export const tool = true;\n");
    const selected = await selectValidationImpact({ repository, head: "HEAD", includeWorktree: true });
    expect(selected.documentation.paths).toEqual(expect.arrayContaining(["scripts/new tool.mjs", "src/renamed.ts", "src/unrelated.ts"]));
    expect(selected.changes).toContainEqual(expect.objectContaining({ status: "R", oldPath: "src/leaf.ts", path: "src/renamed.ts" }));
  });

  it("validates bounded selection evidence", async () => {
    const { repository, base } = await fixtureRepository();
    const value = await selectValidationImpact({ repository, base, head: base });
    expect(assertValidationImpact(value)).toBe(value);
    expect(() => assertValidationImpact({ ...value, head: "short" })).toThrow("full base and head commits");
    expect(() => assertValidationImpact({ ...value, rendering: { tier: "maybe", reasons: [], fallbacks: [], changedPaths: [] } })).toThrow("rendering tier");
    expect(() => assertValidationImpact({ ...value, documentation: { required: false, paths: ["src/a.ts"] } })).toThrow("disagrees");
  });
});
