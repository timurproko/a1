import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRevisionDependencyReader, isDependencyPath } from "../../scripts/release/revision-dependencies.mjs";
import { compareIntegrationDependencies, type IntegrationDependencyPolicy } from "../../scripts/release/integration-dependency-graph.mjs";

const exec = promisify(execFile);
let repository: string;
let base: string, head: string;
async function git(...args: string[]) {
  return (await exec("git", args, { cwd: repository, encoding: "utf8" })).stdout.trim();
}
async function put(path: string, source: string) {
  await mkdir(dirname(join(repository, path)), { recursive: true });
  await writeFile(join(repository, path), source);
}

beforeAll(async () => {
  repository = await mkdtemp(join(tmpdir(), "a1-dependency-reader-"));
  await git("init", "--quiet");
  await git("config", "user.name", "Dependency Fixture");
  await git("config", "user.email", "dependency@example.test");
  await git("config", "core.autocrlf", "false");
  await put("package.json", "{}\n");
  await put("package-lock.json", "{}\n");
  await put("src/root.ts", "export * from './old.js';\n");
  await put("src/old.ts", "export const value = 'λ';\n");
  await put("src/same.ts", "export const value = 'λ';\n");
  await git("add", "-A");
  await git("commit", "--quiet", "-m", "base");
  base = await git("rev-parse", "HEAD");
  await git("mv", "src/old.ts", "src/new name.ts");
  await put("src/root.ts", "export * from './new name.js';\n");
  await git("add", "-A");
  await git("commit", "--quiet", "-m", "head");
  head = await git("rev-parse", "HEAD");
  await put("src/root.ts", "throw new Error('dirty worktree must never be read');\n");
  await put("src/untracked.ts", "export {};\n");
});
afterAll(async () => { if (repository) await rm(repository, { recursive: true, force: true }); });

describe("immutable revision dependency snapshots", () => {
  it("uses two batches per revision, deduplicates blobs, and ignores dirty worktree bytes", async () => {
    const reader = createRevisionDependencyReader(repository);
    const [old, current, duplicate] = await Promise.all([reader.read(base), reader.read(head), reader.read(base)]);
    expect(duplicate).toBe(old);
    expect(reader.stats).toMatchObject({ gitCommands: 4, revisions: 2, blobs: 6 });
    expect(old.files.get("src/old.ts")?.source).toContain("λ");
    expect(current.files.get("src/root.ts")?.source).toContain("new name.js");
    expect(current.files.has("src/old.ts")).toBe(false);
    expect(current.files.has("src/untracked.ts")).toBe(false);
    expect(current.files.get("src/root.ts")?.source).not.toContain("dirty worktree");
    const rules: IntegrationDependencyPolicy = { schema: "a1-integration-dependencies-v1", emittedRoot: "dist", sourceRoot: "src", invalidators: [], unrelated: [], reviewed: [], generated: [] };
    const result = compareIntegrationDependencies({ base: old, head: current, owners: [{ id: "runtime", entries: ["src/root.ts"] }],
      changes: [{ status: "R", oldPath: "src/old.ts", path: "src/new name.ts" }], basePolicy: rules });
    expect(result.owners[0]!.selected).toBe(true);
    expect(result.owners[0]!.issues).toEqual([]);
    expect(result.owners[0]!.matches.map(match => match.path)).toEqual(["src/new name.ts", "src/old.ts"]);
  });

  it("fails rather than substituting worktree content for unavailable history", async () => {
    const reader = createRevisionDependencyReader(repository);
    await expect(reader.read("HEAD")).rejects.toThrow("dependency-revision-identity");
    await expect(reader.read("f".repeat(40))).rejects.toThrow("dependency-git-failed");
    await expect(reader.read("f".repeat(40))).rejects.toThrow("dependency-git-failed");
    expect(reader.stats.gitCommands).toBe(1);
  });

  it.each([
    { limits: { files: 1 }, expected: "dependency-file-limit" },
    { limits: { fileBytes: 1 }, expected: "dependency-source-size-limit" },
    { limits: { bytes: 1 }, expected: "dependency-source-total-limit" },
  ])("bounds snapshot input: $expected", async ({ limits, expected }) => {
    const reader = createRevisionDependencyReader(repository, { limits });
    await expect(reader.read(base)).rejects.toThrow(expected);
    expect(reader.stats.gitCommands).toBe(1);
  });

  it("bounds comparison cache size and prevents callers from increasing safety limits", async () => {
    const reader = createRevisionDependencyReader(repository);
    await Promise.all([reader.read(base), reader.read(head)]);
    await expect(reader.read("f".repeat(40))).rejects.toThrow("dependency-revision-limit");
    expect(() => createRevisionDependencyReader(repository, { limits: { bytes: Number.MAX_SAFE_INTEGER } })).toThrow("invalid revision dependency limit");
    expect(() => createRevisionDependencyReader(repository, { limits: { timeoutMs: 0 } })).toThrow("invalid revision dependency limit");
  });

  it.each(["../file.ts", "src/../file.ts", "C:/file.ts", "/file.ts", "src\\file.ts", "src//file.ts", "src/./file.ts", "src/a\nb.ts", "x".repeat(1025)])("rejects ambiguous evidence path %s", path => {
    expect(isDependencyPath(path)).toBe(false);
  });

  it("binds reviewed real worker edges to committed bytes without relaxing other unknowns", async () => {
    const policy = JSON.parse(await readFile("config/integration-dependencies.json", "utf8")) as IntegrationDependencyPolicy;
    for (const rule of policy.reviewed) {
      const { stdout } = await exec("git", ["show", `HEAD:${rule.path}`], { cwd: process.cwd(), encoding: "buffer", maxBuffer: 1024 * 1024 });
      expect(createHash("sha256").update(stdout).digest("hex"), rule.path).toBe(rule.sha256);
      for (const edge of rule.edges) await expect(readFile(edge), edge).resolves.toBeDefined();
      expect(rule.handles).toEqual(["computed-import", "worker"]);
    }
    expect(policy.invalidators).toEqual(expect.arrayContaining(["native/", "package-lock.json", "config/validation-suites.json", ".github/workflows/", "scripts/release/"]));
    expect(policy.generated).toContainEqual(expect.objectContaining({ output: "dist/native/", inputs: expect.arrayContaining(["native/process-guardian/"]) }));
  });
});
