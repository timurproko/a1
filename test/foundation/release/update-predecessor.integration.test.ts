import crossSpawn from "cross-spawn";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

/**
 * The published predecessors drive this gate. An update is performed by the code that is
 * already installed, so a private handoff can only be proven compatible by running the
 * previous release's own copy of it against the candidate payload. Fixtures built from
 * the candidate cannot show this: both sides would speak whatever the candidate speaks.
 */
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const PREDECESSOR_COUNT = Number.parseInt(process.env.UPDATE_PREDECESSOR_COUNT ?? "3", 10);
const roots: string[] = [];
let candidateRoot = "";
let predecessors: string[] = [];

beforeAll(async () => {
  const candidate = await loadValidationCandidate();
  candidateRoot = await install(candidate.path);
  predecessors = publishedVersions(candidate.manifest.version);
  expect(predecessors.length, "no published release is available to update from").toBeGreaterThan(0);
}, 900_000);

afterAll(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }).catch(() => {}))); }, 120_000);

describe("update from every recent published release", () => {
  it("materializes and warms the candidate with each predecessor's own release code", async () => {
    let exercised = 0;
    for (const version of predecessors) {
      if (exercised >= PREDECESSOR_COUNT) break;
      const priorRoot = await install(`@timurproko/a1@${version}`);
      const entry = resolve(priorRoot, "dist", "foundation", "release", "index.js");
      // Rationale: releases older than the immutable release store cannot drive this
      // handoff at all; they are skipped by absence of the entry, never by version
      // guesswork, and the run still has to exercise a real predecessor.
      if (!existsSync(entry)) continue;
      exercised += 1;
      const release = await import(pathToFileURL(entry).href) as {
        materializeRelease: (packageRoot: string, dataDir: string) => Promise<{ releaseId: string }>;
        warmMaterializedRelease: (release: unknown, environment: NodeJS.ProcessEnv, timeoutMs?: number) => Promise<void>;
      };
      const sandbox = await mkdtemp(resolve(tmpdir(), "a1-predecessor-"));
      roots.push(sandbox);
      const environment = {
        ...process.env,
        A1_DATA_DIR: resolve(sandbox, "data"),
        A1_RUNTIME_DIR: resolve(sandbox, "runtime"),
        A1_CONFIG_DIR: resolve(sandbox, "config"),
        A1_DATABASE_PATH: resolve(sandbox, "control.sqlite3"),
      };
      // Protocol: the predecessor copies the candidate payload and then imports the candidate's own
      // startup graph in a child process, exactly as `a1 update` does.
      const materialized = await release.materializeRelease(candidateRoot, environment.A1_DATA_DIR);
      await expect(
        release.warmMaterializedRelease(materialized, environment, 120_000),
        `published ${version} cannot activate the candidate`,
      ).resolves.toBeUndefined();
    }
    expect(exercised, "no published release carried a usable release store to update from").toBeGreaterThan(0);
  }, 1_800_000);
});

async function install(specifier: string): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-predecessor-install-"));
  roots.push(root);
  const prefix = resolve(root, "prefix");
  const installed = run(npm, ["install", "--global", "--prefix", prefix, specifier, "--ignore-scripts", "--no-audit", "--no-fund"], root);
  expect(installed.status, installed.stderr).toBe(0);
  const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
  // Compatibility: npm 12 blocks install scripts, so the shipped proxy synchronization runs directly; the
  // update command does the same before the release store copies the tree.
  run(process.execPath, [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")], packageRoot);
  return packageRoot;
}

/**
 * Every published release is a predecessor: the candidate is not published yet, and the
 * exact version string in the working tree is the one the next publication will carry.
 * Publication time orders them, because preview versions carry commit suffixes that no
 * version comparison can rank.
 */
function publishedVersions(candidateVersion: string): string[] {
  const listed = run(npm, ["view", "@timurproko/a1", "time", "--json"], process.cwd());
  expect(listed.status, listed.stderr).toBe(0);
  // Compatibility: npm reports a single field as an array of per-match results when the
  // spec selects more than one version, and as the bare field otherwise.
  const reported = JSON.parse(listed.stdout) as Record<string, string> | Record<string, string>[];
  const published: Record<string, string> = Array.isArray(reported) ? Object.assign({}, ...reported) : reported;
  return Object.entries(published)
    .filter(([version]) => version !== candidateVersion && version !== "created" && version !== "modified")
    .sort(([, left], [, right]) => Date.parse(right) - Date.parse(left))
    .map(([version]) => version);
}

function run(command: string, args: readonly string[], cwd: string) {
  // Invariant: this suite is itself started through npm, which exports the surrounding
  // installation's configuration. Left in place, `npm_config_prefix` and its siblings
  // silently redirect these installations to the developer's real global root.
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_config_")));
  const result = crossSpawn.sync(command, [...args], { cwd, encoding: "utf8", shell: false, env: environment });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
