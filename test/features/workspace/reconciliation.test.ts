import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  WorkspaceReducer,
  WorkspaceStore,
  reconcileWorkspaceRestart,
} from "../../../src/features/workspace/index.js";
import { SyntheticStructuredAdapter } from "../../foundation/structured-agent-runtime/synthetic-adapter.js";
import {
  NATIVE_HOST_PROTOCOL_VERSION,
  WORKSPACE_CONTRACT_VERSION,
  type ManagedAgentDescriptor,
  type StructuredCapabilityContract,
} from "../../../src/foundation/workspace-contracts/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

function capability(adapterId: string, resume: "none" | "position" | "snapshot" = "position"): StructuredCapabilityContract {
  return {
    kind: "structured",
    protocolVersion: WORKSPACE_CONTRACT_VERSION,
    adapterId,
    commands: ["prompt"],
    eventTypes: ["message"],
    snapshots: resume === "none" ? "none" : "authoritative",
    resume,
    cancellation: "correlated",
    attachmentTypes: [],
    flow: {
      maxEventBytes: 4_096,
      maxSnapshotBytes: 16_384,
      maxAttachmentBytes: 32_768,
      maxQueuedEvents: 8,
      maxConcurrentCommands: 2,
      maxReconnectEvents: 32,
    },
  };
}

function structuredAgent(id: string, adapterId: string, recoveryReferenceId: string | null, resume: "none" | "position" | "snapshot" = "position"): ManagedAgentDescriptor {
  return {
    id,
    displayName: id,
    adapterId,
    runtime: "structured",
    lifecycle: "ready",
    capability: capability(adapterId, resume),
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId,
  };
}

function composedAgent(id: string, recoveryReferenceId: string): ManagedAgentDescriptor {
  return {
    id,
    displayName: id,
    adapterId: "adapter.native-host",
    runtime: "composed-terminal",
    lifecycle: "ready",
    capability: {
      kind: "composed-terminal",
      protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
      hostInstanceId: "host-1",
      topologyRevision: 1,
      proofStatus: "pending",
    },
    createdAt: "2026-08-13T00:00:00.000Z",
    recoveryReferenceId,
  };
}

async function createStore(): Promise<{ root: string; path: string; store: WorkspaceStore }> {
  const root = await mkdtemp(join(tmpdir(), "addone-workspace-reconcile-"));
  roots.push(root);
  const path = join(root, "control.sqlite3");
  return { root, path, store: new WorkspaceStore(path) };
}

