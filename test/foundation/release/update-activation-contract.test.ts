import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { certifyMaterializedRelease, ensureSupervisor } from "../../../src/foundation/release/bootstrap.js";
import { materializeRelease, type MaterializedRelease } from "../../../src/foundation/release/release-store.js";
import {
  UPDATE_ACTIVATION_CONTRACT,
  UPDATE_ACTIVATION_MANIFEST_FIELD,
  readActivationContracts,
  runActivationEntry,
  type UpdateActivationEvent,
} from "../../../src/foundation/release/update-activation.js";
import { createUpdateLifecycleCoordinator } from "../../../src/foundation/release/update.js";
import { warmMaterializedRelease } from "../../../src/foundation/release/warmup.js";

// Invariant: the in-process path is substituted so a delegated activation can prove it ran
// none of it, while the entry body runs against the same substitutes as the activation test.
vi.mock("../../../src/foundation/release/bootstrap.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/bootstrap.js")>(),
  certifyMaterializedRelease: vi.fn(async () => "certification.json"),
  ensureSupervisor: vi.fn(),
}));
vi.mock("../../../src/foundation/release/release-store.js", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/foundation/release/release-store.js")>(),
  materializeRelease: vi.fn(),
}));
vi.mock("../../../src/foundation/release/warmup.js", () => ({ warmMaterializedRelease: vi.fn() }));

const roots: string[] = [];
afterEach(async () => {
  vi.resetAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

/** A tree that serves the contract and nothing the in-process path would look for. */
async function installedTree(root: string, options: { contracts?: readonly unknown[] | "absent"; entry: string }): Promise<string> {
  const packageRoot = resolve(root, "global", "@timurproko", "a1");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  const manifest: Record<string, unknown> = { name: "@timurproko/a1", version: "1.1.0" };
  if (options.contracts !== "absent") manifest[UPDATE_ACTIVATION_MANIFEST_FIELD] = options.contracts ?? [UPDATE_ACTIVATION_CONTRACT];
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify(manifest));
  await writeFile(resolve(packageRoot, "bin", "activate.js"), options.entry);
  return packageRoot;
}

const emitting = (events: readonly UpdateActivationEvent[], exitCode = 0, stderr = "") => `
const events = ${JSON.stringify(events)};
for (const event of events) process.stdout.write(JSON.stringify(event) + "\\n");
if (${JSON.stringify(stderr)}) process.stderr.write(${JSON.stringify(stderr)});
process.exitCode = ${exitCode};
`;

describe("activation handed to the installed release", () => {
  it("drives the tree's own entry and relays every phase without touching the tree's layout", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-contract-"));
    roots.push(root);
    const packageRoot = await installedTree(root, { entry: `
const args = process.argv.slice(2);
const dataDir = args[args.indexOf("--data-dir") + 1];
const target = args[args.indexOf("--target-version") + 1];
if (target !== "1.1.0") throw new Error("wrong target " + target);
require("node:fs").writeFileSync(require("node:path").join(dataDir, "seen-by-entry"), "yes");
${emitting([
  { event: "materializing", completed: 0, total: 2 },
  { event: "materializing", completed: 1, total: 2 },
  { event: "phase", phase: "materialized" },
  { event: "phase", phase: "certified" },
  { event: "warmup", state: "started" },
  { event: "warmup", state: "completed" },
  { event: "phase", phase: "active-reference-committed" },
  { event: "completed" },
])}` });
    const dataDir = resolve(root, "data");
    await mkdir(dataDir, { recursive: true });
    const seen: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator({ [PRODUCT_IDENTITY.environment.dataDir]: dataDir });

    await coordinator.activateInstalled(packageRoot, "1.1.0", async phase => { seen.push(phase); }, progress => { seen.push(`copy:${progress.completed}/${progress.total}`); }, state => { seen.push(`warmup:${state}`); });

    expect(seen).toEqual(["copy:0/2", "copy:1/2", "materialized", "certified", "warmup:started", "warmup:completed", "active-reference-committed"]);
    expect(materializeRelease).not.toHaveBeenCalled();
    expect(certifyMaterializedRelease).not.toHaveBeenCalled();
    expect(warmMaterializedRelease).not.toHaveBeenCalled();
    expect(ensureSupervisor).not.toHaveBeenCalled();
    await expect(import("node:fs/promises").then(fs => fs.readFile(resolve(dataDir, "seen-by-entry"), "utf8"))).resolves.toBe("yes");
  });

  it("fails with the entry's own reason when the tree reports a failure", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-contract-"));
    roots.push(root);
    const packageRoot = await installedTree(root, { entry: emitting([
      { event: "phase", phase: "materialized" },
      { event: "failed", message: "immutable startup warmup exited with status 1: graph incomplete" },
    ], 1) });
    const seen: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator({ [PRODUCT_IDENTITY.environment.dataDir]: resolve(root, "data") });

    await expect(coordinator.activateInstalled(packageRoot, "1.1.0", async phase => { seen.push(phase); })).rejects.toThrow("immutable startup warmup exited with status 1: graph incomplete");
    expect(seen).toEqual(["materialized"]);
  });

  it("fails with the exit status and bounded stderr when the tree dies without a verdict", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-contract-"));
    roots.push(root);
    const packageRoot = await installedTree(root, { entry: emitting([{ event: "phase", phase: "materialized" }], 7, "Error: Cannot find module 'x'\n    at stack\n") });
    const coordinator = createUpdateLifecycleCoordinator({ [PRODUCT_IDENTITY.environment.dataDir]: resolve(root, "data") });

    await expect(coordinator.activateInstalled(packageRoot, "1.1.0", async () => {})).rejects.toThrow("installed release activation exited with status 7: Error: Cannot find module 'x' | at stack");
  });

  it("does not trust a tree that exits successfully without completing", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-contract-"));
    roots.push(root);
    const packageRoot = await installedTree(root, { entry: emitting([{ event: "phase", phase: "materialized" }], 0) });
    const coordinator = createUpdateLifecycleCoordinator({ [PRODUCT_IDENTITY.environment.dataDir]: resolve(root, "data") });

    await expect(coordinator.activateInstalled(packageRoot, "1.1.0", async () => {})).rejects.toThrow("installed release activation exited with status 0");
  });

  it.each([
    ["no manifest field", "absent" as const],
    ["a contract this updater does not serve", ["activate-v9"]],
    ["a malformed field", "activate-v1"],
  ])("activates a tree with %s in-process, with the layout that tree had", async (_label, contracts) => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-contract-"));
    roots.push(root);
    const packageRoot = await installedTree(root, { contracts: contracts as readonly unknown[] | "absent", entry: "throw new Error('entry must not run')" });
    const target = release(root, "1.1.0", packageRoot);
    vi.mocked(materializeRelease).mockResolvedValue(target);
    vi.mocked(certifyMaterializedRelease).mockResolvedValue("target-certification.json");
    const seen: string[] = [];
    const coordinator = createUpdateLifecycleCoordinator({ [PRODUCT_IDENTITY.environment.dataDir]: resolve(root, "data") });

    await coordinator.activateInstalled(packageRoot, "1.1.0", async phase => { seen.push(phase); });

    expect(seen).toEqual(["materialized", "certified", "active-reference-committed"]);
    expect(materializeRelease).toHaveBeenCalledWith(packageRoot, resolve(root, "data"), expect.anything());
    expect(warmMaterializedRelease).toHaveBeenCalledOnce();
  });

  it("reads the contracts a tree serves and nothing else from its manifest", async () => {
    await expect(readActivationContracts("/nowhere", async () => { throw new Error("ENOENT"); })).resolves.toEqual([]);
    await expect(readActivationContracts("/nowhere", async () => "{")).resolves.toEqual([]);
    await expect(readActivationContracts("/nowhere", async () => JSON.stringify({ [UPDATE_ACTIVATION_MANIFEST_FIELD]: ["activate-v1", 2, "activate-v2"] }))).resolves.toEqual(["activate-v1", "activate-v2"]);
  });
});

