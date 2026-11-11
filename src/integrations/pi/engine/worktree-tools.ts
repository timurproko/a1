import {
  createBashToolDefinition, createEditToolDefinition, createFindToolDefinition,
  createGrepToolDefinition, createLsToolDefinition, createReadToolDefinition, createWriteToolDefinition,
  type ToolDefinition,
} from "../startup-public.js";

export type PiWorktreeCwdReader = (sessionId: string, sessionFile: string, signal: AbortSignal) => Promise<string>;

/** Built-in tool definitions borrow the current attachment per call, without process-global chdir. */
export function createSessionWorktreeTools(
  startupCwd: string,
  resolveCwd: (signal?: AbortSignal) => Promise<string>,
): ToolDefinition[] {
  function wrap<T extends ToolDefinition["parameters"], D, S>(factory: (cwd: string) => ToolDefinition<T, D, S>): ToolDefinition<T, D, S> {
    const definition = factory(startupCwd);
    return {
      ...definition,
      ...(definition.name === "bash" ? { promptGuidelines: [
        ...(definition.promptGuidelines ?? []),
        "For task worktrees, use a1 worktree enter <branch> or a1 worktree attach <absolute-path>; success confirms attachment and subsequent built-in tools use that root. a1 worktree detach preserves files. Coordination and recovery are internal; no follow-up inventory check is required.",
      ] } : {}),
      defaultActive: false,
      async execute(...args: Parameters<ToolDefinition<T, D, S>["execute"]>) {
        const [id, params, signal, onUpdate, context] = args;
        const cwd = await resolveCwd(signal);
        signal?.throwIfAborted();
        return await factory(cwd).execute(id, params, signal, onUpdate, { ...context, cwd });
      },
    };
  }
  // Compatibility: the SDK collection erases schemas; each wrapper retains its typed implementation.
  return [
    wrap(createReadToolDefinition), wrap(createBashToolDefinition), wrap(createEditToolDefinition), wrap(createWriteToolDefinition),
    wrap(createGrepToolDefinition), wrap(createFindToolDefinition), wrap(createLsToolDefinition),
  ] as unknown as ToolDefinition[];
}
