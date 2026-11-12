import { EventEmitter } from "node:events";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  materializeRelease,
  readCertifiedReleaseManifest,
  readMaterializedRelease,
  readRestartCertifiedRelease,
  RELEASE_MANIFEST_FILENAME,
  repairMaterializedRelease,
  ReleaseStateStore,
  runBootstrap,
  type BootstrapOptions,
  type RestartValidationEvent,
} from "../../../src/foundation/release/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

// Rationale: real package, release admission, manifest, and restart authority; only the terminal child is intercepted.
vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("../../../src/foundation/release/restart-certification.js", async original => {
  const actual = await original<typeof import("../../../src/foundation/release/restart-certification.js")>();
  return { ...actual, readRestartCertifiedRelease: vi.fn(actual.readRestartCertifiedRelease) };
});
vi.mock("../../../src/foundation/release/release-store.js", async original => {
  const actual = await original<typeof import("../../../src/foundation/release/release-store.js")>();
  return {
    ...actual,
    materializeRelease: vi.fn(actual.materializeRelease),
    readCertifiedReleaseManifest: vi.fn(actual.readCertifiedReleaseManifest),
    readMaterializedRelease: vi.fn(actual.readMaterializedRelease),
    repairMaterializedRelease: vi.fn(actual.repairMaterializedRelease),
  };
});

const roots: string[] = [];
beforeEach(async () => {
  vi.clearAllMocks();
  const restart = await vi.importActual<typeof import("../../../src/foundation/release/restart-certification.js")>("../../../src/foundation/release/restart-certification.js");
  const store = await vi.importActual<typeof import("../../../src/foundation/release/release-store.js")>("../../../src/foundation/release/release-store.js");
  vi.mocked(readRestartCertifiedRelease).mockReset().mockImplementation(restart.readRestartCertifiedRelease);
  vi.mocked(readCertifiedReleaseManifest).mockReset().mockImplementation(store.readCertifiedReleaseManifest);
  vi.mocked(materializeRelease).mockReset().mockImplementation(store.materializeRelease);
  vi.mocked(readMaterializedRelease).mockReset().mockImplementation(store.readMaterializedRelease);
  vi.mocked(repairMaterializedRelease).mockReset().mockImplementation(store.repairMaterializedRelease);
  vi.mocked(spawn).mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0, null));
    return child as ReturnType<typeof spawn>;
  });
});
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

const payloads = [
  { name: "empty literal boundary", intent: { promptArguments: [] }, argv: ["--"] },
  { name: "color", intent: { sessionColor: "green" }, argv: ["--session-color", "green"] },
  { name: "literal prompt", intent: { promptArguments: ["--session-color", "pink", "$(literal)"] }, argv: ["--", "--session-color", "pink", "$(literal)"] },
  { name: "color and literal prompt", intent: { sessionColor: "green", promptArguments: ["--session-color", "pink", "$(literal)"] }, argv: ["--session-color", "green", "--", "--session-color", "pink", "$(literal)"] },
] as const;

