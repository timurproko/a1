import type { LoadExtensionsResult, ProjectTrustContext, ProjectTrustStore } from "../startup-public.js";

/** Dispatch only public global/CLI registrations; project factories cannot decide their own admission. */
export async function resolveExtensionProjectTrust(options: {
  readonly cwd: string;
  readonly extensionsResult?: LoadExtensionsResult;
  readonly trustUi?: Pick<ProjectTrustContext, "hasUI" | "ui">;
}, trustStore: ProjectTrustStore): Promise<{ readonly trusted: boolean; readonly source: "extension" | "fail-closed"; readonly diagnostic: string | null } | undefined> {
  const context: ProjectTrustContext = {
    cwd: options.cwd, mode: options.trustUi?.hasUI ? "tui" : "print",
    hasUI: options.trustUi?.hasUI ?? false,
    ui: options.trustUi?.ui ?? { select: async () => undefined, confirm: async () => false, input: async () => undefined, notify() {} },
  };
  // Snapshot before awaiting: handlers cannot register another handler for this emission.
  const handlers = options.extensionsResult?.extensions.flatMap(extension => [...(extension.handlers.get("project_trust") ?? [])]) ?? [];
  for (const handler of handlers) {
    try {
      const result = await handler({ type: "project_trust", cwd: options.cwd }, context);
      if (typeof result !== "object" || result === null || !("trusted" in result)) throw new Error("Invalid project trust decision");
      if (result.trusted === "undecided") continue;
      if (result.trusted !== "yes" && result.trusted !== "no") throw new Error("Invalid project trust decision");
      const trusted = result.trusted === "yes";
      if ("remember" in result && result.remember === true) trustStore.set(options.cwd, trusted);
      return { trusted, source: "extension", diagnostic: null };
    } catch (error) {
      if (error instanceof Error && error.name === "ProjectTrustPromptExitError") throw error;
      // Fail closed without copying handler error payloads (which can contain credentials).
      return { trusted: false, source: "fail-closed", diagnostic: `Project resources in ${options.cwd} were withheld because an extension trust handler failed` };
    }
  }
  return undefined;
}
