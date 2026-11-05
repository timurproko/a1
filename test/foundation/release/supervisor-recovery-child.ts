import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { withEndpointLock } from "../../../src/foundation/release/endpoint-lock.js";
import { fixturePaths, fixtureRelease } from "./supervisor-recovery-fixture.js";

// Security: every path and process in this test-only child belongs to the caller's isolated fixture.
const [mode, root, endpoint] = process.argv.slice(2);
if (!root || !endpoint) throw new Error("fixture requires its isolated root and endpoint");
const paths = fixturePaths(root, endpoint);
process.on("message", () => {});
if (mode === "gate") {
  await withEndpointLock(paths.endpointMetadataPath, async () => {
    process.send?.({ ready: true });
    await new Promise(() => {});
  });
} else if (mode === "guardian") {
  // Rationale: use the built production guardian so its detached watcher has a real JavaScript entry.
  const { runLaunchGuardian } = await import(new URL("../../../dist/foundation/launch-guardian/main.js", import.meta.url).href);
  const { loadProcessGuardianAddon, resolveProcessGuardianPath } = await import(new URL("../../../dist/foundation/process-containment/index.js", import.meta.url).href);
  // Invariant: managed launches verify the release addon and its manifest. The inherited native
  // inspector override may point to CI's bare debug addon, which has no artifact manifest.
  const helperPath = resolveProcessGuardianPath(process.cwd(), {});
  const addon = loadProcessGuardianAddon(helperPath);
  const ready = resolve(root, `${process.pid}.root-ready`);
  const running = runLaunchGuardian({ profileId: "a1", releaseRoot: process.cwd(), uiEntry: "unused", helperPath,
    addon: { ...addon, spawnWatcher: (options: { executable: string; arguments: string[] }) => {
      const pid = addon.spawnWatcher(options);
      writeFileSync(resolve(root, `${process.pid}.watcher-ready`), String(pid));
      return pid;
    } },
    rootCommand: { executable: process.execPath, arguments: ["-e", "require('fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000)", ready] },
    environment: { ...process.env, A1_DATA_DIR: root, A1_RUNTIME_DIR: paths.runtimeDir, A1_ENDPOINT: endpoint, LAUNCH_CONTEXT_RELEASE_ID: fixtureRelease().releaseId },
  });
  const publication = (async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const pid = await readFile(ready, "utf8").catch(() => "");
      if (pid) { process.send?.({ ready: true, rootPid: Number(pid) }); return; }
      await new Promise(done => setTimeout(done, 30));
    }
    throw new Error("fixture guardian root did not start");
  })();
  await Promise.race([running, publication]);
  process.exitCode = await running;
  process.disconnect?.();
} else {
  const boot = randomUUID();
  const server = new SupervisorServer(new ControlStore(paths.databasePath, boot, { reconcileOnOpen: false }), paths, fixtureRelease(), boot);
  await server.listen();
  process.send?.({ ready: true });
}
