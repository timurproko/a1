import { createPiRuntimeServicesAfterTrust } from "./runtime-integration.js";
import { assertPiInvocationResources } from "./launch-options.js";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";

/** Catalog discovery creates no AgentSession and never binds session_start/shutdown hooks. */
export async function listPiCompatibleModels(cwd: string, agentDir: string, options: RuntimeLaunchOptions, search?: string): Promise<string[]> {
  const { services } = await createPiRuntimeServicesAfterTrust({ cwd, agentDir, runtimeOptions: options });
  assertPiInvocationResources(services, options);
  const needle = search?.toLowerCase();
  return services.modelRuntime.getAvailableSnapshot()
    .filter(model => (options.provider === undefined || model.provider === options.provider)
      && (needle === undefined || `${model.provider}/${model.id} ${model.name}`.toLowerCase().includes(needle)))
    .map(model => `${model.provider}/${model.id}`)
    .sort();
}
