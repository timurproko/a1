import {
  createBashToolDefinition, createEditToolDefinition, createFindToolDefinition,
  createGrepToolDefinition, createLsToolDefinition, createReadToolDefinition, createWriteToolDefinition,
  defineTool, type ToolDefinition,
} from "../startup-public.js";

export type PiWorktreeCwdReader = ((sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>) & {
  /** Settles work a finished shell command left for the runtime; the text is appended to that command's result. */
  readonly settleShell?: (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string | null>;
};

/** Built-in tool definitions borrow the current attachment per call, without process-global chdir. */
export function createSessionWorktreeTools(
  startupCwd: string,
  resolveCwd: (signal?: AbortSignal) => Promise<string>,
  settleShell?: (signal?: AbortSignal) => Promise<string | null>,
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
  ];
}
