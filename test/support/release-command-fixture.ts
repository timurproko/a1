import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReleaseRuntime } from "../../scripts/release/release-workflow.mjs";
import type { NativeRegressionTrace } from "./native-regression-trace.js";

export interface FakeDraftRelease {
  id: number;
  html_url: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
}

export interface FakeReleasePull {
  number: number;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  isCrossRepository: boolean;
  mergeCommit: { oid: string } | null;
  mergedBy: { login: string; __typename: "User" | "Bot" } | null;
  autoMergeRequest: unknown;
}

/** Uses real disposable Git repositories, but no real GitHub, registry, or publication service. */
export async function releaseFixture(version = "0.1.8-dev", trace?: NativeRegressionTrace, registerCleanup?: (dispose: () => Promise<void>) => void) {
  const directory = await mkdtemp(join(tmpdir(), "release-command-"));
  const dispose = async () => {
    const remove = () => rm(directory, { recursive: true, force: true });
    if (trace) await trace.measureAsync("cleanup", remove); else await remove();
  };
  registerCleanup?.(dispose);
  const cwd = join(directory, "checkout");
  const remote = join(directory, "origin.git");
  const hooks = join(directory, "empty-hooks");
  await mkdir(cwd); await mkdir(hooks);
  const fixtureConfig = join(directory, "fixture-gitconfig");
  // Performance: tiny disposable repositories need no automatic housekeeping; apply this only through their private Git environment.
  await writeFile(fixtureConfig, "[gc]\n\tauto = 0\n[maintenance]\n\tauto = false\n[receive]\n\tautoGC = false\n");
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: fixtureConfig };
  let role = "setup";
  const withRole = <T>(next: string, operation: () => T): T => {
    const previous = role; role = next;
    try { return operation(); } finally { role = previous; }
  };
  const git = (args: readonly string[], where = cwd): string => {
    const execute = () => execFileSync("git", [
      "-c", "user.name=Release Fixture", "-c", "user.email=release@example.test",
      "-c", "commit.gpgsign=false", "-c", `core.hooksPath=${hooks}`, "-c", "core.autocrlf=false", "-C", where, ...args,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env }).trim();
    return trace ? trace.measure(`${role}-${args[0]}`, execute) : execute();
  };
  git(["init", "--bare", remote], directory);
  git(["init", "-b", "develop"]);
  git(["remote", "add", "origin", remote]);
  const manifest = { name: "@fixture/release-command", version, dependencies: { unchanged: version } };
  const lock = { name: manifest.name, version, lockfileVersion: 3, packages: {
    "": { name: manifest.name, version, dependencies: { unchanged: version } },
    "node_modules/unchanged": { version, integrity: "fixture-only" },
  } };
  const installer = { name: "@fixture/bootstrap", version, bin: { bootstrap: "bin/bootstrap.js" } };
  await mkdir(join(cwd, "packages", "a1-install"), { recursive: true });
  await writeFile(join(cwd, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(cwd, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(join(cwd, "packages", "a1-install", "package.json"), `${JSON.stringify(installer, null, 2)}\n`);
  await writeFile(join(cwd, ".gitignore"), ".worktrees/\n");
  await writeFile(join(cwd, "unrelated.txt"), "keep this\n");
  git(["add", "."]); git(["commit", "-m", "fixture initial"]); git(["push", "-u", "origin", "develop"]);
  const initialHead = git(["rev-parse", "HEAD"]);
  git(["tag", "v0.1.7", initialHead]);
  git(["push", "origin", "refs/tags/v0.1.7"]);
  role = "assertion";
  const logs: string[] = [];
  const errors: string[] = [];
  const events: string[] = [];
  const gitCalls: Array<{ args: readonly string[]; directory: string }> = [];
  const ghCalls: string[][] = [];
  const pulls: FakeReleasePull[] = [];
  const drafts: FakeDraftRelease[] = [];
  const phaseDirectories: string[] = [];
  const publications: Array<{ source: string; version: string; approval: { id: number; version: string; markdown: string; sha256: string } }> = [];
  let clock = 0;
  let releaseChanges: (base: string, source: string) => Promise<readonly { number: number; title: string; url: string }[]> = async () => [];
  let registry: (name: string, version: string) => unknown | Promise<unknown> = () => null;
  let publish: (source: string, version: string, approval: { id: number; version: string; markdown: string; sha256: string }) => unknown | Promise<unknown> = () => undefined;
  let approver: { login: string; type: "User" | "Bot"; permission: string } = { login: "release-fixture", type: "User", permission: "write" };
  let wait: () => void | Promise<void> = () => { manualMerge(); };
  let onCreate: (pull: FakeReleasePull) => void = () => {};
  let onQuery: (pull: FakeReleasePull) => void = () => {};

  function manualMerge(pull = pulls.findLast(candidate => candidate.state === "OPEN")) {
    if (!pull) throw new Error("fixture has no open PR");
    return withRole("manual", () => {
    const base = git(["rev-parse", "refs/heads/develop"], remote);
    const tree = git(["rev-parse", `${pull.headRefOid}^{tree}`], remote);
    const sha = git(["commit-tree", tree, "-p", base, "-m", `Manual fixture merge ${pull.number}`], remote);
    git(["update-ref", "refs/heads/develop", sha, base], remote);
    pull.state = "MERGED";
    pull.mergeCommit = { oid: sha };
    pull.mergedBy = { login: "release-fixture", __typename: "User" };
    events.push(`manual-merge:${pull.headRefName}`);
    return sha;
    });
  }
  const runtime = createReleaseRuntime({
    cwd,
    git: (args, where = cwd) => {
      gitCalls.push({ args: [...args], directory: where });
      if (args[0] === "worktree" && args[1] === "add") phaseDirectories.push(args[3]!);
      events.push(`git:${args[0]}`);
      return withRole("workflow", () => git(args, where));
    },
    gh: args => {
      ghCalls.push([...args]);
      if (args[0] === "repo" && args[1] === "view") return "fixture/a1";
      if (args[0] === "api") {
        if (args[1] === "user") return JSON.stringify({ login: approver.login, type: approver.type });
        if (args[1] === `repos/fixture/a1/collaborators/${approver.login}/permission`) return JSON.stringify({ permission: approver.permission });
        if (args[1] === "repos/fixture/a1/releases?per_page=100") return JSON.stringify(drafts);
        if (args.includes("POST") && args.includes("repos/fixture/a1/releases")) {
          const fields = Object.fromEntries(args.flatMap((arg, index) => (arg === "-f" || arg === "-F")
            ? [String(args[index + 1]).split(/=(.*)/su).slice(0, 2)] : []));
          const draft: FakeDraftRelease = {
            id: drafts.length + 1,
            html_url: `https://example.test/releases/${drafts.length + 1}`,
            tag_name: fields.tag_name!, target_commitish: fields.target_commitish!, name: fields.name!, body: fields.body!,
            draft: fields.draft === "true", prerelease: fields.prerelease === "true",
          };
          drafts.push(draft); events.push(`draft-create:${draft.tag_name}`);
          return JSON.stringify(draft);
        }
        throw new Error(`unexpected GitHub API operation: ${args.join(" ")}`);
      }
      if (args[0] !== "pr") throw new Error(`unexpected GitHub operation: ${args.join(" ")}`);
      if (args[1] === "list") return JSON.stringify(pulls.filter(pull => pull.headRefName === args[args.indexOf("--head") + 1]));
      if (args[1] === "create") {
        const branch = args[args.indexOf("--head") + 1]!;
        const pull: FakeReleasePull = { number: pulls.length + 1, url: `https://example.test/pull/${pulls.length + 1}`,
          state: "OPEN", headRefName: branch, headRefOid: git(["rev-parse", `refs/heads/${branch}`], remote),
          baseRefName: "develop", isCrossRepository: false, mergeCommit: null, mergedBy: null, autoMergeRequest: null };
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
    releaseChanges: (base, source) => releaseChanges(base, source),
    registry: async (name, requested) => { events.push(`registry:${requested}`); return registry(name, requested); },
    publish: async (source, requested, approval) => {
      events.push(`publish:${requested}`); publications.push({ source, version: requested, approval });
      return publish(source, requested, approval);
    },
    log: text => { logs.push(text); events.push("log"); }, error: text => { errors.push(text); },
    sleep: async ms => { events.push("wait"); clock += ms; await wait(); }, now: () => clock,
    pollMs: 1, waitMs: 3,
  });
  return {
    directory, cwd, remote, git, runtime, initialHead, manifest, lock, installer, logs, errors, events, gitCalls, ghCalls,
    pulls, drafts, publications, phaseDirectories, manualMerge,
    setReleaseChanges(fn: typeof releaseChanges) { releaseChanges = fn; },
    setRegistry(fn: typeof registry) { registry = fn; }, setPublish(fn: typeof publish) { publish = fn; },
    setApprover(value: typeof approver) { approver = value; },
    editDraft(markdown: string) { const draft = drafts.at(-1); if (!draft) throw new Error("fixture has no draft"); draft.body = markdown; },
    setWait(fn: typeof wait) { wait = fn; }, setCreate(fn: typeof onCreate) { onCreate = fn; }, setQuery(fn: typeof onQuery) { onQuery = fn; },
    addPull(branch: string, head: string): FakeReleasePull {
      const pull: FakeReleasePull = { number: pulls.length + 1, url: `https://example.test/pull/${pulls.length + 1}`,
        state: "OPEN", headRefName: branch, headRefOid: head, baseRefName: "develop", isCrossRepository: false, mergeCommit: null, mergedBy: null, autoMergeRequest: null };
      pulls.push(pull);
      return pull;
    },
    async localVersion() { return (JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as { version: string }).version; },
    remoteVersion() { return (JSON.parse(git(["show", "refs/heads/develop:package.json"], remote)) as { version: string }).version; },
    dispose,
  };
}
