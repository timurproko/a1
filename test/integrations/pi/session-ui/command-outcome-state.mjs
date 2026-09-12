import { join, dirname } from "node:path";
import { writeFile } from "node:fs/promises";

// Security: all authoritative command state is synthetic and all external effects are injected.
// This module supplies inputs only; it contains no pinned or owned message formatter.
export function createCommandOutcomeState(home, entry, api) {
  const calls = [];
  const exportedFiles = [];
  const condition = entry.condition ?? "success";
  let refreshFinished;
  const refreshed = new Promise(resolve => { refreshFinished = resolve; });
  const failure = () => condition === "non-error" ? "synthetic non-error" : new Error("synthetic failure\n  preserved detail");
  const nameState = { value: condition === "current" ? "existing 日本語 session" : undefined };
  const providerId = condition === "no-default-provider" ? "fixture-provider" : "openai";
  const providerName = condition === "no-default-provider" ? "Fixture Provider" : "OpenAI Codex";
  const selectedModel = { provider: providerId, id: condition === "default-unavailable" ? "alternate-model" : "gpt-5.5", name: "GPT-5.5", api: "openai-responses", reasoning: true, input: ["text"], contextWindow: 128000, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
  const models = condition === "no-models" ? [] : [selectedModel];
  const credentials = new Map(condition === "empty" ? [] : [[providerId, condition === "api-key" ? "api_key" : "oauth"]]);
  const manager = {
    getCwd: () => home, getSessionDir: () => join(home, "sessions"), getSessionFile: () => undefined,
    getSessionName: () => nameState.value, getLeafId: () => condition === "empty" ? null : "entry-1",
    getEntries: () => [], getTree: () => condition === "empty" ? [] : [{ entry: { id: "entry-0", type: "message", parentId: null, timestamp: "2026-01-01T00:00:00.000Z", message: { role: "user", content: condition === "copy-empty" ? "" : "synthetic first prompt", timestamp: 0 } }, children: [{ entry: { id: "entry-1", type: "message", parentId: "entry-0", timestamp: "2026-01-01T00:00:01.000Z", message: { role: "user", content: "synthetic second prompt", timestamp: 1 } }, children: [] }] }], usesDefaultSessionDir: () => true,
    appendLabelChange() {},
  };
  const settingsManager = api.SettingsManager.inMemory({
    outputPad: 1, theme: "dark", quietStartup: true, tuiMode: "regular", fullscreenExitOutput: "resume-hint",
    warnings: { anthropicExtraUsage: false }, treeFilterMode: "default", branchSummary: { skipPrompt: true }, lastChangelogVersion: api.VERSION,
  }, { projectTrusted: false });
  const authMethods = condition === "ambient" ? { apiKey: { name: "Synthetic ambient authentication" } } : { oauth: {}, apiKey: { login() {} } };
  const modelRuntime = {
    getAvailableSnapshot: () => models,
    getModel: (provider, id) => models.find(model => model.provider === provider && model.id === id),
    getProviders: () => condition === "empty" ? [] : [{ id: providerId, name: providerName, auth: authMethods }],
    getProvider: id => id === providerId ? { id, name: providerName, auth: authMethods } : undefined,
    getProviderAuthStatus: () => ({ configured: true, source: "stored" }),
    isUsingOAuth: () => condition !== "api-key", isUsingSubscription: () => false,
    getError: () => condition === "model-config-error" ? "synthetic model configuration failure" : undefined,
    listCredentials: async () => { if (condition === "read-failure") throw failure(); return [...credentials].map(([providerId, type]) => ({ providerId, type })); },
    login: async (provider, type) => {
      calls.push("login");
      if (condition === "ambient") throw new Error("Ambient authentication must not invoke login");
      if (condition === "failure" || condition === "non-error") throw failure();
      if (condition === "cancelled") throw new Error("Login cancelled");
      if (condition === "sync-failure") throw new api.CredentialSynchronizationError(provider, "login", undefined, { cause: new Error("synthetic synchronization failure") });
      credentials.set(provider, type); return { type };
    },
    logout: async provider => {
      calls.push("logout");
      if (condition === "failure" || condition === "non-error") throw failure();
      if (condition === "sync-failure") throw new api.CredentialSynchronizationError(provider, "logout", undefined, { cause: new Error("synthetic synchronization failure") });
      credentials.delete(provider);
    },
    refresh: async (options = {}) => {
      calls.push("refresh");
      state.onRefresh?.();
      refreshFinished();
      if (condition === "refresh-timeout") {
        if (!options.signal) throw new Error("Refresh deadline signal missing");
        state.pendingRefresh = new Promise(resolve => {
          const finish = () => resolve({ aborted: true, errors: new Map() });
          if (options.signal.aborted) finish(); else options.signal.addEventListener("abort", finish, { once: true });
        });
        return state.pendingRefresh;
      }
      if (condition === "refresh-success" && !models.some(model => model.id === "gpt-6")) models.push({ ...selectedModel, id: "gpt-6", name: "GPT-6" });
      if (condition === "refresh-error") throw failure();
      return { aborted: condition === "refresh-aborted", errors: new Map(condition === "refresh-failure" ? [["openai", new Error("synthetic catalog failure")]] : []) };
    },
  };
  const session = {
    sessionId: "command-outcomes", model: ["unknown-model", "no-models", "no-default-provider", "default-unavailable"].includes(condition) || (entry.command === "login" && condition === "selection-failure")
      ? { provider: "unknown", id: "unknown", api: "unknown" } : selectedModel,
    messages: [], thinkingLevel: "off", scopedModels: condition === "scoped" ? [{ model: selectedModel }] : [], steeringMode: "all", followUpMode: "all",
    isStreaming: condition === "streaming", isCompacting: condition === "compacting", isRetrying: false, isIdle: true, autoCompactionEnabled: true,
    getAvailableThinkingLevels: () => ["off", "minimal", "low", "medium", "high", "xhigh"],
    setAutoCompactionEnabled() {}, setThinkingLevel() {}, setSteeringMode() {}, setFollowUpMode() {},
    agent: { transport: "sse", state: { systemPrompt: "synthetic", messages: [], tools: [] } },
    sessionManager: manager, modelRuntime,
    subscribe: () => () => {}, dispose() {}, prompt: async () => { throw new Error("Provider execution forbidden"); },
    setModel: async model => { calls.push("set-model"); if (condition === "selection-failure") throw failure(); session.model = model; },
    setSessionName: value => { calls.push("name"); nameState.value = condition === "normalized" ? "normalized 日本語 session" : value; },
    setScopedModels: value => { session.scopedModels = value; },
    getLastAssistantText: () => condition === "empty" ? undefined : "synthetic answer",
    getUserMessagesForForking: () => condition === "empty" ? [] : [{ entryId: "entry-1", text: "synthetic prompt" }],
    navigateTree: async () => { calls.push("tree"); if (["failure", "non-error"].includes(condition)) throw failure(); return { cancelled: condition === "cancelled", aborted: condition === "aborted" }; },
    getSessionStats: () => ({ sessionId: "command-outcomes", userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, totalMessages: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 }),
    exportToHtml: async path => {
      calls.push("export");
      if (["failure", "non-error", "export-failure"].includes(condition)) throw failure();
      if (entry.command === "share") {
        if (dirname(path) !== join(home, "tmp")) throw new Error("Export outside fixture directory");
        await writeFile(path, "<html>synthetic export fixture</html>");
        exportedFiles.push(path);
      }
      return path ?? "synthetic.html";
    },
    exportToJsonl: path => { calls.push("export-jsonl"); if (["failure", "non-error"].includes(condition)) throw failure(); return path ?? "synthetic.jsonl"; },
    compact: async () => { calls.push("compact"); if (condition === "failure") throw failure(); },
    reload: async options => { calls.push("reload"); if (["failure", "non-error"].includes(condition)) throw failure(); options?.beforeSessionStart?.(); },
    extensionRunner: { getShortcuts: () => new Map(condition === "extensions" ? [["ctrl+alt+j", { description: "Synthetic extension shortcut", extensionPath: "fixture-extension.ts" }], ["alt+u", { extensionPath: "fallback-extension.ts" }]] : []), getRegisteredCommands: () => [], getMarkdownTransformers: () => [] },
  };
  let missingNotified = false;
  const replace = async (_path, options) => {
    calls.push(entry.command);
    const override = typeof options === "string" ? options : options?.cwdOverride;
    if (condition.startsWith("missing-cwd") && override === undefined) {
      if (!missingNotified) { missingNotified = true; state.onMissingCwd?.(); }
      throw new api.MissingSessionCwdError({ sessionCwd: join(home, "missing-cwd"), fallbackCwd: home });
    }
    if (["failure", "non-error"].includes(condition)) throw failure();
    return { cancelled: ["cancelled", "extension-cancelled", "missing-cwd-cancelled"].includes(condition) };
  };
  const resourceLoader = { getSkills: () => ({ skills: [], diagnostics: [] }), getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }), getAgentsFiles: () => ({ agentsFiles: [] }), getExtensions: () => ({ extensions: [], errors: [] }), getSystemPromptSource: () => undefined, getAppendSystemPromptSources: () => [] };
  session.resourceLoader = resourceLoader;
  const runtime = { session, cwd: home, diagnostics: [], services: { settingsManager, modelRuntime, resourceLoader, diagnostics: [], agentDir: join(home, "agent") }, setRebindSession() {}, newSession: replace, switchSession: replace, importFromJsonl: replace, fork: replace, dispose: async () => { calls.push("dispose"); } };
  const state = { session, runtime, manager, settingsManager, modelRuntime, calls, exportedFiles, failure, refreshed, onCancel() {} };
  state.host = {
    copyText: async () => { calls.push("copy"); if (["failure", "non-error", "copy-failure"].includes(condition)) throw failure(); },
    readChangelog: async () => "# Fixture release\n\nSynthetic changelog text.",
    runCommand: async (command, args, options) => {
      if (command !== "gh") throw new Error("Unexpected external command");
      if (args.join(" ") === "auth status") {
        calls.push("auth");
        if (condition === "missing" || condition === "permission") throw Object.assign(new Error("synthetic spawn failure"), { code: condition === "missing" ? "ENOENT" : "EACCES" });
        if (condition === "unauthenticated") throw Object.assign(new Error("synthetic unauthenticated process"), { code: 1, stderr: "not logged in" });
        return { stdout: condition === "auth-stderr" ? "" : "authenticated", stderr: condition === "auth-stderr" ? "authenticated on stderr" : "" };
      }
      if (args[0] !== "gist") throw new Error("Unexpected gh operation");
      calls.push("gist");
      if (["gist-failure", "gist-empty-failure", "gist-signal"].includes(condition)) throw Object.assign(new Error("Command failed: gh gist create\nsynthetic gist failure"), { code: condition === "gist-signal" ? null : 1, signal: condition === "gist-signal" ? "SIGTERM" : null, stderr: condition === "gist-empty-failure" ? "" : "synthetic gist failure\n" });
      if (condition === "gist-spawn-failure") throw new Error("synthetic gist spawn failure");
      if (condition === "gist-non-error") throw "synthetic thrown value";
      if (condition === "cancelled") { state.onCancel(); await new Promise(resolve => setImmediate(resolve)); }
      return { stdout: ["malformed", "malformed-stderr"].includes(condition) ? "" : "https://gist.github.com/fixture/synthetic-id\n", stderr: condition === "malformed-stderr" ? "synthetic warning" : "" };
    },
  };
  return state;
}
