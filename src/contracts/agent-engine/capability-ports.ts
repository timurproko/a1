import type { AgentJsonValue, AgentSettingChangeOutcome, AgentSettingDescriptor } from "./domain.js";

export interface AgentSettingsPort {
  readonly capabilities: { readonly write: boolean; readonly flush: boolean };
  listSettings(): Promise<readonly AgentSettingDescriptor[]>;
  readSetting(key: string): Promise<AgentJsonValue | undefined>;
  writeSetting?(key: string, value: AgentJsonValue): Promise<AgentSettingChangeOutcome>;
  flush?(): Promise<void>;
}
