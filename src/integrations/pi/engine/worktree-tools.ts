import {
  createBashToolDefinition, createEditToolDefinition, createFindToolDefinition,
  createGrepToolDefinition, createLsToolDefinition, createReadToolDefinition, createWriteToolDefinition,
  defineTool, type ToolDefinition, type AgentSessionServices, type SessionManager,
} from "../startup-public.js";
import type { WorktreeControlRequest as SessionWorktreeControlRequest, WorktreeControlOutcome as SessionWorktreeControlOutcome } from "../../../contracts/agent-engine/index.js";

export type PiWorktreeCwdReader = ((sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>) & {
  /** Settles work a finished shell command left for the runtime; the text is appended to that command's result. */
  readonly settleShell?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string | null>;
  /** Explicit owner-verified recovery; never resolves or validates the attached Git cwd. */
  readonly detach?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>;
  readonly takeControl?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<SessionWorktreeControlRequest | null>;
  readonly applyControl?: (sessionId: string, sessionFile: string, request: SessionWorktreeControlRequest, prepareContext: (cwd: string) => Promise<void>, signal: AbortSignal, repositoryTrusted?: (primaryRoot: string) => Promise<boolean>) => Promise<SessionWorktreeControlOutcome>;
  readonly control?: (request: SessionWorktreeControlRequest, signal: AbortSignal) => Promise<{ readonly text: string; readonly queued: boolean }>;
  readonly transitionPending?: () => boolean;
};

/** Each replacement gets its own identity; memory sessions use cwd without inventing a file claim. */
export function runtimeWorktreeToolArguments(services: AgentSessionServices, manager: SessionManager, reader: PiWorktreeCwdReader, hostSignal?: AbortSignal): Parameters<typeof createSessionWorktreeTools> {
  const file = manager.getSessionFile(), id = manager.getSessionId();
  const signalFor = (signal?: AbortSignal) => signal ?? hostSignal ?? new AbortController().signal;
  return [services.cwd,
    signal => file === undefined ? Promise.resolve(services.cwd) : reader(id, file, signalFor(signal)),
    file === undefined || reader.settleShell === undefined ? undefined : signal => reader.settleShell!(id, file, signalFor(signal)),
    reader.detach === undefined ? undefined : async signal => {
      if (file === undefined) throw new Error("Worktree attachment requires a persistent session file; --no-session is in memory");
      return await reader.detach!(id, file, signalFor(signal));
    },
    reader.control === undefined ? undefined : (request, signal) => reader.control!(request, signalFor(signal)),
    reader.transitionPending,
  ];
}

/** Built-in tool definitions borrow the current attachment per call, without process-global chdir. */
export function createSessionWorktreeTools(
  startupCwd: string,
  resolveCwd: (signal?: AbortSignal) => Promise<string>,
  settleShell?: (signal?: AbortSignal) => Promise<string | null>,
  detach?: (signal?: AbortSignal) => Promise<string>,
  control?: (request: SessionWorktreeControlRequest, signal?: AbortSignal) => Promise<{ readonly text: string; readonly queued: boolean }>,
  transitionPending?: () => boolean,
): ToolDefinition[] {
  function wrap<T extends ToolDefinition["parameters"], D, S>(factory: (cwd: string) => ToolDefinition<T, D, S>) {
    const definition = factory(startupCwd);
    return defineTool<T, D, S>({
      ...definition,
      ...(definition.name === "bash" ? { promptGuidelines: [
        ...(definition.promptGuidelines ?? []),
        "Prefer the worktree control tool for task attachment from any location. Shell alternatives are a1 worktree enter <branch> [--repo <absolute-path>] and a1 worktree attach <absolute-path>. A queued request is not attachment success: the runtime confirms it after target trust and project-resource reload. Detach preserves files. After a verified merge use worktree complete or a1 worktree complete instead of cleaning the attached checkout yourself; tools return to startup and cleanup runs from the selected primary checkout. No follow-up inventory check is required.",
      ] } : {}),
      defaultActive: false,
      ...(definition.name === "bash" && control !== undefined ? { executionMode: "sequential" as const } : {}),
      async execute(...args: Parameters<ToolDefinition<T, D, S>["execute"]>) {
        const [id, params, signal, onUpdate, context] = args;
        const cwd = await resolveCwd(signal);
        signal?.throwIfAborted();
        if (definition.name !== "bash" || settleShell === undefined) return await factory(cwd).execute(id, params, signal, onUpdate, { ...context, cwd });
        // Invariant: the shell has exited before settlement, so it no longer pins the checkout it was started in.
        const settle = () => settleShell(signal).catch(error => `Worktree request could not be settled: ${error instanceof Error ? error.message : String(error)}`);
        let result: Awaited<ReturnType<ToolDefinition<T, D, S>["execute"]>>;
        try {
          result = await factory(cwd).execute(id, params, signal, onUpdate, { ...context, cwd });
        } catch (error) {
          const settled = await settle();
          if (settled !== null && error instanceof Error) error.message = `${error.message}\n\n${settled}`;
          throw error;
        }
        const settled = await settle();
        return { ...result, ...(transitionPending?.() ? { terminate: true } : {}),
          ...(settled === null ? {} : { content: [...result.content, { type: "text" as const, text: settled }] }) };
      },
    });
  }
  // Compatibility: defineTool preserves schema inference through the SDK's heterogeneous collection.
  return [
    wrap(createReadToolDefinition), wrap(createBashToolDefinition), wrap(createEditToolDefinition), wrap(createWriteToolDefinition),
    wrap(createGrepToolDefinition), wrap(createFindToolDefinition), wrap(createLsToolDefinition),
    ...(control === undefined ? [] : [defineTool({
      name: "worktree",
      label: "Worktree context",
      description: "Manage this session's task worktree from any location. Mutations finish after this tool batch, reload trusted project context, and preserve conversation. Results are bounded to 256 inventory entries.",
      promptSnippet: "Attach, enter, detach, inspect, or complete a task worktree from any location",
      promptGuidelines: ["Use worktree attach with an absolute path or worktree enter with repo when no repository is selected. Use worktree status for context health. Mutations reload project instructions, settings, skills and extensions after trust resolution. Use complete only after a verified merge; detach preserves files and branches."],
      parameters: { type: "object", properties: {
        action: { type: "string", enum: ["attach", "enter", "detach", "status", "list", "complete"] },
        path: { type: "string" }, branch: { type: "string" }, repo: { type: "string" }, base: { type: "string" },
        change: { type: "string" }, pr: { type: "integer", minimum: 1 },
      }, required: ["action"], additionalProperties: false } as const,
      executionMode: "sequential",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      async execute(_id, params, signal) {
        signal?.throwIfAborted();
        const { action, path, branch, repo, base, change, pr } = params;
        if (!["attach", "enter", "detach", "status", "list", "complete"].includes(action)) throw new Error("unknown worktree action");
        const allowed = action === "attach" ? ["action", "path"] : action === "enter" ? ["action", "branch", "repo", "base"]
          : action === "list" ? ["action", "repo"] : action === "complete" ? ["action", "change", "pr"] : ["action"];
        if (Object.keys(params).some(key => !allowed.includes(key))) throw new Error("unexpected arguments for worktree action");
        let request: SessionWorktreeControlRequest;
        if (action === "attach") {
          if (!path) throw new Error("attach requires an absolute path");
          request = { action: "link-worktree", path };
        } else if (action === "enter") {
          if (!branch) throw new Error("enter requires a branch");
          request = { action: "enter-worktree", branch, ...(repo === undefined ? {} : { repo }), ...(base === undefined ? {} : { base }) };
        } else if (action === "list") request = { action: "worktrees", ...(repo === undefined ? {} : { repo }) };
        else if (action === "complete") request = { action: "complete-worktree", ...(change === undefined ? {} : { change }), ...(pr === undefined ? {} : { pr }) };
        else request = { action: action === "detach" ? "unlink-worktree" : "worktree-status" };
        const result = await control(request, signal);
        return { content: [{ type: "text", text: result.text }], details: { queued: result.queued }, ...(result.queued ? { terminate: true } : {}) };
      },
    })]),
    ...(detach === undefined ? [] : [defineTool({
      name: "worktree_detach",
      label: "Detach worktree",
      description: "Request detach and startup project-context reload without deleting files or branches. Works even when attachment validation blocks ordinary tools. Accepts no target session, path or shell command.",
      promptSnippet: "Detach this session's worktree, including recovery when ordinary tools cannot validate its cwd",
      promptGuidelines: ["Use worktree_detach only when explicitly requested or switching tasks; it preserves files and branches. For cleanup after a verified merge, use a1 worktree complete instead. Never force attachment using Git environment overrides."],
      parameters: { type: "object", properties: {}, additionalProperties: false },
      executionMode: "sequential",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      async execute(_id, _params, signal) {
        signal?.throwIfAborted();
        if (control !== undefined) {
          const result = await control({ action: "unlink-worktree" }, signal);
          return { content: [{ type: "text", text: result.text }], details: { queued: true } as { cwd?: string; queued?: boolean }, terminate: true };
        }
        const cwd = await detach(signal);
        return { content: [{ type: "text", text: `Session worktree context cleared. Subsequent tools use ${cwd}. No files or branches were deleted.` }], details: { cwd } };
      },
    })]),
  ];
}
