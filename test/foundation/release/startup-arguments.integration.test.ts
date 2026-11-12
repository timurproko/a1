import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readRestartCertifiedRelease,
  ReleaseStateStore,
  runBootstrap,
  type BootstrapOptions,
} from "../../../src/foundation/release/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

// Boundary: real package, release admission, manifest, and restart authority; only the terminal child is intercepted.
vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("../../../src/foundation/release/restart-certification.js", async original => {
  const actual = await original<typeof import("../../../src/foundation/release/restart-certification.js")>();
  return { ...actual, readRestartCertifiedRelease: vi.fn(actual.readRestartCertifiedRelease) };
});
vi.mock("../../../src/foundation/release/release-store.js", async original => {
  const actual = await original<typeof import("../../../src/foundation/release/release-store.js")>();
  return { ...actual, readCertifiedReleaseManifest: vi.fn(actual.readCertifiedReleaseManifest) };
});

const roots: string[] = [];
beforeEach(() => {
  vi.clearAllMocks();
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
  });
});

function childArguments(): string[] {
  return vi.mocked(spawn).mock.calls.at(-1)![1]!.slice(1);
}

async function packageFixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-bootstrap-startup-"));
  roots.push(root);
  const packageRoot = resolve(root, "package");
  const dataDir = resolve(root, "data");
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  await mkdir(resolve(packageRoot, "dist/features/launch"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({
    name: PRODUCT_IDENTITY.packageName,
    privateLaunchContract: "neutral-launch-v1",
    version: "2.0.0",
    files: ["bin", "dist"],
  }));
  await writeFile(resolve(packageRoot, "bin/ui.js"), "process.exit(0);");
  await writeFile(resolve(packageRoot, "dist/features/launch/interactive-arguments.js"), "export {};\n");
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
