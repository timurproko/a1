import { finiteNumber, isRecord } from "./message-values.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { OwnedUiModelInfo, OwnedUiUsageView } from "../../../contracts/owned-ui/index.js";

/** Token, cost, cache, and context usage summed from the session's entries for the status footer. */
export function readUsageView(session: AgentSession | undefined, runtime: AgentSessionRuntime | undefined, activeModel: OwnedUiModelInfo | null): OwnedUiUsageView {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let cost = 0;
  let latestCacheHitRate: number | null = null;
  let latestPrompt: OwnedUiUsageView["latestPrompt"] = null;
  const entries: readonly unknown[] = session?.sessionManager?.getEntries?.()
    ?? (session?.messages ?? []).map(message => ({ type: "message", message }));
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const message = entry.type === "message" && isRecord(entry.message) ? entry.message : undefined;
    const usage = message !== undefined && isRecord(message.usage)
      ? message.usage
      : (entry.type === "branch_summary" || entry.type === "compaction") && isRecord(entry.usage) ? entry.usage : undefined;
    if (usage === undefined) continue;
    input += finiteNumber(usage.input);
    output += finiteNumber(usage.output);
    cacheRead += finiteNumber(usage.cacheRead);
    cacheWrite += finiteNumber(usage.cacheWrite);
    cost += isRecord(usage.cost) ? finiteNumber(usage.cost.total) : 0;
    if (message?.role === "assistant") {
      latestPrompt = {
        input: finiteNumber(usage.input),
        cacheRead: finiteNumber(usage.cacheRead),
        cacheWrite: finiteNumber(usage.cacheWrite),
      };
      const promptTokens = latestPrompt.input + latestPrompt.cacheRead + latestPrompt.cacheWrite;
      latestCacheHitRate = promptTokens > 0 ? (latestPrompt.cacheRead / promptTokens) * 100 : null;
    }
  }
  const context = session?.getContextUsage?.();
  const providerId = activeModel?.providerId;
  const usingSubscription = providerId === "kimi-coding"
    || (providerId !== undefined && runtime?.services.modelRuntime.isUsingSubscription?.(providerId) === true);
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    cost,
    latestCacheHitRate,
    latestPrompt,
    contextAvailable: context !== undefined,
    contextTokens: context?.tokens ?? null,
    contextWindow: context?.contextWindow ?? 0,
    contextPercent: context?.percent ?? null,
    usingSubscription,
    autoCompactEnabled: runtime?.services.settingsManager?.getCompactionEnabled?.() ?? true,
  };
}