describe("bootstrap selected-release startup payload", () => {
  it.each(payloads)("preserves $name through cold and repeated compact warm launches", async ({ intent, argv }) => {
    const fixture = await packageFixture();
    const options: BootstrapOptions = { ...fixture.options, launchIntent: { kind: "interactive", profileId: "a1", ...intent } };

    expect(await runBootstrap(options)).toBe(0);
    expect(childArguments()).toEqual(argv);
    const state = await fixture.store.read();
    const active = state.releases[state.references.active!]!;
    const compact = await readRestartCertifiedRelease(active, fixture.dataDir);
    expect(compact.files.map(file => file.path)).toEqual(["bin/ui.js"]);

    for (let launch = 0; launch < 2; launch += 1) {
      expect(await runBootstrap(options)).toBe(0);
      expect(childArguments()).toEqual(argv);
      expect(vi.mocked(spawn).mock.calls.at(-1)![1]![0]).toBe(resolve(active.releaseRoot, "bin/ui.js"));
    }
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(readCertifiedReleaseManifest).toHaveBeenCalledTimes(2);
    expect(readCertifiedReleaseManifest).toHaveBeenLastCalledWith(expect.objectContaining({
      releaseId: active.releaseId, packageVersion: active.packageVersion, contentDigest: active.contentDigest, releaseRoot: active.releaseRoot,
    }), resolve(fixture.dataDir, "releases"));
    expect(materializeRelease).toHaveBeenCalledOnce();
    expect(readMaterializedRelease).not.toHaveBeenCalled();
    expect(repairMaterializedRelease).not.toHaveBeenCalled();
  });

  it.each(payloads)("rejects unsupported $name before cold or warm UI spawn", async ({ intent }) => {
    for (const warm of [false, true]) {
      const fixture = await packageFixture(false);
      if (warm) expect(await runBootstrap(fixture.options)).toBe(0);
      vi.mocked(spawn).mockClear();
      await expect(runBootstrap({ ...fixture.options, launchIntent: { kind: "interactive", profileId: "a1", ...intent } }))
        .rejects.toThrow("does not support invocation color/literal prompts");
      expect(spawn).not.toHaveBeenCalled();
      expect(await runBootstrap(fixture.options)).toBe(0);
      expect(childArguments()).toEqual([]);
    }
  });

  it.each(["missing", "malformed", "different identity"])("rejects %s full manifest evidence after compact admission before UI spawn", async damage => {
    const fixture = await packageFixture();
    expect(await runBootstrap(fixture.options)).toBe(0);
    vi.mocked(spawn).mockClear();
    const actual = await vi.importActual<typeof import("../../../src/foundation/release/restart-certification.js")>("../../../src/foundation/release/restart-certification.js");
    const other = await packageFixture(true, 1);
    const otherRelease = await materializeRelease(other.packageRoot, other.dataDir);
    const otherManifest = await readFile(resolve(otherRelease.releaseRoot, RELEASE_MANIFEST_FILENAME));
    vi.mocked(readRestartCertifiedRelease).mockImplementationOnce(async (record, dataDir) => {
      const compact = await actual.readRestartCertifiedRelease(record, dataDir);
      const path = resolve(compact.releaseRoot, RELEASE_MANIFEST_FILENAME);
      if (damage === "missing") await rm(path);
      else {
        await chmod(path, 0o600);
        await writeFile(path, damage === "malformed" ? "not JSON" : otherManifest);
        await chmod(path, 0o400);
      }
      return compact;
    });

    await expect(runBootstrap({ ...fixture.options, launchIntent: { kind: "interactive", profileId: "a1", sessionColor: "green" } })).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
    expect(readCertifiedReleaseManifest).toHaveBeenCalledOnce();
  });

  it("cannot borrow support from the installed candidate for a newer unsupported active release", async () => {
    const activeFixture = await packageFixture(false);
    expect(await runBootstrap(activeFixture.options)).toBe(0);
    const installed = await packageFixture(true, 0, "1.0.0");
    vi.mocked(spawn).mockClear();
    await expect(runBootstrap({ ...activeFixture.options, packageRoot: installed.packageRoot,
      launchIntent: { kind: "interactive", profileId: "a1", sessionColor: "green" },
    })).rejects.toThrow("does not support");
    expect(spawn).not.toHaveBeenCalled();
    expect((await activeFixture.store.read()).references.active).not.toBeNull();
  });

  it("keeps no-payload compact operations independent of payload size without support-only manifest reads", async () => {
    const operationCounts: number[] = [];
    const actual = await vi.importActual<typeof import("../../../src/foundation/release/restart-certification.js")>("../../../src/foundation/release/restart-certification.js");
    for (const extraFiles of [0, 100]) {
      const fixture = await packageFixture(true, extraFiles);
      expect(await runBootstrap(fixture.options)).toBe(0);
      vi.clearAllMocks();
      const events: RestartValidationEvent[] = [];
      vi.mocked(readRestartCertifiedRelease).mockImplementation((record, dataDir) => actual.readRestartCertifiedRelease(record, dataDir, event => events.push(event)));
      for (let launch = 0; launch < 2; launch += 1) expect(await runBootstrap(fixture.options)).toBe(0);
      expect(readRestartCertifiedRelease).toHaveBeenCalledTimes(2);
      expect(readCertifiedReleaseManifest).not.toHaveBeenCalled();
      expect(materializeRelease).not.toHaveBeenCalled();
      expect(readMaterializedRelease).not.toHaveBeenCalled();
      expect(repairMaterializedRelease).not.toHaveBeenCalled();
      expect(events.every(event => event.operation === "restart-evidence-read")).toBe(true);
      expect(events.some(event => event.path.includes("extra-"))).toBe(false);
      operationCounts.push(events.length);
    }
    expect(operationCounts[0]).toBeGreaterThan(0);
    expect(operationCounts[1]).toBe(operationCounts[0]);
  });
});

function childArguments(): string[] {
  return vi.mocked(spawn).mock.calls.at(-1)![1]!.slice(1);
}

async function packageFixture(supported = true, extraFiles = 0, version = "2.0.0") {
  const root = await mkdtemp(resolve(tmpdir(), "a1-bootstrap-startup-"));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(resolve(packageRoot, "dist/features/launch"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: PRODUCT_IDENTITY.packageName,
    privateLaunchContract: "neutral-launch-v1",
    version,
    files: ["bin", "dist"],
  }));
  await writeFile(resolve(packageRoot, "bin/ui.js"), "process.exit(0);");
  if (supported) await writeFile(resolve(packageRoot, "dist/features/launch/interactive-arguments.js"), "export {};\n");
  for (let index = 0; index < extraFiles; index += 1) await writeFile(resolve(packageRoot, `dist/extra-${index}.js`), `export default ${index};\n`);
  const options: BootstrapOptions = {
    packageRoot,
    environment: {
      [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
      [PRODUCT_IDENTITY.environment.runtimeDir]: resolve(root, "runtime"),
    },
    scheduleMaintenance: async () => {},
  };
  return { root, packageRoot, dataDir, options, store: new ReleaseStateStore(dataDir) };
}
