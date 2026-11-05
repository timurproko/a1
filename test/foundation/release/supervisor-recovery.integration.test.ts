import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupervisorClient } from "../../../src/foundation/protocol/index.js";
import { ControlStore } from "../../../src/foundation/storage/index.js";
import { SupervisorServer } from "../../../src/foundation/supervision/index.js";
import { observeSupervisorProcess } from "../../../src/foundation/release/supervisor-identity.js";
import { recoverSupervisorEndpoint } from "../../../src/foundation/release/endpoint-recovery.js";
import { probeOwnership, readEndpointMetadata, removeEndpointArtifacts, sweepDeadEndpoints } from "../../../src/foundation/release/endpoints.js";
import { withEndpointLock } from "../../../src/foundation/release/endpoint-lock.js";
import { fixtureMetadata, fixturePaths, fixtureRelease } from "./supervisor-recovery-fixture.js";
import { resolveProcessGuardianPath } from "../../../src/foundation/process-containment/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const roots: string[] = [];
const children: ChildProcess[] = [];
const servers: SupervisorServer[] = [];
const sockets = new Set<Socket>();
const listeners: Server[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) await killFixture(child);
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  for (const server of servers.splice(0)) await server.close();
  for (const listener of listeners.splice(0)) await new Promise<void>(done => listener.close(() => done()));
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("automatic supervisor recovery", () => {
  it("recovers a killed busy supervisor and interrupts old rows without deleting sessions", async () => {
    const paths = await pathsFixture();
    const child = await startChild("supervisor", paths);
    const client = new SupervisorClient(fixtureRelease().releaseId);
    const instanceId = randomUUID();
    await client.connect(paths.endpoint);
    expect(await client.command({ type: "create-launch-instance", requestId: randomUUID(), instanceId, profileId: "a1", shutdownPolicy: "terminate-tree-on-close", guardianIdentity: (await observeSupervisorProcess(process.pid))! })).toMatchObject({ ok: true });
    await vi.waitFor(async () => expect((await readEndpointMetadata(paths.endpointMetadataPath))?.ownership.liveInstanceIds).toContain(instanceId));
    const session = resolve(paths.dataDir, "saved-session.jsonl");
    await writeFile(session, "preserved session\n");
    await killFixture(child);
    client.close();
    expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("dead");

    await recover(paths);
    expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("live-verified");
    const store = new ControlStore(paths.databasePath);
    expect(store.loadLaunchInstance(instanceId)).toMatchObject({ state: "interrupted" });
    store.close();
    expect(await readFile(session, "utf8")).toBe("preserved session\n");
    const fresh = new SupervisorClient(fixtureRelease().releaseId);
    await fresh.connect(paths.endpoint);
    expect(await fresh.command({ type: "create-launch-instance", requestId: randomUUID(), instanceId: randomUUID(), profileId: "pi", shutdownPolicy: "terminate-tree-on-close", guardianIdentity: (await observeSupervisorProcess(process.pid))! })).toMatchObject({ ok: true });
    fresh.close();
  });

  it.each(["guardian", "root", ...(process.platform === "win32" ? ["all"] : [])])("admits a fresh managed runtime after killing fixture %s processes", async target => {
    const paths = await pathsFixture();
    const supervisor = await startChild("supervisor", paths);
    const guardian = await startChild("guardian", paths);
    const rootPid = Number(await readFile(resolve(paths.dataDir, `${guardian.pid}.root-ready`), "utf8"));
    const rootIdentity = await observeSupervisorProcess(rootPid);
    expect(rootIdentity).not.toBeNull();
    const independent = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore", windowsHide: true });
    children.push(independent);
    await once(independent, "spawn");
    const sentinelIdentity = await observeSupervisorProcess(independent.pid!);
    const survivingGuardian = target === "all" ? null : await startChild("guardian", paths);
    const survivingRoot = survivingGuardian ? Number(await readFile(resolve(paths.dataDir, `${survivingGuardian.pid}.root-ready`), "utf8")) : null;
    if (target === "all") {
      const watcherPid = Number(await readFile(resolve(paths.dataDir, `${guardian.pid}.watcher-ready`), "utf8"));
      expect(await observeSupervisorProcess(watcherPid)).not.toBeNull();
      process.kill(watcherPid, "SIGKILL");
      // Security: kill only recorded fixture identities, never all node.exe processes on the machine.
      process.kill(rootPid, "SIGKILL");
      await Promise.all([killFixture(guardian), killFixture(supervisor)]);
    } else if (target === "guardian") await killFixture(guardian);
    else process.kill(rootPid, "SIGKILL");
    await vi.waitFor(async () => expect(await observeSupervisorProcess(rootPid)).toBeNull(), { timeout: 8_000 });
    if (survivingRoot !== null) expect(await observeSupervisorProcess(survivingRoot)).not.toBeNull();
    await recover(paths);
    const freshGuardian = await startChild("guardian", paths);
    const freshRoot = Number(await readFile(resolve(paths.dataDir, `${freshGuardian.pid}.root-ready`), "utf8"));
    expect(await observeSupervisorProcess(freshRoot)).not.toBeNull();
    expect(await observeSupervisorProcess(independent.pid!)).toEqual(sentinelIdentity);
    if (survivingRoot !== null) expect(await observeSupervisorProcess(survivingRoot)).not.toBeNull();
  }, 30_000);

  it("uses the verified release guardian when the inherited inspector addon has no manifest", async () => {
    const paths = await pathsFixture();
    await startChild("supervisor", paths);
    const bareAddon = resolve(paths.dataDir, "process-guardian.node");
    await copyFile(resolveProcessGuardianPath(process.cwd(), {}), bareAddon);
    await expect(readFile(resolve(paths.dataDir, "manifest.json"))).rejects.toMatchObject({ code: "ENOENT" });
    const guardian = await startChild("guardian", paths, {
      ...process.env, [PRODUCT_IDENTITY.environment.processGuardianPath]: bareAddon,
    });
    const rootPid = Number(await readFile(resolve(paths.dataDir, `${guardian.pid}.root-ready`), "utf8"));
    expect(await observeSupervisorProcess(rootPid)).not.toBeNull();
    await killFixture(guardian);
    await vi.waitFor(async () => expect(await observeSupervisorProcess(rootPid)).toBeNull(), { timeout: 8_000 });
  }, 30_000);

  it("does not let a losing startup or a second cohort rewrite the live winner's control rows", async () => {
    const paths = await pathsFixture();
    await recover(paths);
    const client = new SupervisorClient(fixtureRelease().releaseId);
    await client.connect(paths.endpoint);
    const instanceId = randomUUID();
    try {
      expect(await client.command({ type: "create-launch-instance", requestId: randomUUID(), instanceId, profileId: "a1", shutdownPolicy: "terminate-tree-on-close", guardianIdentity: (await observeSupervisorProcess(process.pid))! })).toMatchObject({ ok: true });
      const loser = new SupervisorServer(new ControlStore(paths.databasePath, "loser", { reconcileOnOpen: false }), paths, fixtureRelease(), "loser");
      servers.push(loser);
      await expect(loser.listen()).rejects.toMatchObject({ code: "EADDRINUSE" });
      await loser.close();
      const otherPaths = { ...paths, endpoint: fixturePaths(paths.dataDir).endpoint, endpointMetadataPath: resolve(paths.endpointsDir, "other.json") };
      if (process.platform !== "win32") roots.push(otherPaths.endpoint);
      const other = new SupervisorServer(new ControlStore(paths.databasePath, "other", { reconcileOnOpen: false }), otherPaths, fixtureRelease(), "other");
      servers.push(other);
      await other.listen();
      expect(other.snapshot().activeInstances).toEqual([]);
      const read = new ControlStore(paths.databasePath);
      expect(read.loadLaunchInstance(instanceId)).toMatchObject({ state: "requested" });
      read.close();
      expect(await client.command({ type: "complete-launch-instance", requestId: randomUUID(), instanceId, terminalState: "completed", outcome: { kind: "exited", exitCode: 0 } })).toMatchObject({ ok: true });
    } finally { client.close(); }
  });

  it("converges concurrent recoverers without unlinking the winning listener", async () => {
    const paths = await pathsFixture();
    await writeFile(paths.endpointMetadataPath, JSON.stringify(fixtureMetadata({ pid: 2_000_000_000, endpoint: paths.endpoint })));
    await Promise.all([recover(paths), recover(paths)]);
    const winner = (await readEndpointMetadata(paths.endpointMetadataPath))!;
    expect(await probeOwnership(winner)).toBe("live-verified");
    expect(await sweepDeadEndpoints(paths)).toEqual([]);
    expect(await probeOwnership(winner)).toBe("live-verified");
  });

  it("releases the OS recovery gate when its owner is killed, even with a leftover authority file", async () => {
    const paths = await pathsFixture();
    const owner = await startChild("gate", paths);
    await killFixture(owner);
    await expect(withEndpointLock(paths.endpointMetadataPath, async () => "acquired")).resolves.toBe("acquired");
    await recover(paths);
    expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("live-verified");
  });

  it("preserves a successor published after a stale snapshot and ignores a changed publication", async () => {
    const paths = await pathsFixture();
    const stale = fixtureMetadata({ pid: 2_000_000_000, endpoint: paths.endpoint });
    await writeFile(paths.endpointMetadataPath, JSON.stringify(stale));
    await recover(paths);
    const before = await readFile(paths.endpointMetadataPath, "utf8");
    expect(await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint, stale)).toBe(false);
    expect(await readFile(paths.endpointMetadataPath, "utf8")).toBe(before);
    expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("live-verified");
  });

  it("retires a stale generation while the unrelated process reusing its PID survives", async () => {
    const paths = await pathsFixture();
    const identity = (await observeSupervisorProcess(process.pid))!;
    await writeFile(paths.endpointMetadataPath, JSON.stringify(fixtureMetadata({ endpoint: paths.endpoint, nativeStartIdentity: identity.startIdentity.replace(/\d+/, token => String(BigInt(token) + 1n)) })));
    await recover(paths);
    expect(await observeSupervisorProcess(process.pid)).toEqual(identity);
    expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("live-verified");
  });

  it("retries transient silent probes and reuses the verified live owner without a replacement", async () => {
    const paths = await pathsFixture();
    const metadata = fixtureMetadata({ endpoint: paths.endpoint });
    let connections = 0;
    await listen(paths.endpoint, socket => {
      if (++connections === 1) return;
      socket.on("data", () => socket.write(JSON.stringify({ type: "identity", supervisorId: metadata.supervisorId, bootNonce: metadata.bootNonce, pidStartIdentity: metadata.pidStartIdentity, releaseId: metadata.releaseId }) + "\n"));
    });
    expect(await probeOwnership(metadata, { timeoutMs: 20 })).toBe("live-verified");
    expect(connections).toBe(2);
  });

  it("preserves a truly unresponsive live owner and reports a bounded genuine failure without starting another", async () => {
    const paths = await pathsFixture();
    const metadata = fixtureMetadata({ endpoint: paths.endpoint, nativeStartIdentity: (await observeSupervisorProcess(process.pid))!.startIdentity });
    await writeFile(paths.endpointMetadataPath, JSON.stringify(metadata));
    const startAndWait = vi.fn(async () => {});
    await expect(recoverSupervisorEndpoint({ metadataPath: paths.endpointMetadataPath, endpoint: paths.endpoint, matches: () => true, startAndWait })).rejects.toMatchObject({ code: "SUPERVISOR_RECOVERY_BLOCKED" });
    expect(startAndWait).not.toHaveBeenCalled();
    expect(await readEndpointMetadata(paths.endpointMetadataPath)).toEqual(metadata);
    const summary = JSON.parse(await readFile(`${paths.endpointMetadataPath}.recovery.json`, "utf8"));
    expect(summary).toMatchObject({ reason: "unresponsive", attempts: 1 });
    expect(JSON.stringify(summary)).not.toContain(metadata.bootNonce);
  });

  it("never turns inspection errors or mismatched handshakes into cleanup authority", async () => {
    const paths = await pathsFixture();
    const metadata = fixtureMetadata({ endpoint: paths.endpoint });
    expect(await probeOwnership(metadata, { observe: async () => { throw new Error("denied"); }, attempts: 1, timeoutMs: 10 })).toBe("unresponsive");
    await listen(paths.endpoint, socket => socket.on("data", () => socket.write(JSON.stringify({ type: "identity", supervisorId: "different", bootNonce: "different", pidStartIdentity: "different", releaseId: metadata.releaseId }) + "\n")));
    await writeFile(paths.endpointMetadataPath, JSON.stringify(metadata));
    const startAndWait = vi.fn(async () => {});
    await expect(recoverSupervisorEndpoint({ metadataPath: paths.endpointMetadataPath, endpoint: paths.endpoint, matches: () => true, startAndWait })).rejects.toMatchObject({ code: "SUPERVISOR_RECOVERY_BLOCKED" });
    expect(startAndWait).not.toHaveBeenCalled();
  });

  it("propagates replacement failure rather than falsely declaring recovery", async () => {
    const paths = await pathsFixture();
    await expect(recoverSupervisorEndpoint({ metadataPath: paths.endpointMetadataPath, endpoint: paths.endpoint, matches: () => true,
      startAndWait: async () => { throw new Error("fixture replacement exited before readiness"); },
    })).rejects.toThrow("before readiness");
    expect(await readEndpointMetadata(paths.endpointMetadataPath)).toBeNull();
  });
});

