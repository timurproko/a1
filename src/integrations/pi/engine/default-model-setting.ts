import type { SettingsManager } from "../startup-public.js";
import type { AgentSettingChangeOutcome, AgentSettingDescriptor } from "../../../contracts/agent-engine/index.js";
interface DefaultModelChoice {
  readonly key: string;
  readonly label: string;
  readonly name: string;
}

const DEFAULT_MODEL_SETTING_KEY = "defaultModel";
export const SUPPLEMENTAL_SETTING_KEYS = [DEFAULT_MODEL_SETTING_KEY] as const;
const UNSET = "not set";

function read(settings: SettingsManager): string {
  const provider = settings.getDefaultProvider();
  const model = settings.getDefaultModel();
  return provider && model ? `${provider}/${model}` : UNSET;
}

export function defaultModelDescriptor(
  settings: SettingsManager,
  models: readonly DefaultModelChoice[],
): AgentSettingDescriptor {
  const value = read(settings);
  return {
    key: DEFAULT_MODEL_SETTING_KEY,
    valueType: "enum",
    writable: true,
    application: "next-session",
    owner: "startup",
    available: true,
    limitationReason: null,
    storedValue: value,
    effectiveValue: value,
    choices: models.map(model => model.key),
    flags: models.map(model => ({
      key: model.key, label: model.label, description: model.name, fallback: false,
    })),
    label: "Default model",
    description: "Model used when a new session starts",
    resolvedWhenRead: true,
  };
}

export async function writeDefaultModel(
  settings: SettingsManager,
  models: readonly DefaultModelChoice[],
  value: unknown,
): Promise<AgentSettingChangeOutcome> {
  if (typeof value !== "string" || !models.some(model => model.key === value)) {
    throw new TypeError("setting value is invalid: defaultModel");
  }
  const previous = read(settings);
  const at = value.indexOf("/");
  settings.setDefaultModelAndProvider(value.slice(0, at), value.slice(at + 1));
  try {
    await settings.flush();
    const errors = settings.drainErrors();
    if (errors.length > 0) throw new Error(errors.map(item => item.error.message).join("; "));
    return {
      status: "deferred", application: "next-session", storedValue: value, effectiveValue: previous,
      failure: null, limitationReason: null,
    };
  } catch (error) {
    let failure = error instanceof Error ? error.message : String(error);
    try {
      if (previous === UNSET) await settings.reload();
      else {
        const split = previous.indexOf("/");
        settings.setDefaultModelAndProvider(previous.slice(0, split), previous.slice(split + 1));
        await settings.flush();
        const errors = settings.drainErrors();
        if (errors.length > 0) throw new Error(errors.map(item => item.error.message).join("; "));
      }
    } catch (rollbackError) {
      failure += `; persistence rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`;
    }
    const restored = read(settings);
    return {
      status: "failed", application: "next-session", storedValue: restored, effectiveValue: previous,
      failure, limitationReason: null,
    };
  }
}
