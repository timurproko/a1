import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type {
  LaunchInstance,
  LaunchInstanceId,
  LaunchInstanceOutcome,
  NativeProcessIdentity,
  ProcessContainmentIdentity,
} from "../lifecycle/index.js";
import {
  assertLaunchInstance,
  assertLaunchInstanceOutcome,
  assertNativeProcessIdentity,
  assertProcessContainmentIdentity,
} from "../lifecycle/index.js";

const CONTROL_SCHEMA_VERSION = 7;

const LAUNCH_INSTANCES_TABLE = `
  CREATE TABLE launch_instances (
    id TEXT PRIMARY KEY,
    owner_client_id TEXT NOT NULL,
    profile_id TEXT NOT NULL CHECK (profile_id IN ('a1', 'pi')),
    state TEXT NOT NULL CHECK (state IN ('requested', 'active', 'stopping', 'completed', 'interrupted')),
    shutdown_policy TEXT NOT NULL CHECK (shutdown_policy = 'terminate-tree-on-close'),
    guardian_identity_json TEXT NOT NULL CHECK (json_valid(guardian_identity_json)),
    root_identity_json TEXT CHECK (root_identity_json IS NULL OR json_valid(root_identity_json)),
    containment_identity_json TEXT CHECK (containment_identity_json IS NULL OR json_valid(containment_identity_json)),
    created_at TEXT NOT NULL,
    activated_at TEXT,
    stopping_at TEXT,
    completed_at TEXT,
    outcome_json TEXT CHECK (outcome_json IS NULL OR json_valid(outcome_json)),
    owner_boot_nonce TEXT NOT NULL,
    CHECK ((state = 'requested' AND root_identity_json IS NULL AND containment_identity_json IS NULL AND activated_at IS NULL AND stopping_at IS NULL AND completed_at IS NULL AND outcome_json IS NULL)
      OR (state = 'active' AND root_identity_json IS NOT NULL AND containment_identity_json IS NOT NULL AND activated_at IS NOT NULL AND stopping_at IS NULL AND completed_at IS NULL AND outcome_json IS NULL)
      OR (state = 'stopping' AND root_identity_json IS NOT NULL AND containment_identity_json IS NOT NULL AND activated_at IS NOT NULL AND stopping_at IS NOT NULL AND completed_at IS NULL AND outcome_json IS NULL)
      OR (state IN ('completed', 'interrupted') AND completed_at IS NOT NULL AND outcome_json IS NOT NULL))
  );
`;

interface LaunchInstanceRow { id: string; owner_client_id: string; profile_id: LaunchInstance["profileId"]; state: LaunchInstance["state"]; shutdown_policy: LaunchInstance["shutdownPolicy"]; guardian_identity_json: string; root_identity_json: string | null; containment_identity_json: string | null; created_at: string; activated_at: string | null; stopping_at: string | null; completed_at: string | null; outcome_json: string | null; owner_boot_nonce: string }

/** Owns WAL-backed control persistence and reconciles prior-boot records before current use. */
export class ControlStore {
  readonly database: DatabaseSync;

