import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve("scripts/prune-merged-branches.mjs");
const temporaryDirectories: string[] = [];

function git(cwd: string, ...arguments_: string[]): string {
  return execFileSync("git", arguments_, { cwd, encoding: "utf8" }).trim();
}

async function createRepository(): Promise<string> {
  const repository = await mkdtemp(resolve(tmpdir(), "branch-lifecycle-"));
  temporaryDirectories.push(repository);
  git(repository, "init", "--initial-branch=develop");
  git(repository, "config", "user.email", "test@example.invalid");
  git(repository, "config", "user.name", "Branch Test");
  await writeFile(resolve(repository, "base.txt"), "base\n");
  git(repository, "add", "base.txt");
  git(repository, "commit", "-m", "base");
  git(repository, "branch", "master");
  git(repository, "branch", "merged-topic");
  git(repository, "switch", "-c", "unmerged-topic");
  await writeFile(resolve(repository, "unmerged.txt"), "unmerged\n");
  git(repository, "add", "unmerged.txt");
  git(repository, "commit", "-m", "unmerged");
  git(repository, "switch", "develop");
  return repository;
}

function run(repository: string, ...arguments_: string[]) {
  return spawnSync(process.execPath, [script, ...arguments_], { cwd: repository, encoding: "utf8" });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("bounded development branch lifecycle", () => {
  it("requires detached in-repository worktrees and isolated local build outputs", async () => {
    const [readme, config, gitignore] = await Promise.all([
      readFile(resolve("README.md"), "utf8"),
      readFile(resolve("openspec/config.yaml"), "utf8"),
      readFile(resolve(".gitignore"), "utf8"),
    ]);
    expect(readme).toContain("The primary worktree stays on `develop` and is integration-only");
    expect(readme).toContain("git worktree add --detach .worktrees/<task-id> origin/develop");
    expect(readme).toContain("git push origin HEAD:refs/heads/<task-id>");
    expect(readme).toContain("gh pr create --base develop --head <task-id>");
    expect(readme).toContain("npm pack --ignore-scripts --pack-destination .builds");
    expect(config).toContain("the repository's `.worktrees/<task-id>` directory");
    expect(config).toContain("the repository's `.builds/` directory");
    expect(`${readme}\n${config}`).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(gitignore).toContain("/.worktrees/");
    expect(gitignore).toContain("/.builds/");
    expect(gitignore).not.toMatch(/^\*\.tgz$/m);
  });

  it("reports protected, merged-deletable, and unmerged branches without changing the repository", async () => {
    const repository = await createRepository();
    const before = git(repository, "branch", "--format=%(refname:short)");
    const result = run(repository, "--json");

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      mode: string;
      protected: Array<{ name: string; reasons: string[] }>;
      mergedDeletable: string[];
      unmerged: string[];
    };
    expect(report.mode).toBe("dry-run");
    expect(report.protected.map(branch => branch.name)).toEqual(["develop", "master"]);
    expect(report.mergedDeletable).toEqual(["merged-topic"]);
    expect(report.unmerged).toEqual(["unmerged-topic"]);
    expect(git(repository, "branch", "--format=%(refname:short)")).toBe(before);
  });

  it("uses safe deletion only for reviewed merged branches and refuses protected, current, and unmerged branches", async () => {
    const repository = await createRepository();
    const applied = run(repository, "--apply", "--branch", "merged-topic", "--json");
    expect(applied.status, applied.stderr).toBe(0);
    expect(JSON.parse(applied.stdout).deletedLocal).toEqual(["merged-topic"]);
    expect(git(repository, "branch", "--format=%(refname:short)").split(/\r?\n/)).toEqual(["develop", "master", "unmerged-topic"]);

    for (const branch of ["develop", "master", "unmerged-topic"]) {
      const refused = run(repository, "--apply", "--branch", branch);
      expect(refused.status, `${branch}: ${refused.stderr}`).toBe(1);
      expect(refused.stderr).toContain("refused to delete");
    }

    git(repository, "switch", "unmerged-topic");
    const current = run(repository, "--apply", "--branch", "unmerged-topic");
    expect(current.status).toBe(1);
    expect(current.stderr).toContain("protected, current, missing, or unmerged");

    const source = await readFile(script, "utf8");
    expect(source).toContain('["branch", "-d", "--", name]');
    expect(source).not.toMatch(/git\([^\n]*["']-D["']/);
  });

  it("deletes only the explicitly selected merged remote branch", async () => {
    const repository = await createRepository();
    const remote = await mkdtemp(resolve(tmpdir(), "branch-lifecycle-remote-"));
    temporaryDirectories.push(remote);
    git(remote, "init", "--bare");
    git(repository, "remote", "add", "origin", remote);
    git(repository, "push", "origin", "merged-topic");

    const applied = run(repository, "--apply", "--branch", "merged-topic", "--remote", "origin", "--json");
    expect(applied.status, applied.stderr).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({
      deletedLocal: ["merged-topic"],
      deletedRemote: "origin/merged-topic",
    });
    expect(git(repository, "ls-remote", "--heads", "origin", "refs/heads/merged-topic")).toBe("");
    expect(git(repository, "branch", "--list", "unmerged-topic")).toContain("unmerged-topic");
  });

  it("requires explicit apply and one selected source branch for remote cleanup", async () => {
    const repository = await createRepository();
    for (const arguments_ of [["--remote", "origin"], ["--apply", "--remote", "origin"]]) {
      const result = run(repository, ...arguments_);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("--remote requires --apply and exactly one --branch");
    }
  });
});
