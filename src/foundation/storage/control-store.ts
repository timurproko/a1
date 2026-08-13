import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  ManagedAgentDescriptor,
  PaneId,
  AgentRecoveryAuthority,
  RecoveryReferenceId,
  TerminalSessionLaunch,
  TerminalTopologySnapshot,
} from "../workspace-contracts/index.js";
import {
  assertManagedAgentDescriptor,
  assertRecoveryAuthority,
  assertTerminalSessionLaunch,
  assertTerminalTopologySnapshot,
} from "../workspace-contracts/index.js";
import type {
  ForegroundTerminalLease,
  ForegroundTerminalLeaseId,
  GenerationId,
  NativeProcessIdentity,
  TransparentTerminalLifecycleOutcome,
} from "../lifecycle/index.js";

export const DEFAULT_WORKSPACE_ID = "workspace-default";
const INITIAL_WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

export interface WorkspaceAgentPresentation {
  readonly unreadActivity: number;
  readonly attention: boolean;
  readonly failure: { readonly code: string; readonly message: string } | null;
}

export interface StoredWorkspaceAgent {
  readonly agent: ManagedAgentDescriptor;
  readonly presentation: WorkspaceAgentPresentation;
}

interface ForegroundLeaseRow { id: string; owner_id: string; profile_json: string; state: ForegroundTerminalLease["state"]; generation_id: string | null; process_identity_json: string | null; acquired_at: string; heartbeat_at: string | null; released_at: string | null; outcome_json: string | null; owner_boot_nonce: string }
interface WorkspaceAgentRow { id: string; workspace_id: string; display_name: string; adapter_id: string; runtime_kind: string; lifecycle: string; capability_json: string; recovery_reference_id: string | null; unread_count: number; attention: number; failure_json: string | null; created_at: string; updated_at: string }
interface HostTopologyRow { host_instance_id: string; protocol_version: number; revision: number; topology_json: string; rollback_json: string; updated_at: string }
interface TerminalSessionRow { id: string; host_instance_id: string; pane_id: string; lifecycle: string; launch_json: string; recovery_reference_id: string | null; updated_at: string }
interface RecoveryReferenceRow { id: string; agent_id: string; authority_json: string; status: "pending" | "accepted" | "rejected" | "discontinuous"; rollback_json: string; created_at: string; updated_at: string }

export class ControlStore {
  readonly database: DatabaseSync;

