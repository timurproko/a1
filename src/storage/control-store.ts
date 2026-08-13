import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  ForegroundTerminalLease,
  ForegroundTerminalLeaseId,
  GenerationId,
  NativeProcessIdentity,
  TransparentTerminalLifecycleOutcome,
} from "../domain/index.js";

const INITIAL_WORKSPACE_ID = "workspace-default";

interface ForegroundLeaseRow { id: string; owner_id: string; profile_json: string; state: ForegroundTerminalLease["state"]; generation_id: string | null; process_identity_json: string | null; acquired_at: string; heartbeat_at: string | null; released_at: string | null; outcome_json: string | null; owner_boot_nonce: string }

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
    if (version > 2) throw new Error(`control database version ${version} is newer than supported version 2`);
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