  constructor(path: string, readonly bootNonce: string | null = null) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(path);
    try {
      this.database.exec("PRAGMA journal_mode = WAL");
      this.database.exec("PRAGMA foreign_keys = ON");
      this.migrate();
      if (bootNonce !== null) this.reconcilePriorBootLaunchInstances(bootNonce);
    } catch (error) {
      this.database.close();
      throw error;
    }
  }

  migrate(): void {
    const versionRow = this.database.prepare("PRAGMA user_version").get() as { user_version: number };
    const version = versionRow.user_version;
    if (version > CONTROL_SCHEMA_VERSION) throw new Error(`control database version ${version} is newer than supported version ${CONTROL_SCHEMA_VERSION}`);
    if (version !== 0) this.#assertCurrentControlSchema();
    if (version === 0) {
      // Rationale: a new database gets only the live schema; the historical chain below exists for
      // databases created by earlier releases and ends by dropping the retired workspace tables.
      this.database.exec(`
        BEGIN IMMEDIATE;
        ${LAUNCH_INSTANCES_TABLE}
        CREATE INDEX idx_launch_instances_owner ON launch_instances(owner_client_id, state);
        CREATE INDEX idx_launch_instances_boot ON launch_instances(owner_boot_nonce, state);
        CREATE TABLE product_identity (schema TEXT PRIMARY KEY NOT NULL);
        PRAGMA user_version = ${CONTROL_SCHEMA_VERSION};
        COMMIT;
      `);
      this.database.prepare("INSERT INTO product_identity (schema) VALUES (?)").run(PRODUCT_IDENTITY.protocol.controlStoreSchema);
      return;
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
    if (version <= 4) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        UPDATE foreground_terminal_leases
          SET state = 'interrupted',
              released_at = COALESCE(released_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              outcome_json = '{"kind":"interrupted","reason":"legacy-migration","message":"legacy foreground ownership cannot prove current launch-instance liveness"}'
          WHERE state IN ('requested', 'active');
        DROP INDEX IF EXISTS idx_one_live_foreground_lease;
        CREATE TABLE launch_instances (
          id TEXT PRIMARY KEY,
          owner_client_id TEXT NOT NULL,
          profile_id TEXT NOT NULL CHECK (profile_id IN ('a1', 'pi')),
          state TEXT NOT NULL CHECK (state IN ('requested', 'active', 'stopping', 'completed', 'interrupted')),
          shutdown_policy TEXT NOT NULL CHECK (shutdown_policy = 'terminate-tree-on-close'),
          guardian_identity_json TEXT NOT NULL CHECK (json_valid(guardian_identity_json)),
          root_identity_json TEXT CHECK (root_identity_json IS NULL OR json_valid(root_identity_json)),
          containment_identity_json TEXT CHECK (containment_identity_json IS NULL OR json_valid(containment_identity_json)),
          created_at TEXT NOT NULL,
          activated_at TEXT,
          stopping_at TEXT,
          completed_at TEXT,
          outcome_json TEXT CHECK (outcome_json IS NULL OR json_valid(outcome_json)),
          owner_boot_nonce TEXT NOT NULL,
          CHECK ((state = 'requested' AND root_identity_json IS NULL AND containment_identity_json IS NULL AND activated_at IS NULL AND stopping_at IS NULL AND completed_at IS NULL AND outcome_json IS NULL)
            OR (state = 'active' AND root_identity_json IS NOT NULL AND containment_identity_json IS NOT NULL AND activated_at IS NOT NULL AND stopping_at IS NULL AND completed_at IS NULL AND outcome_json IS NULL)
            OR (state = 'stopping' AND root_identity_json IS NOT NULL AND containment_identity_json IS NOT NULL AND activated_at IS NOT NULL AND stopping_at IS NOT NULL AND completed_at IS NULL AND outcome_json IS NULL)
            OR (state IN ('completed', 'interrupted') AND completed_at IS NOT NULL AND outcome_json IS NOT NULL))
        );
        CREATE INDEX idx_launch_instances_owner ON launch_instances(owner_client_id, state);
        CREATE INDEX idx_launch_instances_boot ON launch_instances(owner_boot_nonce, state);
        PRAGMA user_version = 5;
        COMMIT;
      `);
    }
    if (version <= 5) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        ALTER TABLE launch_instances RENAME TO launch_instances_v5;
        DROP INDEX idx_launch_instances_owner;
        DROP INDEX idx_launch_instances_boot;
        ${LAUNCH_INSTANCES_TABLE}
        INSERT INTO launch_instances SELECT * FROM launch_instances_v5 WHERE profile_id IN ('a1', 'pi');
        DROP TABLE launch_instances_v5;
        CREATE INDEX idx_launch_instances_owner ON launch_instances(owner_client_id, state);
        CREATE INDEX idx_launch_instances_boot ON launch_instances(owner_boot_nonce, state);
        PRAGMA user_version = 6;
        COMMIT;
      `);
    }
    if (version <= 6) {
      // Rationale: the multi-agent workspace, terminal-host topology, and recovery tables never had a
      // production writer; children go before parents so foreign keys never see an orphan.
      this.database.exec(`
        BEGIN IMMEDIATE;
        DROP TABLE IF EXISTS recovery_references;
        DROP TABLE IF EXISTS terminal_sessions;
        DROP TABLE IF EXISTS native_host_topology;
        DROP TABLE IF EXISTS workspace_agents;
        DROP TABLE IF EXISTS process_generations;
        DROP TABLE IF EXISTS terminal_agents;
        DROP TABLE IF EXISTS driver_profiles;
        DROP TABLE IF EXISTS workspaces;
        DROP TABLE IF EXISTS foreground_terminal_leases;
        PRAGMA user_version = ${CONTROL_SCHEMA_VERSION};
        COMMIT;
      `);
    }
  }

  #assertCurrentControlSchema(): void {
    const table = this.database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'product_identity'").get();
    if (!table) throw new Error("control database has no A1 product schema; legacy state is unsupported");
    const identity = this.database.prepare("SELECT schema FROM product_identity").get() as { schema?: unknown } | undefined;
    if (identity?.schema !== PRODUCT_IDENTITY.protocol.controlStoreSchema) {
      throw new Error(`control database schema ${String(identity?.schema)} is unsupported; expected ${PRODUCT_IDENTITY.protocol.controlStoreSchema}`);
    }
  }

  createLaunchInstance(instance: LaunchInstance): void {
    if (this.bootNonce === null) throw new Error("launch instance storage requires a supervisor boot identity");
    assertLaunchInstance(instance);
    if (instance.state !== "requested") throw new Error("new launch instance must be requested");
    this.database.prepare(`INSERT INTO launch_instances
      (id, owner_client_id, profile_id, state, shutdown_policy, guardian_identity_json, root_identity_json, containment_identity_json,
       created_at, activated_at, stopping_at, completed_at, outcome_json, owner_boot_nonce)
      VALUES (?, ?, ?, 'requested', ?, ?, NULL, NULL, ?, NULL, NULL, NULL, NULL, ?)`)
      .run(instance.id, instance.ownerClientId, instance.profileId, instance.shutdownPolicy, JSON.stringify(instance.guardianIdentity), instance.createdAt, this.bootNonce);
  }

  activateLaunchInstance(
    instanceId: LaunchInstanceId,
    ownerClientId: string,
    rootIdentity: NativeProcessIdentity,
    containmentIdentity: ProcessContainmentIdentity,
    activatedAt: string,
  ): boolean {
    if (this.bootNonce === null) throw new Error("launch instance storage requires a supervisor boot identity");
    assertNativeProcessIdentity(rootIdentity);
    assertProcessContainmentIdentity(containmentIdentity);
    const result = this.database.prepare(`UPDATE launch_instances
      SET state = 'active', root_identity_json = ?, containment_identity_json = ?, activated_at = ?
      WHERE id = ? AND owner_client_id = ? AND owner_boot_nonce = ? AND state = 'requested'`)
      .run(JSON.stringify(rootIdentity), JSON.stringify(containmentIdentity), activatedAt, instanceId, ownerClientId, this.bootNonce);
    return Number(result.changes) === 1;
  }

  beginLaunchInstanceStop(instanceId: LaunchInstanceId, ownerClientId: string, stoppingAt: string): boolean {
    if (this.bootNonce === null) throw new Error("launch instance storage requires a supervisor boot identity");
    const result = this.database.prepare(`UPDATE launch_instances SET state = 'stopping', stopping_at = ?
      WHERE id = ? AND owner_client_id = ? AND owner_boot_nonce = ? AND state = 'active'`)
      .run(stoppingAt, instanceId, ownerClientId, this.bootNonce);
    return Number(result.changes) === 1;
  }

  completeLaunchInstance(
    instanceId: LaunchInstanceId,
    ownerClientId: string,
    terminalState: "completed" | "interrupted",
    outcome: LaunchInstanceOutcome,
    completedAt: string,
  ): boolean {
    if (this.bootNonce === null) throw new Error("launch instance storage requires a supervisor boot identity");
    assertLaunchInstanceOutcome(outcome);
    if (terminalState === "completed" && outcome.kind === "interrupted") throw new Error("completed launch instance cannot carry an interrupted outcome");
    if (terminalState === "interrupted" && outcome.kind !== "interrupted" && outcome.kind !== "cleanup-error") {
      throw new Error("interrupted launch instance requires an interrupted or cleanup-error outcome");
    }
    const result = this.database.prepare(`UPDATE launch_instances
      SET state = ?, completed_at = ?, outcome_json = ?
      WHERE id = ? AND owner_client_id = ? AND owner_boot_nonce = ? AND state IN ('requested', 'active', 'stopping')`)
      .run(terminalState, completedAt, JSON.stringify(outcome), instanceId, ownerClientId, this.bootNonce);
    return Number(result.changes) === 1;
  }

  loadActiveLaunchInstances(): LaunchInstance[] {
    return (this.database.prepare(`SELECT * FROM launch_instances
      WHERE state IN ('requested', 'active', 'stopping') ORDER BY created_at, id`).all() as unknown as LaunchInstanceRow[])
      .map(launchInstanceFromRow);
  }

  loadLaunchInstance(instanceId: LaunchInstanceId): LaunchInstance | null {
    const row = this.database.prepare("SELECT * FROM launch_instances WHERE id = ?").get(instanceId) as LaunchInstanceRow | undefined;
    return row ? launchInstanceFromRow(row) : null;
  }

  reconcilePriorBootLaunchInstances(bootNonce: string, reconciledAt = new Date().toISOString()): number {
    const outcome: LaunchInstanceOutcome = {
      kind: "interrupted",
      reason: "supervisor-disconnect",
      message: "launch instance ownership ended with a prior supervisor boot",
    };
    const result = this.database.prepare(`UPDATE launch_instances
      SET state = 'interrupted', completed_at = ?, outcome_json = ?
      WHERE state IN ('requested', 'active', 'stopping') AND owner_boot_nonce <> ?`)
      .run(reconciledAt, JSON.stringify(outcome), bootNonce);
    return Number(result.changes);
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

function launchInstanceFromRow(row: LaunchInstanceRow): LaunchInstance {
  const instance: LaunchInstance = {
    id: row.id,
    ownerClientId: row.owner_client_id,
    profileId: row.profile_id,
    state: row.state,
    shutdownPolicy: row.shutdown_policy,
    guardianIdentity: JSON.parse(row.guardian_identity_json) as NativeProcessIdentity,
    rootIdentity: row.root_identity_json ? JSON.parse(row.root_identity_json) as NativeProcessIdentity : null,
    containmentIdentity: row.containment_identity_json ? JSON.parse(row.containment_identity_json) as ProcessContainmentIdentity : null,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    stoppingAt: row.stopping_at,
    completedAt: row.completed_at,
    outcome: row.outcome_json ? JSON.parse(row.outcome_json) as LaunchInstanceOutcome : null,
  };
  assertLaunchInstance(instance);
  return instance;
}
