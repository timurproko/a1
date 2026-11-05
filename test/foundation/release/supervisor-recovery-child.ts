import { randomUUID } from "node:crypto";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { withEndpointLock } from "../../../src/foundation/release/endpoint-lock.js";
import { fixturePaths, fixtureRelease } from "./supervisor-recovery-fixture.js";

// Test-only child. Every path and process belongs to the caller's isolated fixture.
const [mode, root, endpoint] = process.argv.slice(2);
if (!root || !endpoint) throw new Error("fixture requires its isolated root and endpoint");
const paths = fixturePaths(root, endpoint);
process.on("message", () => {});
if (mode === "gate") {
  await withEndpointLock(paths.endpointMetadataPath, async () => {
    process.send?.({ ready: true });
    await new Promise(() => {});
  });
} else {
  const boot = randomUUID();
  const server = new SupervisorServer(new ControlStore(paths.databasePath, boot), paths, fixtureRelease(), boot);
  await server.listen();
  process.send?.({ ready: true });
}
