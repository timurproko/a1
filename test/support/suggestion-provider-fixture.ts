import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdDecompressSync } from "node:zlib";
import {
  createAgentSessionFromServices, createAgentSessionRuntime, createAgentSessionServices,
  ModelRuntime, SessionManager, SettingsManager, VERSION,
  type ExtensionFactory, type AgentSessionRuntime, type ResourceLoader,
} from "@earendil-works/pi-coding-agent";
import { createPiEngineAdapter, type PiEngineAdapter } from "../../src/integrations/pi/engine/index.js";
import type { OwnedUiPromptSuggestionIdentity } from "../../src/contracts/owned-ui/index.js";

/** Synthetic protocol records shared by the network-disabled provider conformance tests. */
export function responseEvents(api: string, id: string, text = "run the tests"): Record<string, unknown>[] {
  if (api === "anthropic-messages") return [
    { type: "message_start", message: { id, type: "message", role: "assistant", model: "fixture", content: [], usage: { input_tokens: 4000, output_tokens: 0, cache_read_input_tokens: 8000, cache_creation_input_tokens: 100 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 12 } },
    { type: "message_stop" },
  ];
  const item = { type: "message", id: `msg_${id}`, role: "assistant", status: "completed", content: [{ type: "output_text", text, annotations: [] }] };
  return [
    { type: "response.created", response: { id, status: "in_progress", output: [] } },
    { type: "response.output_item.added", output_index: 0, item: { ...item, content: [] } },
    { type: "response.content_part.added", item_id: item.id, output_index: 0, content_index: 0, part: { type: "output_text", text: "", annotations: [] } },
    { type: "response.output_text.delta", item_id: item.id, output_index: 0, content_index: 0, delta: text },
    { type: "response.output_item.done", output_index: 0, item },
    { type: "response.completed", response: { id, status: "completed", output: [item], usage: { input_tokens: 12000, output_tokens: 12, input_tokens_details: { cached_tokens: 8000 } } } },
  ];
}

export async function requestBody(request: Request): Promise<Record<string, any>> {
  const bytes = Buffer.from(await request.arrayBuffer());
  return JSON.parse((request.headers.get("content-encoding") === "zstd" ? zstdDecompressSync(bytes) : bytes).toString("utf8"));
}

export function eventResponse(api: string, id: string): Response {
  return new Response(responseEvents(api, id).map(event => `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });
}

export const syntheticCodexKey = `fixture.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "synthetic-account" } })).toString("base64url")}.fixture`;

type FixtureCredentialStore = NonNullable<NonNullable<Parameters<typeof ModelRuntime.create>[0]>["credentials"]>;
export interface SuggestionProviderFixture {
  root: string;
  runtime: AgentSessionRuntime;
  adapter: PiEngineAdapter;
  settings: SettingsManager;
  loader: ResourceLoader;
  modelRuntime: ModelRuntime;
  credentials: FixtureCredentialStore;
  prompt(text?: string): Promise<OwnedUiPromptSuggestionIdentity>;
  identity(): OwnedUiPromptSuggestionIdentity;
  dispose(): Promise<void>;
}

/** Real pinned runtime, isolated credentials/resources, and a built-in API pointed at a non-routable host. */
export async function createSuggestionFixture(options: {
  provider?: "anthropic" | "openai" | "openai-codex";
  blockImages?: boolean;
  budgets?: { high: number };
  extensions?: ExtensionFactory[];
} = {}): Promise<SuggestionProviderFixture> {
  const root = await mkdtemp(join(tmpdir(), "suggestion-parity-"));
  const provider = options.provider ?? "openai";
  const settings = SettingsManager.inMemory({
    lastChangelogVersion: VERSION, transport: "sse", defaultThinkingLevel: "high",
    compaction: { enabled: false }, retry: { enabled: false, provider: { maxRetries: 0 } },
    images: { blockImages: options.blockImages ?? false },
    ...(options.budgets ? { thinkingBudgets: options.budgets } : {}),
  });
  type Store = FixtureCredentialStore;
  type Credential = NonNullable<Awaited<ReturnType<Store["read"]>>>;
  const stored = new Map<string, Credential>();
  let writing = Promise.resolve();
  const credentials: Store = {
    read: async id => stored.get(id),
    list: async () => [...stored].map(([providerId, credential]) => ({ providerId, type: credential.type })),
    async modify(id, update) {
      const operation = writing.then(async () => { const next = await update(stored.get(id)); if (next) stored.set(id, next); return stored.get(id); });
      writing = operation.then(() => {}, () => {});
      return operation;
    },
    async delete(id) { await writing; stored.delete(id); },
  };
  if (provider === "openai-codex") stored.set(provider, { type: "oauth", access: syntheticCodexKey, refresh: "synthetic-refresh", expires: Date.now() + 86400000, accountId: "synthetic-account" });
  const modelRuntime = await ModelRuntime.create({ credentials, modelsPath: null, modelsStorePath: join(root, "catalog.json"), allowModelNetwork: false });
  if (provider !== "openai-codex") await modelRuntime.setRuntimeApiKey(provider, "synthetic-key-never-sent");
  const modelId = provider === "anthropic" ? "claude-sonnet-4-5" : "gpt-5.4";
  const base = modelRuntime.getModel(provider, modelId);
  if (!base) throw new Error("Pinned fixture model missing");
  const model = { ...base, baseUrl: "https://suggestion-fixture.invalid/v1" };
  const services = await createAgentSessionServices({ cwd: root, agentDir: root, settingsManager: settings, modelRuntime, resourceLoaderOptions: {
    noExtensions: true, noSkills: true, noPromptTemplates: true, extensionFactories: options.extensions ?? [],
    systemPromptOverride: () => "Synthetic coding task. Offer to run the tests after making the fix.",
  } });
  const loader = services.resourceLoader;
  const runtime = await createAgentSessionRuntime(async ({ sessionManager }) => ({
    ...await createAgentSessionFromServices({ services, sessionManager, model, thinkingLevel: "high", noTools: "builtin", customTools: [{
      name: "fixture_tool", label: "Fixture", description: "Synthetic schema never executed", parameters: { type: "object", properties: { value: { type: "string" } } },
      constrainedSampling: { type: "json_schema", strict: "prefer" },
      execute: async () => { throw new Error("Suggestion must not execute a tool"); },
    }] }), services, diagnostics: [],
  }), { cwd: root, agentDir: root, sessionManager: SessionManager.inMemory(root) });
  await runtime.session.bindExtensions({ mode: "print" });
  const adapter = await createPiEngineAdapter({ cwd: root, agentDir: root, sessionId: "synthetic-ui-not-cache-key", createRuntime: async () => runtime });
  let identity: OwnedUiPromptSuggestionIdentity | undefined;
  const unsubscribe = adapter.onEvent(event => {
    if (event.type === "assistant-message-completed" && event.model) identity = {
      sessionId: event.sessionId, sessionGeneration: event.sessionGeneration, runSequence: event.runSequence,
      responseSequence: event.responseSequence, model: event.model,
    };
  });
  return {
    root, runtime, adapter, settings, loader, modelRuntime, credentials,
    async prompt(text = "I fixed the synthetic issue. What next?") {
      await runtime.session.prompt(text);
      await adapter.flushEvents();
      const last = runtime.session.messages.at(-1);
      if (last?.role !== "assistant" || last.stopReason !== "stop") throw new Error(`Synthetic primary failed: ${last?.role === "assistant" ? last.errorMessage ?? last.stopReason : "no assistant"}`);
      if (!identity) throw new Error("No completed fixture response");
      return identity;
    },
    identity: () => { if (!identity) throw new Error("No completed fixture response"); return identity; },
    async dispose() { unsubscribe(); await adapter.dispose(); await rm(root, { recursive: true, force: true }); },
  };
}
