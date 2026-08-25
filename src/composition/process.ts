import {
  assertAgentCapabilityContract,
  type AgentEnginePort,
} from "../foundation/agent-engine-contracts/index.js";
import { createPiEngineAdapter, type PiEngineAdapter } from "../foundation/pi-engine-adapter/index.js";
import { createPiPresentationRuntime } from "../foundation/pi-tui-runtime-adapter/index.js";
import {
  assertPresentationComponent,
  assertPresentationRuntime,
  type PresentationComponentPort,
  type PresentationRuntimePort,
  type PresentationTerminalPort,
} from "../foundation/presentation-contracts/index.js";
import { createPiAgentEngineBridge } from "./agent-engine-bridge.js";

export interface ProcessCompositionOptions {
  readonly cwd?: string;
  readonly sessionId?: string;
  readonly engine?: AgentEnginePort;
  readonly presentationFactory?: (root: PresentationComponentPort, terminal: PresentationTerminalPort) => PresentationRuntimePort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
}

export interface ProcessComposition {
  readonly engine: AgentEnginePort;
  createPresentation(root: PresentationComponentPort, terminal: PresentationTerminalPort): PresentationRuntimePort;
  dispose(): Promise<void>;
}

export async function composeProcess(options: ProcessCompositionOptions = {}): Promise<ProcessComposition> {
  let engine = options.engine;
  if (!engine) {
    const adapter = options.createPiAdapter
      ? await options.createPiAdapter()
      : await createPiEngineAdapter({
        ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
        ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
      });
    engine = createPiAgentEngineBridge(adapter, options.cwd ?? process.cwd());
  }
  assertAgentCapabilityContract(engine.capabilities);
  if (typeof engine.createSession !== "function" || typeof engine.dispose !== "function") throw new TypeError("composed engine does not satisfy the neutral engine port");
  const presentations = new Set<PresentationRuntimePort>();
  let disposed = false;
  return {
    engine,
    createPresentation(root, terminal) {
      if (disposed) throw new Error("process composition is disposed");
      assertPresentationComponent(root);
      const runtime = options.presentationFactory?.(root, terminal) ?? createPiPresentationRuntime(root, terminal);
      assertPresentationRuntime(runtime);
      presentations.add(runtime);
      return runtime;
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      const failures: unknown[] = [];
      for (const runtime of [...presentations].reverse()) await runtime.stop().catch(error => failures.push(error));
      await engine.dispose().catch(error => failures.push(error));
      if (failures.length) throw new AggregateError(failures, "process composition disposal failed");
    },
  };
}
