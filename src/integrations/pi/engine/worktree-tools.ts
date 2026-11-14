import {
  createBashToolDefinition, createEditToolDefinition, createFindToolDefinition,
  createGrepToolDefinition, createLsToolDefinition, createReadToolDefinition, createWriteToolDefinition,
  defineTool, type ToolDefinition, type AgentSessionServices, type SessionManager,
} from "../startup-public.js";

export type PiWorktreeCwdReader = ((sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>) & {
  /** Settles work a finished shell command left for the runtime; the text is appended to that command's result. */
  readonly settleShell?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string | null>;
  /** Explicit owner-verified recovery; never resolves or validates the attached Git cwd. */
  readonly detach?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>;
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
  ];
}

/** Built-in tool definitions borrow the current attachment per call, without process-global chdir. */
export function createSessionWorktreeTools(
  startupCwd: string,
  resolveCwd: (signal?: AbortSignal) => Promise<string>,
  settleShell?: (signal?: AbortSignal) => Promise<string | null>,
  detach?: (signal?: AbortSignal) => Promise<string>,
): ToolDefinition[] {
  function wrap<T extends ToolDefinition["parameters"], D, S>(factory: (cwd: string) => ToolDefinition<T, D, S>) {
    const definition = factory(startupCwd);
    return defineTool<T, D, S>({
      ...definition,
      ...(definition.name === "bash" ? { promptGuidelines: [
        ...(definition.promptGuidelines ?? []),
        "For task worktrees, use a1 worktree enter <branch> or a1 worktree attach <absolute-path>; success confirms attachment and subsequent built-in tools use that root. a1 worktree detach preserves files. After a verified merge run a1 worktree complete instead of cleaning the attached checkout yourself; it returns this session to the startup checkout first and reports the repository cleanup result. Coordination and recovery are internal; no follow-up inventory check is required.",
      ] } : {}),
      defaultActive: false,
      async execute(...args: Parameters<ToolDefinition<T, D, S>["execute"]>) {
        const [id, params, signal, onUpdate, context] = args;
        const cwd = await resolveCwd(signal);
        signal?.throwIfAborted();
        if (definition.name !== "bash" || settleShell === undefined) return await factory(cwd).execute(id, params, signal, onUpdate, { ...context, cwd });
        // Invariant: the shell has exited before settlement, so it no longer pins the checkout it was started in.
        const settle = () => settleShell(signal).catch(error => `Worktree completion could not be settled: ${error instanceof Error ? error.message : String(error)}`);
        let result: Awaited<ReturnType<ToolDefinition<T, D, S>["execute"]>>;
        try {
          result = await factory(cwd).execute(id, params, signal, onUpdate, { ...context, cwd });
        } catch (error) {
          const settled = await settle();
          if (settled !== null && error instanceof Error) error.message = `${error.message}\n\n${settled}`;
          throw error;
        }
        const settled = await settle();
        return settled === null ? result : { ...result, content: [...result.content, { type: "text" as const, text: settled }] };
      },
    });
  }
  // Compatibility: defineTool preserves schema inference through the SDK's heterogeneous collection.
  return [
    wrap(createReadToolDefinition), wrap(createBashToolDefinition), wrap(createEditToolDefinition), wrap(createWriteToolDefinition),
    wrap(createGrepToolDefinition), wrap(createFindToolDefinition), wrap(createLsToolDefinition),
    ...(detach === undefined ? [] : [defineTool({
      name: "worktree_detach",
      label: "Detach worktree",
      description: "Explicitly detach this session's worktree without deleting files or branches. Works even when attachment validation blocks ordinary tools. Accepts no target session, path or shell command.",
      promptSnippet: "Detach this session's worktree, including recovery when ordinary tools cannot validate its cwd",
      promptGuidelines: ["Use worktree_detach only when explicitly requested or switching tasks; it preserves files and branches. For cleanup after a verified merge, use a1 worktree complete instead. Never force attachment using Git environment overrides."],
      parameters: { type: "object", properties: {}, additionalProperties: false },
      executionMode: "sequential",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      async execute(_id, _params, signal) {
        signal?.throwIfAborted();
        const cwd = await detach(signal);
        return { content: [{ type: "text", text: `Session worktree context cleared. Subsequent tools use ${cwd}. No files or branches were deleted.` }], details: { cwd } };
      },
    })]),
  ];
}