describe("the installed release's activation entry", () => {
  it("activates the tree it ships in and writes one event per line", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-entry-"));
    roots.push(root);
    const packageRoot = resolve(root, "package");
    const target = release(root, "1.1.0", packageRoot);
    vi.mocked(materializeRelease).mockImplementation(async (_root, _dataDir, options) => {
      options?.onProgress?.({ phase: "copying", fileCount: 1 });
      options?.onOperation?.({ operation: "candidate-write", path: "bin/cli.js", bytes: 1 });
      return target;
    });
    vi.mocked(certifyMaterializedRelease).mockResolvedValue("target-certification.json");
    const lines: string[] = [];

    const code = await runActivationEntry(["--data-dir", resolve(root, "data"), "--target-version", "1.1.0"], pathToFileURL(resolve(packageRoot, "bin", "activate.js")).href, { write: line => lines.push(line) }, {});

    expect(code).toBe(0);
    expect(lines.map(line => JSON.parse(line))).toEqual([
      { event: "materializing", completed: 0, total: 1 },
      { event: "materializing", completed: 1, total: 1 },
      { event: "phase", phase: "materialized" },
      { event: "phase", phase: "certified" },
      { event: "warmup", state: "started" },
      { event: "warmup", state: "completed" },
      { event: "phase", phase: "active-reference-committed" },
      { event: "completed" },
    ]);
    expect(materializeRelease).toHaveBeenCalledWith(packageRoot, resolve(root, "data"), expect.anything());
  });

  it("reports a failure as its last event and an unsuccessful status", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-activation-entry-"));
    roots.push(root);
    const packageRoot = resolve(root, "package");
    vi.mocked(materializeRelease).mockResolvedValue(release(root, "1.0.9", packageRoot));
    const lines: string[] = [];

    const code = await runActivationEntry(["--data-dir", resolve(root, "data"), "--target-version", "1.1.0"], pathToFileURL(resolve(packageRoot, "bin", "activate.js")).href, { write: line => lines.push(line) }, {});

    expect(code).toBe(1);
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual({ event: "failed", message: "installed a1 version 1.0.9 does not match target 1.1.0" });
  });

  it("refuses to run without a target or with an argument it does not know", async () => {
    const lines: string[] = [];
    const entry = pathToFileURL(resolve("package", "bin", "activate.js")).href;

    await expect(runActivationEntry(["--data-dir", "data"], entry, { write: line => lines.push(line) }, {})).resolves.toBe(1);
    await expect(runActivationEntry(["--target-version", "1.1.0", "--verbose"], entry, { write: line => lines.push(line) }, {})).resolves.toBe(1);
    expect(lines.map(line => JSON.parse(line))).toEqual([
      { event: "failed", message: "activation requires --target-version" },
      { event: "failed", message: "unexpected activation argument --verbose" },
    ]);
    expect(materializeRelease).not.toHaveBeenCalled();
  });
});

function release(root: string, version: string, packageRoot: string): MaterializedRelease {
  const contentDigest = "b".repeat(64);
  const releaseId = `${version}-${contentDigest.slice(0, 20)}`;
  return {
    packageName: "@timurproko/a1", packageVersion: version, launchContract: "neutral-launch-v1", contentDigest, releaseId,
    packageRoot, releaseRoot: resolve(root, "releases", releaseId), files: [],
  };
}