  constructor(path: string, readonly bootNonce: string | null = null) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA foreign_keys = ON");
    this.migrate();
    if (bootNonce !== null) {
      this.reconcilePriorBootGenerations(bootNonce);
      this.reconcilePriorBootForegroundTerminalLeases(bootNonce);
    }
  }

  migrate(): void {
    const versionRow = this.database.prepare("PRAGMA user_version").get() as { user_version: number };
    const version = versionRow.user_version;
    if (version > 4) throw new Error(`control database version ${version} is newer than supported version 4`);
    if (version === 0) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          selected_agent_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE driver_profiles (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          profile_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE terminal_agents (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          profile_id TEXT NOT NULL REFERENCES driver_profiles(id),
          profile_json TEXT NOT NULL,
          surface_json TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE process_generations (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL REFERENCES terminal_agents(id) ON DELETE CASCADE,
          sequence INTEGER NOT NULL,
          profile_id TEXT NOT NULL REFERENCES driver_profiles(id),
          state TEXT NOT NULL,
          capabilities_json TEXT NOT NULL,
          started_at TEXT NOT NULL,
          exited_at TEXT,
          exit_code INTEGER,
          signal INTEGER,
          error TEXT,
          owner_boot_nonce TEXT,
          UNIQUE(agent_id, sequence)
        );
        CREATE INDEX idx_agents_workspace ON terminal_agents(workspace_id, created_at);
        CREATE INDEX idx_generations_agent ON process_generations(agent_id, sequence DESC);
        CREATE INDEX idx_generations_owner_boot ON process_generations(owner_boot_nonce, state);
        PRAGMA user_version = 1;
        COMMIT;
      `);
      const now = new Date().toISOString();
      this.database.prepare("INSERT INTO workspaces (id, name, selected_agent_id, created_at) VALUES (?, ?, NULL, ?)")
        .run(INITIAL_WORKSPACE_ID, "Workspace", now);
    }
    if (version <= 1) {
      const columns = this.database.prepare("PRAGMA table_info(process_generations)").all() as unknown as { name: string }[];
      if (!columns.some(column => column.name === "owner_boot_nonce")) {
        this.database.exec("ALTER TABLE process_generations ADD COLUMN owner_boot_nonce TEXT");
      }
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE INDEX IF NOT EXISTS idx_generations_owner_boot ON process_generations(owner_boot_nonce, state);
        CREATE TABLE foreground_terminal_leases (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          profile_json TEXT NOT NULL,
          state TEXT NOT NULL,
          generation_id TEXT,
          process_identity_json TEXT,
          acquired_at TEXT NOT NULL,
          heartbeat_at TEXT,
          released_at TEXT,
          outcome_json TEXT,
          owner_boot_nonce TEXT NOT NULL
        );
        CREATE UNIQUE INDEX idx_one_live_foreground_lease ON foreground_terminal_leases((1)) WHERE state IN ('requested', 'active');
        CREATE INDEX idx_foreground_lease_boot ON foreground_terminal_leases(owner_boot_nonce, state);
        PRAGMA user_version = 2;
        COMMIT;
      `);
    }
    if (version <= 2) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE workspace_agents (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          display_name TEXT NOT NULL,
          adapter_id TEXT NOT NULL,
          runtime_kind TEXT NOT NULL CHECK (runtime_kind IN ('structured', 'composed-terminal')),
          lifecycle TEXT NOT NULL,
          capability_json TEXT NOT NULL,
          recovery_reference_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (json_valid(capability_json))
        );
        CREATE INDEX idx_workspace_agents_workspace ON workspace_agents(workspace_id, created_at);
        CREATE INDEX idx_workspace_agents_recovery ON workspace_agents(recovery_reference_id);

        CREATE TABLE native_host_topology (
          host_instance_id TEXT PRIMARY KEY,
          protocol_version INTEGER NOT NULL CHECK (protocol_version = 1),
          revision INTEGER NOT NULL CHECK (revision >= 0),
          topology_json TEXT NOT NULL CHECK (json_valid(topology_json)),
          rollback_json TEXT NOT NULL CHECK (json_valid(rollback_json)),
          updated_at TEXT NOT NULL
        );

        CREATE TABLE terminal_sessions (
          id TEXT PRIMARY KEY,
          host_instance_id TEXT NOT NULL REFERENCES native_host_topology(host_instance_id) ON DELETE CASCADE,
          pane_id TEXT NOT NULL,
          lifecycle TEXT NOT NULL,
          launch_json TEXT NOT NULL CHECK (json_valid(launch_json)),
          recovery_reference_id TEXT,
          updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX idx_terminal_sessions_pane ON terminal_sessions(host_instance_id, pane_id);
        CREATE INDEX idx_terminal_sessions_recovery ON terminal_sessions(recovery_reference_id);

        CREATE TABLE recovery_references (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE,
          authority_json TEXT NOT NULL CHECK (json_valid(authority_json)),
          status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'discontinuous')),
          rollback_json TEXT NOT NULL CHECK (json_valid(rollback_json)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_recovery_references_agent ON recovery_references(agent_id, status);
        PRAGMA user_version = 3;
        COMMIT;
      `);
    }
    if (version <= 3) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        ALTER TABLE workspace_agents ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0);
        ALTER TABLE workspace_agents ADD COLUMN attention INTEGER NOT NULL DEFAULT 0 CHECK (attention IN (0, 1));
        ALTER TABLE workspace_agents ADD COLUMN failure_json TEXT CHECK (failure_json IS NULL OR json_valid(failure_json));
        ALTER TABLE workspaces ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
        PRAGMA user_version = 4;
        COMMIT;
      `);
    }
  }

  reconcilePriorBootGenerations(bootNonce: string): number {
    const now = new Date().toISOString();
    return this.#transaction(() => {
      const result = this.database.prepare(`UPDATE process_generations
        SET state = 'interrupted', exited_at = ?, error = COALESCE(error, 'supervisor ownership ended before a terminal outcome')
        WHERE state NOT IN ('exited', 'stopped', 'interrupted', 'error')
          AND (owner_boot_nonce IS NULL OR owner_boot_nonce <> ?)`)
        .run(now, bootNonce);
      return Number(result.changes);
    });
  }

  acquireForegroundTerminalLease(lease: ForegroundTerminalLease): void {
    if (this.bootNonce === null) throw new Error("foreground lease storage requires a supervisor boot identity");
    if (lease.state !== "requested" || lease.generationId !== null || lease.processIdentity !== null || lease.releasedAt !== null || lease.outcome !== null) {
      throw new Error("new foreground lease must be requested and unactivated");
    }
    try {
      this.database.prepare(`INSERT INTO foreground_terminal_leases
        (id, owner_id, profile_json, state, generation_id, process_identity_json, acquired_at, heartbeat_at, released_at, outcome_json, owner_boot_nonce)
        VALUES (?, ?, ?, 'requested', NULL, NULL, ?, NULL, NULL, NULL, ?)`)
        .run(lease.id, lease.ownerId, JSON.stringify(lease.profile), lease.acquiredAt, this.bootNonce);
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) throw new Error("an exclusive foreground terminal lease is already live");
      throw error;
    }
  }

  activateForegroundTerminalLease(leaseId: ForegroundTerminalLeaseId, generationId: GenerationId, processIdentity: NativeProcessIdentity, heartbeatAt: string): boolean {
    if (this.bootNonce === null) throw new Error("foreground lease storage requires a supervisor boot identity");
    const result = this.database.prepare(`UPDATE foreground_terminal_leases
      SET state = 'active', generation_id = ?, process_identity_json = ?, heartbeat_at = ?
      WHERE id = ? AND state = 'requested' AND owner_boot_nonce = ?`)
      .run(generationId, JSON.stringify(processIdentity), heartbeatAt, leaseId, this.bootNonce);
    return Number(result.changes) === 1;
  }

  heartbeatForegroundTerminalLease(leaseId: ForegroundTerminalLeaseId, processIdentity: NativeProcessIdentity, heartbeatAt: string): boolean {
    if (this.bootNonce === null) throw new Error("foreground lease storage requires a supervisor boot identity");
    const result = this.database.prepare(`UPDATE foreground_terminal_leases SET heartbeat_at = ?
      WHERE id = ? AND state = 'active' AND owner_boot_nonce = ? AND process_identity_json = ?`)
      .run(heartbeatAt, leaseId, this.bootNonce, JSON.stringify(processIdentity));
    return Number(result.changes) === 1;
  }

  releaseForegroundTerminalLease(leaseId: ForegroundTerminalLeaseId, processIdentity: NativeProcessIdentity | null, outcome: TransparentTerminalLifecycleOutcome, releasedAt: string): boolean {
    if (this.bootNonce === null) throw new Error("foreground lease storage requires a supervisor boot identity");
    const expectedIdentity = processIdentity === null ? null : JSON.stringify(processIdentity);
    const result = this.database.prepare(`UPDATE foreground_terminal_leases
      SET state = 'released', released_at = ?, outcome_json = ?
      WHERE id = ? AND state IN ('requested', 'active') AND owner_boot_nonce = ?
        AND ((process_identity_json IS NULL AND ? IS NULL) OR process_identity_json = ?)`)
      .run(releasedAt, JSON.stringify(outcome), leaseId, this.bootNonce, expectedIdentity, expectedIdentity);
    return Number(result.changes) === 1;
  }

  loadLiveForegroundTerminalLease(): ForegroundTerminalLease | null {
    const row = this.database.prepare("SELECT * FROM foreground_terminal_leases WHERE state IN ('requested', 'active') LIMIT 1").get() as ForegroundLeaseRow | undefined;
    return row ? foregroundLeaseFromRow(row) : null;
  }

  reconcilePriorBootForegroundTerminalLeases(bootNonce: string, reconciledAt = new Date().toISOString()): number {
    const outcome: TransparentTerminalLifecycleOutcome = { kind: "broker-error", message: "foreground lease owner ended before a terminal outcome", code: "stale-owner-boot" };
    const result = this.database.prepare(`UPDATE foreground_terminal_leases
      SET state = 'released', released_at = ?, outcome_json = ?
      WHERE state IN ('requested', 'active') AND owner_boot_nonce <> ?`)
      .run(reconciledAt, JSON.stringify(outcome), bootNonce);
    return Number(result.changes);
  }

  persistWorkspaceAgent(agent: ManagedAgentDescriptor, updatedAt = new Date().toISOString()): void {
    const existing = this.loadWorkspaceAgentRecord(agent.id);
    this.persistWorkspaceAgentRecord({
      agent,
      presentation: existing?.presentation ?? { unreadActivity: 0, attention: false, failure: null },
    }, updatedAt);
  }

  persistWorkspaceAgentRecord(record: StoredWorkspaceAgent, updatedAt = new Date().toISOString()): void {
    assertManagedAgentDescriptor(record.agent);
    assertWorkspaceAgentPresentation(record.presentation);
    this.#upsertWorkspaceAgentRecord(record, updatedAt);
  }

  replaceWorkspaceAgentRecords(records: readonly StoredWorkspaceAgent[], selectedAgentId: string | null, revision: number, updatedAt = new Date().toISOString()): void {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new RangeError("workspace revision must be a non-negative safe integer");
    const ids = new Set<string>();
    for (const record of records) {
      assertManagedAgentDescriptor(record.agent);
      assertWorkspaceAgentPresentation(record.presentation);
      if (ids.has(record.agent.id)) throw new TypeError(`duplicate workspace agent id: ${record.agent.id}`);
      ids.add(record.agent.id);
    }
    if (selectedAgentId !== null && !ids.has(selectedAgentId)) throw new TypeError("selected workspace agent must exist in the replacement set");
    this.#transaction(() => {
      if (records.length === 0) this.database.prepare("DELETE FROM workspace_agents").run();
      else {
        const placeholders = records.map(() => "?").join(", ");
        this.database.prepare(`DELETE FROM workspace_agents WHERE id NOT IN (${placeholders})`).run(...records.map(record => record.agent.id));
      }
      for (const record of records) this.#upsertWorkspaceAgentRecord(record, updatedAt);
      this.database.prepare("UPDATE workspaces SET selected_agent_id = ?, revision = ? WHERE id = ?").run(selectedAgentId, revision, INITIAL_WORKSPACE_ID);
    });
  }

  loadWorkspaceAgents(): ManagedAgentDescriptor[] {
    return this.loadWorkspaceAgentRecords().map(record => record.agent);
  }

  loadWorkspaceAgentRecord(agentId: string): StoredWorkspaceAgent | null {
    const row = this.database.prepare("SELECT * FROM workspace_agents WHERE id = ?").get(agentId) as WorkspaceAgentRow | undefined;
    return row ? workspaceAgentFromRow(row) : null;
  }

  loadWorkspaceAgentRecords(): StoredWorkspaceAgent[] {
    const rows = this.database.prepare("SELECT * FROM workspace_agents ORDER BY created_at, id").all() as unknown as WorkspaceAgentRow[];
    return rows.map(workspaceAgentFromRow);
  }

  loadSelectedWorkspaceAgentId(): string | null {
    const row = this.database.prepare("SELECT selected_agent_id FROM workspaces WHERE id = ?").get(INITIAL_WORKSPACE_ID) as { selected_agent_id: string | null } | undefined;
    return row?.selected_agent_id ?? null;
  }

  loadWorkspaceRevision(): number {
    const row = this.database.prepare("SELECT revision FROM workspaces WHERE id = ?").get(INITIAL_WORKSPACE_ID) as { revision: number } | undefined;
    return row?.revision ?? 0;
  }

  #upsertWorkspaceAgentRecord(record: StoredWorkspaceAgent, updatedAt: string): void {
    const agent = record.agent;
    this.database.prepare(`INSERT INTO workspace_agents
      (id, workspace_id, display_name, adapter_id, runtime_kind, lifecycle, capability_json, recovery_reference_id, unread_count, attention, failure_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        display_name = excluded.display_name,
        adapter_id = excluded.adapter_id,
        runtime_kind = excluded.runtime_kind,
        lifecycle = excluded.lifecycle,
        capability_json = excluded.capability_json,
        recovery_reference_id = excluded.recovery_reference_id,
        unread_count = excluded.unread_count,
        attention = excluded.attention,
        failure_json = excluded.failure_json,
        updated_at = excluded.updated_at`)
      .run(
        agent.id,
        INITIAL_WORKSPACE_ID,
        agent.displayName,
        agent.adapterId,
        agent.runtime,
        agent.lifecycle,
        JSON.stringify(agent.capability),
        agent.recoveryReferenceId,
        record.presentation.unreadActivity,
        record.presentation.attention ? 1 : 0,
        record.presentation.failure === null ? null : JSON.stringify(record.presentation.failure),
        agent.createdAt,
        updatedAt,
      );
  }

  saveNativeHostTopology(topology: TerminalTopologySnapshot, rollbackTopology: TerminalTopologySnapshot | null, updatedAt = new Date().toISOString()): void {
    assertTerminalTopologySnapshot(topology);
    if (rollbackTopology !== null) assertTerminalTopologySnapshot(rollbackTopology);
    if (rollbackTopology !== null && rollbackTopology.hostInstanceId !== topology.hostInstanceId) {
      throw new TypeError("topology rollback metadata must identify the same native host");
    }
    const prior = this.loadNativeHostTopology(topology.hostInstanceId);
    if (prior !== null && topology.revision < prior.topology.revision) {
      throw new RangeError(`stale native-host topology revision ${topology.revision}; persisted revision is ${prior.topology.revision}`);
    }
    if (rollbackTopology !== null && rollbackTopology.revision > topology.revision) {
      throw new RangeError("topology rollback revision cannot be newer than the persisted topology");
    }
    const rollbackJson = rollbackTopology === null
      ? JSON.stringify({ contractVersion: 1, reason: "initial native-host topology", topology: null })
      : JSON.stringify({ contractVersion: 1, reason: "backward-readable prior authoritative topology", topology: rollbackTopology });
    this.database.prepare(`INSERT INTO native_host_topology
      (host_instance_id, protocol_version, revision, topology_json, rollback_json, updated_at)
      VALUES (?, 1, ?, ?, ?, ?)
      ON CONFLICT(host_instance_id) DO UPDATE SET
        revision = excluded.revision,
        topology_json = excluded.topology_json,
        rollback_json = excluded.rollback_json,
        updated_at = excluded.updated_at`)
      .run(topology.hostInstanceId, topology.revision, JSON.stringify(topology), rollbackJson, updatedAt);
  }

  loadNativeHostTopology(hostInstanceId: string): { readonly topology: TerminalTopologySnapshot; readonly rollback: unknown; readonly updatedAt: string } | null {
    const row = this.database.prepare("SELECT * FROM native_host_topology WHERE host_instance_id = ?").get(hostInstanceId) as HostTopologyRow | undefined;
    if (!row) return null;
    const topology = JSON.parse(row.topology_json) as TerminalTopologySnapshot;
    assertTerminalTopologySnapshot(topology);
    return { topology, rollback: JSON.parse(row.rollback_json) as unknown, updatedAt: row.updated_at };
  }

  persistTerminalSession(
    session: TerminalSessionLaunch,
    hostInstanceId: string,
    paneId: PaneId,
    lifecycle: string,
    recoveryReferenceId: RecoveryReferenceId | null,
    updatedAt = new Date().toISOString(),
  ): void {
    assertTerminalSessionLaunch(session);
    this.database.prepare(`INSERT INTO terminal_sessions
      (id, host_instance_id, pane_id, lifecycle, launch_json, recovery_reference_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        host_instance_id = excluded.host_instance_id,
        pane_id = excluded.pane_id,
        lifecycle = excluded.lifecycle,
        launch_json = excluded.launch_json,
        recovery_reference_id = excluded.recovery_reference_id,
        updated_at = excluded.updated_at`)
      .run(session.id, hostInstanceId, paneId, lifecycle, JSON.stringify(session), recoveryReferenceId, updatedAt);
  }

  loadTerminalSessions(): { readonly session: TerminalSessionLaunch; readonly hostInstanceId: string; readonly paneId: PaneId; readonly lifecycle: string; readonly recoveryReferenceId: RecoveryReferenceId | null }[] {
    const rows = this.database.prepare("SELECT * FROM terminal_sessions ORDER BY id").all() as unknown as TerminalSessionRow[];
    return rows.map(row => {
      const session = JSON.parse(row.launch_json) as TerminalSessionLaunch;
      assertTerminalSessionLaunch(session);
      return { session, hostInstanceId: row.host_instance_id, paneId: row.pane_id, lifecycle: row.lifecycle, recoveryReferenceId: row.recovery_reference_id };
    });
  }

  persistRecoveryReference(
    authority: AgentRecoveryAuthority,
    status: "pending" | "accepted" | "rejected" | "discontinuous",
    rollbackMetadata: Readonly<Record<string, unknown>>,
    updatedAt = new Date().toISOString(),
  ): void {
    assertRecoveryAuthority(authority);
    const createdAt = typeof rollbackMetadata.createdAt === "string" ? rollbackMetadata.createdAt : updatedAt;
    const rollbackJson = JSON.stringify({ contractVersion: 1, ...rollbackMetadata });
    this.database.prepare(`INSERT INTO recovery_references
      (id, agent_id, authority_json, status, rollback_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        agent_id = excluded.agent_id,
        authority_json = excluded.authority_json,
        status = excluded.status,
        rollback_json = excluded.rollback_json,
        updated_at = excluded.updated_at`)
      .run(authority.referenceId, authority.agentId, JSON.stringify(authority), status, rollbackJson, createdAt, updatedAt);
  }

  loadRecoveryReference(id: RecoveryReferenceId): { readonly authority: unknown; readonly status: string; readonly rollback: unknown; readonly updatedAt: string } | null {
    const row = this.database.prepare("SELECT * FROM recovery_references WHERE id = ?").get(id) as RecoveryReferenceRow | undefined;
    if (!row) return null;
    const authority = JSON.parse(row.authority_json) as unknown;
    assertRecoveryAuthority(authority as AgentRecoveryAuthority);
    return { authority, status: row.status, rollback: JSON.parse(row.rollback_json) as unknown, updatedAt: row.updated_at };
  }

  close(): void {
    this.database.close();
  }

  #transaction<T>(operation: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function workspaceAgentFromRow(row: WorkspaceAgentRow): StoredWorkspaceAgent {
  const descriptor: ManagedAgentDescriptor = {
    id: row.id,
    displayName: row.display_name,
    adapterId: row.adapter_id,
    runtime: row.runtime_kind as ManagedAgentDescriptor["runtime"],
    lifecycle: row.lifecycle as ManagedAgentDescriptor["lifecycle"],
    capability: JSON.parse(row.capability_json) as ManagedAgentDescriptor["capability"],
    createdAt: row.created_at,
    recoveryReferenceId: row.recovery_reference_id,
  };
  assertManagedAgentDescriptor(descriptor);
  const failure = row.failure_json === null ? null : JSON.parse(row.failure_json) as WorkspaceAgentPresentation["failure"];
  const presentation: WorkspaceAgentPresentation = {
    unreadActivity: row.unread_count,
    attention: row.attention === 1,
    failure,
  };
  assertWorkspaceAgentPresentation(presentation);
  return { agent: descriptor, presentation };
}

