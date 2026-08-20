import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createPiRuntimeIntegration,
  disposePiRuntimeIntegration,
  PiResourceExtensionIntegration,
  replacePiRuntimeSession,
} from "../../../src/foundation/pi-engine-adapter/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function runtimeFixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-resource-extension-"));
  roots.push(root);
  const cwd = resolve(root, "work");
  const agentDir = resolve(root, "agent");
  const sessionDir = resolve(root, "sessions");
  await Promise.all([mkdir(cwd), mkdir(agentDir), mkdir(sessionDir)]);
  return createPiRuntimeIntegration({ cwd, agentDir, sessionDir });
}

describe("Pi resource and extension integration", () => {
  it("discovers resources, commands, metadata, renderers, and reload through public APIs", async () => {
    const runtime = await runtimeFixture();
    const calls: string[] = [];
    const integration = new PiResourceExtensionIntegration({
      session: runtime.session,
      bindUi: async () => { calls.push("bind"); },
      unbindUi: async () => { calls.push("unbind"); },
    });
    expect(await integration.discoverResources()).toEqual(expect.any(Array));
    expect(await integration.discoverCommands()).toEqual([]);
    expect(await integration.sessionMetadata()).toMatchObject({ sessionId: runtime.session.sessionId, cwd: runtime.cwd });
    expect(integration.resolveMessageRenderer("missing")).toBeUndefined();
    expect(integration.resolveToolRenderer("missing")).toBeUndefined();
    await expect(integration.reload()).resolves.toBeUndefined();

    const first = await integration.bind(runtime.session.sessionId);
    const second = await integration.bind(runtime.session.sessionId);
    await second.dispose();
    await first.dispose();
    expect(calls).toEqual(["bind", "unbind", "bind", "unbind"]);
    await integration.dispose();
    await disposePiRuntimeIntegration(runtime);
  });

  it("normalizes extension failures and rebuilds metadata after session replacement", async () => {
    const runtime = await runtimeFixture();
    const integration = new PiResourceExtensionIntegration({ session: runtime.session, bindUi: async () => {}, unbindUi: async () => {} });
    const failures: unknown[] = [];
    integration.subscribeFailures(failure => failures.push(failure));
    runtime.session.extensionRunner.emitError({ extensionPath: "fixture.ts", event: "command", error: "controlled failure" });
    expect(failures).toEqual([{ extensionPath: "fixture.ts", operation: "command", message: "controlled failure", recoverable: true }]);
    const originalId = (await integration.sessionMetadata()).sessionId;
    await integration.dispose();

    await replacePiRuntimeSession(runtime, { kind: "new" });
    const rebound = new PiResourceExtensionIntegration({ session: runtime.session, bindUi: async () => {}, unbindUi: async () => {} });
    expect((await rebound.sessionMetadata()).sessionId).not.toBe(originalId);
    await rebound.dispose();
    await disposePiRuntimeIntegration(runtime);
  });
});
