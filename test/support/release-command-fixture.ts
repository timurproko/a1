import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReleaseRuntime } from "../../scripts/release/release-workflow.mjs";

export interface FakeReleasePull {
  number: number;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  isCrossRepository: boolean;
  mergeCommit: { oid: string } | null;
  autoMergeRequest: unknown;
}

/** Uses real disposable Git repositories, but no real GitHub, registry, or publication service. */
export async function releaseFixture(version = "0.1.8-dev") {
  const directory = await mkdtemp(join(tmpdir(), "release-command-"));
  const cwd = join(directory, "checkout");
  const remote = join(directory, "origin.git");
  const hooks = join(directory, "empty-hooks");
  await mkdir(cwd); await mkdir(hooks);
  const emptyConfig = join(directory, "empty-gitconfig");
  await writeFile(emptyConfig, "");
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: emptyConfig };
  const git = (args: readonly string[], where = cwd): string => execFileSync("git", [
    "-c", "user.name=Release Fixture", "-c", "user.email=release@example.test",
    "-c", "commit.gpgsign=false", "-c", `core.hooksPath=${hooks}`, "-c", "core.autocrlf=false", "-C", where, ...args,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env }).trim();
  git(["init", "--bare", remote], directory);
  git(["init", "-b", "develop"]);
  git(["remote", "add", "origin", remote]);
  const manifest = { name: "@fixture/release-command", version, dependencies: { unchanged: version } };
  const lock = { name: manifest.name, version, lockfileVersion: 3, packages: {
    "": { name: manifest.name, version, dependencies: { unchanged: version } },
    "node_modules/unchanged": { version, integrity: "fixture-only" },
  } };
  await writeFile(join(cwd, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(cwd, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(join(cwd, ".gitignore"), ".worktrees/\n");
  await writeFile(join(cwd, "unrelated.txt"), "keep this\n");
  git(["add", "."]); git(["commit", "-m", "fixture initial"]); git(["push", "-u", "origin", "develop"]);
  const initialHead = git(["rev-parse", "HEAD"]);
  const logs: string[] = [];
  const errors: string[] = [];
  const events: string[] = [];
  const gitCalls: Array<{ args: readonly string[]; directory: string }> = [];
  const ghCalls: string[][] = [];
  const pulls: FakeReleasePull[] = [];
  const phaseDirectories: string[] = [];
  const publications: Array<{ source: string; version: string }> = [];
  let clock = 0;
  let registry: (name: string, version: string) => unknown | Promise<unknown> = () => null;
  let publish: (source: string, version: string) => unknown | Promise<unknown> = () => undefined;
  let wait: () => void | Promise<void> = () => { manualMerge(); };
  let onCreate: (pull: FakeReleasePull) => void = () => {};
  let onQuery: (pull: FakeReleasePull) => void = () => {};
  let associations: unknown = [{ number: 100, merged_at: "2026-01-01T00:00:00Z", base: { ref: "develop" }, merge_commit_sha: initialHead }];

  function manualMerge(pull = pulls.find(candidate => candidate.state === "OPEN")) {
    if (!pull) throw new Error("fixture has no open PR");
    const base = git(["rev-parse", "refs/heads/develop"], remote);
    const tree = git(["rev-parse", `${pull.headRefOid}^{tree}`], remote);
    const sha = git(["commit-tree", tree, "-p", base, "-m", `Manual fixture merge ${pull.number}`], remote);
    git(["update-ref", "refs/heads/develop", sha, base], remote);
    pull.state = "MERGED";
    pull.mergeCommit = { oid: sha };
    events.push(`manual-merge:${pull.headRefName}`);
    return sha;
  }
  const runtime = createReleaseRuntime({
    cwd,
    git: (args, where = cwd) => {
      gitCalls.push({ args: [...args], directory: where });
      if (args[0] === "worktree" && args[1] === "add") phaseDirectories.push(args[3]!);
      events.push(`git:${args[0]}`);
      return git(args, where);
    },
    gh: args => {
      ghCalls.push([...args]);
      if (args[0] === "api" && args[1] === `repos/{owner}/{repo}/commits/${initialHead}/pulls`) return JSON.stringify(associations);
      if (args[0] !== "pr") throw new Error(`unexpected GitHub operation: ${args.join(" ")}`);
      if (args[1] === "list") return JSON.stringify(pulls.filter(pull => pull.headRefName === args[args.indexOf("--head") + 1]));
      if (args[1] === "create") {
        const branch = args[args.indexOf("--head") + 1]!;
        const pull: FakeReleasePull = { number: pulls.length + 1, url: `https://example.test/pull/${pulls.length + 1}`,
          state: "OPEN", headRefName: branch, headRefOid: git(["rev-parse", `refs/heads/${branch}`], remote),
          baseRefName: "develop", isCrossRepository: false, mergeCommit: null, autoMergeRequest: null };
        pulls.push(pull); events.push(`pr-create:${branch}`); onCreate(pull);
        return pull.url;
      }
      if (args[1] === "view") {
        const pull = pulls.find(candidate => String(candidate.number) === args[2]);
        if (!pull) throw new Error("unknown fixture PR");
        onQuery(pull);
        return JSON.stringify(pull);
      }
      throw new Error(`forbidden GitHub operation: ${args.join(" ")}`);
    },
    registry: async (name, requested) => { events.push(`registry:${requested}`); return registry(name, requested); },
    publish: async (source, requested) => {
      events.push(`publish:${requested}`); publications.push({ source, version: requested });
      return publish(source, requested);
    },
    log: text => { logs.push(text); events.push("log"); }, error: text => { errors.push(text); },
    sleep: async ms => { events.push("wait"); clock += ms; await wait(); }, now: () => clock,
    pollMs: 1, waitMs: 3,
  });
  return {
    directory, cwd, remote, git, runtime, initialHead, manifest, lock, logs, errors, events, gitCalls, ghCalls,
    pulls, publications, phaseDirectories, manualMerge,
    setRegistry(fn: typeof registry) { registry = fn; }, setPublish(fn: typeof publish) { publish = fn; },
    setWait(fn: typeof wait) { wait = fn; }, setCreate(fn: typeof onCreate) { onCreate = fn; }, setQuery(fn: typeof onQuery) { onQuery = fn; },
    setAssociations(value: unknown) { associations = value; },
    async localVersion() { return (JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as { version: string }).version; },
    remoteVersion() { return (JSON.parse(git(["show", "refs/heads/develop:package.json"], remote)) as { version: string }).version; },
    async dispose() { await rm(directory, { recursive: true, force: true }); },
  };
}
