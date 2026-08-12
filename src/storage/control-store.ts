import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  AgentId,
  GenerationId,
  LifecycleState,
  LogicalTerminalAgent,
  LogicalWorkspace,
  NativePiProfile,
  ProcessGeneration,
  TerminalSurface,
  WorkspaceId,
} from "../domain/index.js";

const INITIAL_WORKSPACE_ID = "workspace-default";

interface WorkspaceRow { id: string; name: string; selected_agent_id: string | null; created_at: string }
interface AgentRow { id: string; workspace_id: string; name: string; profile_json: string; surface_json: string | null; created_at: string }
interface GenerationRow { id: string; agent_id: string; sequence: number; profile_id: string; state: LifecycleState; capabilities_json: string; started_at: string; exited_at: string | null; exit_code: number | null; signal: number | null; error: string | null; owner_boot_nonce: string | null }

export class ControlStore {
  readonly database: DatabaseSync;

  constructor(path: string, readonly bootNonce: string | null = null) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA foreign_keys = ON");
    this.migrate();
    if (bootNonce !== null) this.reconcilePriorBootGenerations(bootNonce);
  }

  migrate(): void {
    const versionRow = this.database.prepare("PRAGMA user_version").get() as { user_version: number };
    const version = versionRow.user_version;
    if (version > 1) throw new Error(`control database version ${version} is newer than supported version 1`);
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
    if (version === 1) {
      const columns = this.database.prepare("PRAGMA table_info(process_generations)").all() as unknown as { name: string }[];
      if (!columns.some(column => column.name === "owner_boot_nonce")) {
        this.database.exec("ALTER TABLE process_generations ADD COLUMN owner_boot_nonce TEXT");
      }
      this.database.exec("CREATE INDEX IF NOT EXISTS idx_generations_owner_boot ON process_generations(owner_boot_nonce, state)");
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

  loadWorkspace(): LogicalWorkspace {
    const row = this.database.prepare("SELECT * FROM workspaces ORDER BY created_at LIMIT 1").get() as WorkspaceRow | undefined;
    if (!row) throw new Error("control database has no workspace");
    const agents = this.database.prepare("SELECT id FROM terminal_agents WHERE workspace_id = ? ORDER BY created_at").all(row.id) as { id: string }[];
    return {
      id: row.id,
      name: row.name,
      selectedAgentId: row.selected_agent_id,
      agentIds: agents.map(agent => agent.id),
      createdAt: row.created_at,
    };
  }

  loadAgents(): LogicalTerminalAgent[] {
    const rows = this.database.prepare("SELECT * FROM terminal_agents ORDER BY created_at").all() as unknown as AgentRow[];
    return rows.map(row => {
      const generation = this.database.prepare("SELECT * FROM process_generations WHERE agent_id = ? ORDER BY sequence DESC LIMIT 1").get(row.id) as GenerationRow | undefined;
      if (!generation) throw new Error(`agent ${row.id} has no generation`);
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        driverKind: "terminal",
        profile: JSON.parse(row.profile_json) as NativePiProfile,
        currentGeneration: generationFromRow(generation),
        surface: row.surface_json ? JSON.parse(row.surface_json) as TerminalSurface : null,
        createdAt: row.created_at,
      };
    });
  }

  createTerminalAgent(agent: LogicalTerminalAgent): void {
    this.#transaction(() => {
      this.database.prepare("INSERT INTO driver_profiles (id, kind, profile_json, created_at) VALUES (?, 'native-pi', ?, ?)")
        .run(agent.profile.id, JSON.stringify(agent.profile), agent.createdAt);
      this.database.prepare("INSERT INTO terminal_agents (id, workspace_id, name, profile_id, profile_json, surface_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)")
        .run(agent.id, agent.workspaceId, agent.name, agent.profile.id, JSON.stringify(agent.profile), agent.createdAt);
      const generation = agent.currentGeneration;
      this.database.prepare(`INSERT INTO process_generations
        (id, agent_id, sequence, profile_id, state, capabilities_json, started_at, exited_at, exit_code, signal, error, owner_boot_nonce)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)`)
        .run(generation.id, agent.id, generation.sequence, generation.profileId, generation.state, JSON.stringify(generation.capabilities), generation.startedAt, this.bootNonce);
      this.database.prepare("UPDATE workspaces SET selected_agent_id = ? WHERE id = ?").run(agent.id, agent.workspaceId);
    });
  }

  saveSurface(agentId: AgentId, generationId: GenerationId, surface: TerminalSurface): boolean {
    const current = this.database.prepare("SELECT id FROM process_generations WHERE agent_id = ? ORDER BY sequence DESC LIMIT 1").get(agentId) as { id: string } | undefined;
    if (current?.id !== generationId) return false;
    this.database.prepare("UPDATE terminal_agents SET surface_json = ? WHERE id = ?").run(JSON.stringify(surface), agentId);
    return true;
  }

  markGeneration(
    agentId: AgentId,
    generationId: GenerationId,
    state: LifecycleState,
    details: { exitCode?: number | null; signal?: number | null; error?: string | null } = {},
  ): boolean {
    const terminal = state === "exited" || state === "stopped" || state === "interrupted" || state === "error";
    const result = this.database.prepare(`UPDATE process_generations
      SET state = ?, exited_at = ?, exit_code = ?, signal = ?, error = ?
      WHERE id = ? AND agent_id = ? AND id = (SELECT id FROM process_generations WHERE agent_id = ? ORDER BY sequence DESC LIMIT 1)`)
      .run(state, terminal ? new Date().toISOString() : null, details.exitCode ?? null, details.signal ?? null, details.error ?? null, generationId, agentId, agentId);
    return Number(result.changes) === 1;
  }

  selectAgent(workspaceId: WorkspaceId, agentId: AgentId | null): void {
    this.database.prepare("UPDATE workspaces SET selected_agent_id = ? WHERE id = ?").run(agentId, workspaceId);
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

function generationFromRow(row: GenerationRow): ProcessGeneration {
  return {
    id: row.id,
    agentId: row.agent_id,
    sequence: row.sequence,
    profileId: row.profile_id,
    state: row.state,
    capabilities: JSON.parse(row.capabilities_json) as ProcessGeneration["capabilities"],
    startedAt: row.started_at,
    exitedAt: row.exited_at,
    exitCode: row.exit_code,
    signal: row.signal,
    error: row.error,
    ownerBootNonce: row.owner_boot_nonce,
  };
}
