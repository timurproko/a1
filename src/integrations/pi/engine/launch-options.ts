import { resolveCliModel, type AgentSessionServices } from "../startup-public.js";
import type { RuntimeLaunchOptions } from "../../../foundation/launch-context/index.js";

/** Reject failed explicit resources/flags rather than start a partially configured worker. */
export function assertPiInvocationResources(services: AgentSessionServices, options: RuntimeLaunchOptions): void {
  const failures = [
    ...services.diagnostics.filter(item => item.type === "error").map(item => item.message),
    ...services.resourceLoader.getExtensions().errors.map(item => `${item.path}: ${item.error}`),
  ];
  for (const [name, value] of options.extensionFlagValues ?? []) {
    const registration = services.resourceLoader.getExtensions().extensions.flatMap(extension => [...extension.flags]).find(([key]) => key === name)?.[1];
    if (registration !== undefined && typeof value !== registration.type) failures.push(`Extension flag --${name} requires ${registration.type}; put -- before literal instructions`);
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

/** Use Pi's authoritative model grammar, but never invent an unlisted custom model or change accounts. */
export function resolvePiInvocationModel(services: AgentSessionServices, options: RuntimeLaunchOptions) {
  const selected = resolveCliModel({
    modelRuntime: services.modelRuntime,
    ...(options.model === undefined ? {} : { cliModel: options.model }),
    ...(options.provider === undefined ? {} : { cliProvider: options.provider }),
    ...(options.thinking === undefined ? {} : { cliThinking: options.thinking }),
  });
  if (selected.error) throw new Error(selected.error);
  if (selected.model && !services.modelRuntime.getModels().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new Error(`Requested model is not in the available catalog: ${options.model}`);
  }
  if (selected.model && !services.modelRuntime.getAvailableSnapshot().some(model => model.provider === selected.model!.provider && model.id === selected.model!.id)) {
    throw new Error(`Requested model has no usable authentication in the A1 profile: ${selected.model.provider}/${selected.model.id}`);
  }
  return { model: selected.model, thinkingLevel: options.thinking ?? selected.thinkingLevel };
}
