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
  updated_at: string;
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
  const baselineVersion = "0.1.7";
  const writeVersions = async (next: string) => {
    const manifest = { name: "@fixture/release-command", version: next, dependencies: { unchanged: baselineVersion } };
    const lock = { name: manifest.name, version: next, lockfileVersion: 3, packages: {
      "": { name: manifest.name, version: next, dependencies: { unchanged: baselineVersion } },
      "node_modules/unchanged": { version: baselineVersion, integrity: "fixture-only" },
    } };
    const installer = { name: "@fixture/a1-install", version: next, bin: { bootstrap: "bin/bootstrap.js" } };
    await mkdir(join(cwd, "packages", "a1-install"), { recursive: true });
    await writeFile(join(cwd, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(join(cwd, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
    await writeFile(join(cwd, "packages", "a1-install", "package.json"), `${JSON.stringify(installer, null, 2)}\n`);
    return { manifest, lock, installer };
  };
  await writeVersions(baselineVersion);
  await writeFile(join(cwd, ".gitignore"), ".worktrees/\n");
  await writeFile(join(cwd, "unrelated.txt"), "keep this\n");
  git(["add", "."]); git(["commit", "-m", "fixture stable baseline"]);
  const baselineHead = git(["rev-parse", "HEAD"]);
  git(["tag", `v${baselineVersion}`, baselineHead]);
  git(["branch", "master", baselineHead]);
  const { manifest, lock, installer } = await writeVersions(version);
  git(["add", "package.json", "package-lock.json", "packages/a1-install/package.json"]);
  git(["commit", "-m", "open fixture development"]);
  git(["push", "-u", "origin", "develop", "master", `refs/tags/v${baselineVersion}`]);
  const initialHead = git(["rev-parse", "HEAD"]);
  role = "assertion";

  const logs: string[] = [];
  const errors: string[] = [];
  const events: string[] = [];
  const gitCalls: Array<{ args: readonly string[]; directory: string }> = [];
  const ghCalls: string[][] = [];
  const drafts: FakeDraftRelease[] = [];
  let releaseChanges: (base: string, source: string) => Promise<readonly { number: number; title: string; url: string }[]> = async () => [];
  let registry: (name: string, requested: string) => unknown | Promise<unknown> = () => null;
  let dispatchValidation: (candidate: { repository: string; source: string; version: string }) =>
    { runId: number; url: string; reused: boolean } | Promise<{ runId: number; url: string; reused: boolean }>
    = candidate => {
      events.push(`validation-dispatch:${candidate.source}:${candidate.version}`);
      return { runId: 42, url: "https://github.com/fixture/a1/actions/runs/42", reused: false };
    };

  const runtime = createReleaseRuntime({
    cwd,
    git: (args, where = cwd) => {
      gitCalls.push({ args: [...args], directory: where }); events.push(`git:${args[0]}`);
      return withRole("workflow", () => git(args, where));
    },
    gh: args => {
      ghCalls.push([...args]);
      if (args[0] === "repo" && args[1] === "view") return "fixture/a1";
      if (args[0] === "api") {
        if (args[1] === "repos/fixture/a1/releases?per_page=100") return JSON.stringify(drafts);
        if (args.includes("POST") && args.includes("repos/fixture/a1/releases")) {
          const fields = Object.fromEntries(args.flatMap((arg, index) => (arg === "-f" || arg === "-F")
            ? [String(args[index + 1]).split(/=(.*)/su).slice(0, 2)] : []));
          const draft: FakeDraftRelease = {
            id: drafts.length + 1,
            html_url: `https://github.com/fixture/a1/releases/tag/untagged-${drafts.length + 1}`,
            tag_name: fields.tag_name!, target_commitish: fields.target_commitish!, name: fields.name!, body: fields.body!,
            draft: fields.draft === "true", prerelease: fields.prerelease === "true", updated_at: "2026-09-29T00:00:00Z",
          };
          drafts.push(draft); events.push(`draft-create:${draft.tag_name}`);
          return JSON.stringify(draft);
        }
      }
      throw new Error(`unexpected GitHub operation: ${args.join(" ")}`);
    },
    releaseChanges: (base, source) => releaseChanges(base, source),
    registry: async (name, requested) => { events.push(`registry:${name}:${requested}`); return registry(name, requested); },
    dispatchValidation: async candidate => await dispatchValidation(candidate),
    log: text => { logs.push(text); events.push("log"); },
    error: text => { errors.push(text); },
  });
  return {
    directory, cwd, remote, git, runtime, initialHead, baselineHead, baselineVersion, manifest, lock, installer,
    logs, errors, events, gitCalls, ghCalls, drafts,
    setReleaseChanges(fn: typeof releaseChanges) { releaseChanges = fn; },
    setRegistry(fn: typeof registry) { registry = fn; },
    setDispatchValidation(fn: typeof dispatchValidation) { dispatchValidation = fn; },
    editDraft(markdown: string) { const draft = drafts.at(-1); if (!draft) throw new Error("fixture has no draft"); draft.body = markdown; },
    tagTarget(targetVersion = version.replace(/-dev$/u, "")) {
      git(["tag", `v${targetVersion}`, initialHead]);
      git(["push", "origin", `refs/tags/v${targetVersion}`]);
    },
    async localVersion() { return (JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as { version: string }).version; },
    dispose,
  };
}
