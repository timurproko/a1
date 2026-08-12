import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TerminalDriver } from "../../src/domain/index.js";
import type { MaterializedRelease } from "../../src/release-store.js";
import { ControlStore } from "../../src/storage/control-store.js";
import { SupervisorServer } from "../../src/supervisor/server.js";

const cleanupRoots: string[] = [];
afterEach(async () => Promise.all(cleanupRoots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("supervisor release replacement exit", () => {
  it("terminates the dedicated supervisor only after owned resources close", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "addone-supervisor-release-exit-"));
    cleanupRoots.push(root);
    const runtimeDir = resolve(root, "runtime");
    const terminate = vi.fn();
    const store = new ControlStore(resolve(root, "control.sqlite3"), "boot");
    const server = new SupervisorServer(
      store,
      {} as TerminalDriver,
      {
        configDir: resolve(root, "config"),
        dataDir: root,
        runtimeDir,
        databasePath: resolve(root, "control.sqlite3"),
        endpoint: process.platform === "win32" ? `\\\\.\\pipe\\addone-release-exit-${process.pid}-${Date.now()}` : resolve(runtimeDir, "supervisor.sock"),
        endpointMetadataPath: resolve(runtimeDir, "supervisor.json"),
        supervisorLogPath: resolve(runtimeDir, "supervisor.log"),
      },
      release(),
      "00000000-0000-4000-8000-000000000000",
      terminate,
    );

    await server.listen();
    await server.closeForReleaseReplacement(false);

    expect(terminate).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledWith(0);
  });
});

function release(): MaterializedRelease {
  const digest = "a".repeat(64);
  return {
    packageName: "@timurproko/addone",
    packageVersion: "1.1.0",
    contentDigest: digest,
    releaseId: `1.1.0-${digest.slice(0, 20)}`,
    packageRoot: "/package/1.1.0",
    releaseRoot: "/data/releases/1.1.0",
    files: [],
  };
}