describe("workspace restart reconciliation", () => {
  it("reconciles verified, stale, missing, non-reconnectable, and unavailable composed authorities", async () => {
    const { store } = await createStore();
    const goodAdapter = new SyntheticStructuredAdapter({ adapterId: "adapter.good", resume: "position" });
    const staleAdapter = new SyntheticStructuredAdapter({ adapterId: "adapter.stale", resume: "position" });
    const endedAdapter = new SyntheticStructuredAdapter({ adapterId: "adapter.ended", resume: "none" });
    const reducer = new WorkspaceReducer("workspace-default");
    reducer.createAgent(structuredAgent("agent-good", "adapter.good", "recovery-good"));
    reducer.createAgent(structuredAgent("agent-stale", "adapter.stale", "recovery-stale"));
    reducer.createAgent(structuredAgent("agent-missing", "adapter.good", "recovery-missing"));
    reducer.createAgent(structuredAgent("agent-ended", "adapter.ended", "recovery-ended", "none"));
    reducer.createAgent(composedAgent("agent-composed", "recovery-composed"));

    const goodAuthority = { ...goodAdapter.positionAuthority("agent-good", 4), referenceId: "recovery-good" };
    const staleAuthority = { ...staleAdapter.positionAuthority("agent-stale", 2), referenceId: "recovery-stale" };
    const endedAuthority = { ...endedAdapter.positionAuthority("agent-ended", 0), referenceId: "recovery-ended" };
    const missingAuthority = { ...staleAdapter.positionAuthority("agent-missing", 1), referenceId: "recovery-missing" };
    const composedAuthority = {
      kind: "composed-terminal" as const,
      referenceId: "recovery-composed",
      agentId: "agent-composed",
      hostInstanceId: "host-1",
      hostBuildId: "build-1",
      processIdentity: "pid:200:start:1",
      pseudoterminalIdentity: "pty-1",
      retainedStateIdentity: "surface-1",
      topologyRevision: 1,
      streamPosition: 128,
    };
    store.save(reducer);
    store.persistRecoveryReference(goodAuthority, "pending", { phase: "before-restart" }, "2026-08-13T00:00:01.000Z");
    store.persistRecoveryReference(staleAuthority, "pending", { phase: "before-restart" }, "2026-08-13T00:00:02.000Z");
    store.persistRecoveryReference(missingAuthority, "pending", { phase: "before-restart" }, "2026-08-13T00:00:03.000Z");
    store.persistRecoveryReference(endedAuthority, "pending", { phase: "before-restart" }, "2026-08-13T00:00:04.000Z");
    store.persistRecoveryReference(composedAuthority, "pending", { phase: "before-restart" }, "2026-08-13T00:00:05.000Z");

    const staleProof = { ...staleAdapter.proof(staleAuthority), processIdentity: "pid:adapter.stale:start:2" };
    const report = reconcileWorkspaceRestart(reducer, store, new Map([
      ["agent-good", goodAdapter.proof(goodAuthority)],
      ["agent-stale", staleProof],
      ["agent-ended", endedAdapter.proof(endedAuthority)],
    ]), "2026-08-13T00:01:00.000Z");

    expect(report.entries).toEqual([
      { agentId: "agent-good", outcome: "ready", code: null, diagnostic: "structured resume position verified" },
      { agentId: "agent-stale", outcome: "discontinuous", code: "process-mismatch", diagnostic: "resume proof process does not match verified process ownership" },
      { agentId: "agent-missing", outcome: "discontinuous", code: "missing-resume-proof", diagnostic: "adapter did not provide a resume proof during reconciliation" },
      { agentId: "agent-ended", outcome: "ended", code: "non-reconnectable", diagnostic: "adapter did not negotiate reconnection; durable agent is ended after restart" },
      { agentId: "agent-composed", outcome: "discontinuous", code: "native-host-unavailable", diagnostic: "native-host recovery is unavailable until its accepted proof capability is enabled" },
    ]);

    const view = reducer.view();
    expect(view.agents.find(agent => agent.id === "agent-good")).toMatchObject({ lifecycle: "ready", failure: null, attention: false });
    expect(view.agents.find(agent => agent.id === "agent-stale")).toMatchObject({ lifecycle: "discontinuous", attention: true, failure: { code: "process-mismatch" } });
    expect(view.agents.find(agent => agent.id === "agent-missing")).toMatchObject({ lifecycle: "discontinuous", failure: { code: "missing-resume-proof" } });
    expect(view.agents.find(agent => agent.id === "agent-ended")).toMatchObject({ lifecycle: "stopped", failure: null, attention: false });
    expect(view.agents.find(agent => agent.id === "agent-composed")).toMatchObject({ lifecycle: "discontinuous", failure: { code: "native-host-unavailable" } });

    expect(store.loadRecoveryReference("recovery-good")).toMatchObject({
      status: "accepted",
      rollback: { previousStatus: "pending", reason: "verified ownership and resume boundary", rollbackToStatus: "pending" },
    });
    expect(store.loadRecoveryReference("recovery-stale")).toMatchObject({
      status: "rejected",
      rollback: { previousStatus: "pending", reason: "resume proof process does not match verified process ownership", rollbackToStatus: "pending" },
    });
    expect(store.loadRecoveryReference("recovery-ended")).toMatchObject({ status: "discontinuous" });
    store.close();
  });

  it("persists reconciliation across a process restart and keeps rollback-readable records", async () => {
    const { path, store: firstStore } = await createStore();
    const adapter = new SyntheticStructuredAdapter({ adapterId: "adapter.good", resume: "position" });
    const reducer = new WorkspaceReducer("workspace-default");
    reducer.createAgent(structuredAgent("agent-good", "adapter.good", "recovery-good"));
    const authority = { ...adapter.positionAuthority("agent-good", 3), referenceId: "recovery-good" };
    firstStore.save(reducer);
    firstStore.persistRecoveryReference(authority, "pending", { phase: "before-abnormal-exit" }, "2026-08-13T00:00:01.000Z");
    firstStore.close();

    const secondStore = new WorkspaceStore(path);
    const restored = secondStore.load();
    const report = reconcileWorkspaceRestart(restored, secondStore, new Map([["agent-good", adapter.proof(authority)]]), "2026-08-13T00:02:00.000Z");
    expect(report.entries).toEqual([{ agentId: "agent-good", outcome: "ready", code: null, diagnostic: "structured resume position verified" }]);
    secondStore.close();

    const thirdStore = new WorkspaceStore(path);
    const final = thirdStore.load();
    expect(final.view().agents[0]).toMatchObject({ id: "agent-good", lifecycle: "ready", failure: null });
    expect(thirdStore.loadRecoveryReference("recovery-good")).toMatchObject({
      status: "accepted",
      rollback: { previousStatus: "pending", rollbackToStatus: "pending", reconciledAt: "2026-08-13T00:02:00.000Z" },
    });
    thirdStore.close();
  });
});
