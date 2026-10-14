import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CohortStateStore,
  materializeRelease,
  runBoundedReleaseCleanup,
  type MaterializedRelease,
} from "../../../src/foundation/release/index.js";
import { runBoundedHostCommand } from "../../../src/foundation/resident-tabs/bounded-host-command.js";
import { readResidentReleaseHolds } from "../../../src/foundation/resident-tabs/release-holds.js";

// Rationale: the native terminal-host lane builds these fixture binaries before it runs this file;
// other lanes have no native build, so the real-process test runs only where the binaries exist.
const executable = process.platform === "win32" ? ".exe" : "";
const host = resolve("native/terminal-host/target/debug", `terminal-host${executable}`);
const fakeTab = resolve("native/terminal-host/target/debug", `fake-tab${executable}`);
const nativeIt = existsSync(host) && existsSync(fakeTab) ? it : it.skip;

const roots: string[] = [];
const stops: (() => void)[] = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

const noTransaction = { read: async () => null };

describe("resident release retention with real processes", () => {
  nativeIt("keeps the release a live holder and child run from through cleanup until the tab stops", async () => {
    const fixture = await releaseFixture(4);
    await activateAll(fixture.store, fixture.releases);
    const [heldByTab, unheld] = fixture.releases;
    const profile = resolve(fixture.root, "profile");
    await mkdir(profile, { recursive: true });
    // Platform: Unix socket paths have a short limit, so the runtime directory lives directly under /tmp.
    const runtime = process.platform === "win32" ? resolve(fixture.root, "runtime") : await mkdtemp("/tmp/a1rt-");
    if (process.platform !== "win32") roots.push(runtime);
    await mkdir(runtime, { recursive: true });
    await chmod(runtime, 0o700);
    const endpoint = process.platform === "win32"
      ? `\\\\.\\pipe\\a1-tabs-retention-${process.pid}-${Date.now().toString(16)}`
      : resolve(runtime, "resident.sock");
    const common = ["--profile", profile, "--data-dir", fixture.dataDir, "--runtime-dir", runtime];
    const run = (arguments_: readonly string[]) => spawnSync(host, [...arguments_], {
      encoding: "utf8",
      env: { ...process.env, A1_TABS_ENDPOINT: endpoint },
      cwd: heldByTab!.releaseRoot,
      timeout: 120_000,
      windowsHide: true,
    });
    stops.push(() => { run(["tabs", "host-stop", ...common]); });

    expect(run(["server", "--detach", ...common]).status).toBe(0);
    const created = run(["internal", "tab-create", ...common, "--cwd", heldByTab!.releaseRoot, "--release-root", heldByTab!.releaseRoot, "--node-executable", fakeTab]);
    expect(created.status, created.stderr).toBe(0);
    const tabId = JSON.parse(created.stdout).tabId as string;
    const stateDir = JSON.parse(run(["tabs", "host-status", ...common]).stdout.trim().split("\n").at(-1)!).stateDir as string;
    await until(async () => {
      const registry = JSON.parse(await readFile(resolve(stateDir, "registry.json"), "utf8").catch(() => "{\"tabs\":[]}"));
      return registry.tabs.some((tab: { tabId: string; childPid?: number | null }) => tab.tabId === tabId && typeof tab.childPid === "number");
    });

    const residentHolds = (dataDir: string, releaseRoots: readonly string[]) => readResidentReleaseHolds({
      dataDir,
      releaseRoots,
      // Rationale: the fixture host is a debug build, so release artifact verification is replaced
      // by running that exact binary; the inspection itself is the production command.
      verify: async () => undefined,
      run: async (_executable, arguments_, timeoutMs) => runBoundedHostCommand(host, arguments_, { maxStdoutBytes: 1024 * 1024, timeoutMs, label: "fixture release-hold inspection" }),
    });
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, residentHolds });
    const retained = await fixture.store.read();
    expect(retained.releases[heldByTab!.releaseId]).toBeDefined();
    expect(retained.releases[unheld!.releaseId]).toBeUndefined();
    await expect(lstat(heldByTab!.releaseRoot)).resolves.toBeTruthy();

    const stopped = run(["tabs", "stop", tabId, ...common]);
    expect(stopped.status, stopped.stdout).toBe(0);
    expect(run(["tabs", "host-stop", ...common]).status).toBe(0);
    await until(async () => !existsSync(resolve(stateDir, "server.json")));
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, residentHolds });
    expect((await fixture.store.read()).releases[heldByTab!.releaseId]).toBeUndefined();
  }, 180_000);
});

async function until(condition: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  while (!await condition()) {
    if (Date.now() - started > timeoutMs) throw new Error("condition was not reached");
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
}

async function releaseFixture(count: number) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-resident-retention-"));
  roots.push(root);
  const dataDir = resolve(root, "data");
  const releases: MaterializedRelease[] = [];
  for (let index = 0; index < count; index += 1) {
    const packageRoot = resolve(root, `package-${index}`);
    await mkdir(resolve(packageRoot, "dist"), { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", privateLaunchContract: "neutral-launch-v1", version: `1.0.${index}`, files: ["dist"] }));
    await writeFile(resolve(packageRoot, "dist", "app.js"), `export default ${index};`);
    releases.push(await materializeRelease(packageRoot, dataDir));
  }
  return { root, dataDir, releases, store: new CohortStateStore(dataDir) };
}

async function activateAll(store: CohortStateStore, releases: readonly MaterializedRelease[]): Promise<void> {
  for (const release of releases) {
    await store.recordCandidate(release);
    const certification = resolve(release.releaseRoot, "..", "..", `certification-${release.releaseId}.json`);
    await writeFile(certification, JSON.stringify({ releaseId: release.releaseId }));
    await store.approve(release.releaseId, certification);
    await store.activate(release.releaseId);
  }
}
