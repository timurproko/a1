import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(__dirname, "../..");
const createHook = join(repositoryRoot, "scripts/governance/claude-worktree-create.mjs");
const removeHook = join(repositoryRoot, "scripts/governance/claude-worktree-remove.mjs");
const gitEnvironment = {
  ...process.env,
  GIT_AUTHOR_NAME: "a1 test",
  GIT_AUTHOR_EMAIL: "a1@example.test",
  GIT_COMMITTER_NAME: "a1 test",
  GIT_COMMITTER_EMAIL: "a1@example.test",
};

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", env: gitEnvironment, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const real = realpathSync.native(value);
    return process.platform === "win32" ? real.toLowerCase() : real;
  };
  return normalize(left) === normalize(right);
}

function runHook(script: string, input: Record<string, unknown>): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [script], { input: JSON.stringify(input), encoding: "utf8", env: gitEnvironment });
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

describe("Claude Code worktree hooks", () => {
  let sandbox: string;
  let primary: string;

  beforeAll(async () => {
    sandbox = await mkdtemp(join(tmpdir(), "a1-claude-worktree-"));
    const upstream = join(sandbox, "upstream");
    await mkdir(upstream);
    git(upstream, ["init", "--quiet", "-b", "develop"]);
    await writeFile(join(upstream, "README.md"), "upstream\n");
    git(upstream, ["add", "README.md"]);
    git(upstream, ["commit", "--quiet", "-m", "chore: seed"]);
    primary = join(sandbox, "primary");
    git(sandbox, ["clone", "--quiet", upstream, primary]);
  });

  afterAll(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  it("creates the named worktree under .worktrees detached at origin/develop and prints its path", async () => {
    const result = runHook(createHook, { name: "example-task", cwd: primary, hook_event_name: "WorktreeCreate" });
    expect(result.code).toBe(0);
    const printed = result.stdout.trim().split(/\r?\n/u).at(-1) ?? "";
    expect(samePath(printed, join(primary, ".worktrees", "example-task"))).toBe(true);
    expect(git(primary, ["worktree", "list", "--porcelain"])).toContain("detached");
    expect(git(printed, ["rev-parse", "HEAD"])).toBe(git(primary, ["rev-parse", "origin/develop"]));
  });

  it("reuses a registered worktree of the same name, also when called from inside another worktree", async () => {
    const fromPrimary = runHook(createHook, { name: "example-task", cwd: primary });
    expect(fromPrimary.code).toBe(0);
    expect(fromPrimary.stderr).toContain("reusing registered worktree");
    const fromWorktree = runHook(createHook, { name: "example-task", cwd: join(primary, ".worktrees", "example-task") });
    expect(fromWorktree.code).toBe(0);
    expect(samePath(fromWorktree.stdout.trim(), join(primary, ".worktrees", "example-task"))).toBe(true);
  });

  it("refuses names that could leave .worktrees", async () => {
    for (const name of ["../escape", "nested/path", "", ".hidden"]) {
      const result = runHook(createHook, { name, cwd: primary });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("refusing worktree name");
    }
    expect(existsSync(join(primary, ".worktrees", "escape"))).toBe(false);
  });

  it("declines removal so governance cleanup stays the only removal path", async () => {
    const target = join(primary, ".worktrees", "example-task");
    const result = runHook(removeHook, { worktree_path: target, hook_event_name: "WorktreeRemove" });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("local-worktree-cleanup.mjs");
    expect(existsSync(target)).toBe(true);
  });

  it("is wired into the project settings through the session root", async () => {
    const settings = JSON.parse(await readFile(join(repositoryRoot, ".claude/settings.json"), "utf8")) as {
      hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
    };
    expect(settings.hooks.WorktreeCreate?.[0]?.hooks[0]?.command).toContain("$CLAUDE_PROJECT_DIR\"/scripts/governance/claude-worktree-create.mjs");
    expect(settings.hooks.WorktreeRemove?.[0]?.hooks[0]?.command).toContain("$CLAUDE_PROJECT_DIR\"/scripts/governance/claude-worktree-remove.mjs");
  });
});
