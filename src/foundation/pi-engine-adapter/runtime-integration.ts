import {
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  SessionManager,
  type AgentSession,
  type AgentSessionRuntime,
  type CreateAgentSessionRuntimeFactory,
} from "@earendil-works/pi-coding-agent";

export interface PiRuntimeIntegrationOptions {
  readonly cwd: string;
  readonly agentDir: string;
  readonly sessionDir?: string;
}

export type PiSessionReplacement =
  | { readonly kind: "new" }
  | { readonly kind: "resume"; readonly sessionPath: string };

export async function createPiRuntimeIntegration(options: PiRuntimeIntegrationOptions): Promise<AgentSessionRuntime> {
  const sessionManager = SessionManager.create(options.cwd, options.sessionDir ?? process.env.PI_CODING_AGENT_SESSION_DIR);
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager: targetSessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd, agentDir: options.agentDir });
    const created = await createAgentSessionFromServices({
      services,
      sessionManager: targetSessionManager,
      ...(sessionStartEvent ? { sessionStartEvent } : {}),
    });
    return { ...created, services, diagnostics: services.diagnostics };
  };
  return createAgentSessionRuntime(createRuntime, {
    cwd: options.cwd,
    agentDir: options.agentDir,
    sessionManager,
  });
}

export function bindPiRuntimeSession(runtime: AgentSessionRuntime, rebind: (session: AgentSession) => Promise<void>): () => void {
  runtime.setRebindSession(rebind);
  return () => runtime.setRebindSession(undefined);
}

export async function replacePiRuntimeSession(runtime: AgentSessionRuntime, replacement: PiSessionReplacement): Promise<{ readonly cancelled: boolean }> {
  return replacement.kind === "new"
    ? runtime.newSession()
    : runtime.switchSession(replacement.sessionPath);
}

export async function disposePiRuntimeIntegration(runtime: AgentSessionRuntime): Promise<void> {
  runtime.setRebindSession(undefined);
  runtime.setBeforeSessionInvalidate(undefined);
  await runtime.dispose();
}