async function pathsFixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-recovery-"));
  roots.push(root);
  const paths = fixturePaths(root);
  if (process.platform !== "win32") roots.push(paths.endpoint);
  await mkdir(paths.runtimeDir, { recursive: true });
  return paths;
}

async function recover(paths: ReturnType<typeof fixturePaths>) {
  await recoverSupervisorEndpoint({ metadataPath: paths.endpointMetadataPath, endpoint: paths.endpoint, matches: metadata => metadata.releaseId === fixtureRelease().releaseId,
    startAndWait: async () => {
      const boot = randomUUID();
      const server = new SupervisorServer(new ControlStore(paths.databasePath, boot, { reconcileOnOpen: false }), paths, fixtureRelease(), boot);
      servers.push(server);
      try { await server.listen(); }
      catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EADDRINUSE")) throw error;
        await server.close();
        expect(await probeOwnership((await readEndpointMetadata(paths.endpointMetadataPath))!)).toBe("live-verified");
      }
    },
  });
}

async function listen(endpoint: string, connection: (socket: Socket) => void) {
  const server = createServer(socket => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); connection(socket); });
  listeners.push(server);
  await new Promise<void>((done, reject) => { server.once("error", reject); server.listen(endpoint, done); });
}

async function startChild(mode: string, paths: ReturnType<typeof fixturePaths>, environment = process.env) {
  const child = spawn(process.execPath, ["--import", "tsx", resolve("test/foundation/release/supervisor-recovery-child.ts"), mode, paths.dataDir, paths.endpoint], { env: environment, stdio: ["ignore", "ignore", "pipe", "ipc"], windowsHide: true });
  children.push(child);
  let stderr = "";
  child.stderr?.on("data", chunk => { stderr += String(chunk); });
  await new Promise<void>((done, reject) => {
    const timer = setTimeout(() => reject(new Error(`fixture child timed out: ${stderr}`)), 8_000);
    child.once("message", () => { clearTimeout(timer); done(); });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", () => { clearTimeout(timer); reject(new Error(`fixture child exited: ${stderr}`)); });
  });
  return child;
}

async function killFixture(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, "close");
  child.kill("SIGKILL");
  await closed;
}