function assertWorkspaceAgentPresentation(presentation: WorkspaceAgentPresentation): void {
  if (!Number.isSafeInteger(presentation.unreadActivity) || presentation.unreadActivity < 0) {
    throw new RangeError("workspace unread activity must be a non-negative safe integer");
  }
  if (typeof presentation.attention !== "boolean") throw new TypeError("workspace attention must be boolean");
  if (presentation.failure !== null) {
    if (!presentation.failure.code || presentation.failure.code.length > 128 || presentation.failure.code.includes("\0")) {
      throw new TypeError("workspace failure code is invalid");
    }
    if (!presentation.failure.message || presentation.failure.message.length > 4_096 || presentation.failure.message.includes("\0")) {
      throw new TypeError("workspace failure message is invalid");
    }
  }
}

function foregroundLeaseFromRow(row: ForegroundLeaseRow): ForegroundTerminalLease {
  return {
    id: row.id,
    ownerId: row.owner_id,
    profile: JSON.parse(row.profile_json) as ForegroundTerminalLease["profile"],
    state: row.state,
    generationId: row.generation_id,
    processIdentity: row.process_identity_json ? JSON.parse(row.process_identity_json) as NativeProcessIdentity : null,
    acquiredAt: row.acquired_at,
    heartbeatAt: row.heartbeat_at,
    releasedAt: row.released_at,
    outcome: row.outcome_json ? JSON.parse(row.outcome_json) as TransparentTerminalLifecycleOutcome : null,
  };
}
