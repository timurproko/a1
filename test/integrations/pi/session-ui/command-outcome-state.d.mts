import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import type { PiWorkflowHost } from "../../../../src/integrations/pi/engine/index.js";

export interface CommandOutcomeFixtureState {
  readonly runtime: AgentSessionRuntime;
  readonly host: PiWorkflowHost;
}

export function createCommandOutcomeState(
  home: string,
  entry: { readonly command: string; readonly condition?: string },
  api: typeof import("@earendil-works/pi-coding-agent"),
): CommandOutcomeFixtureState;
