import { describe, expect, it } from "vitest";
import type { AgentSession, AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { OWNED_UI_EXTENSION_UI_CALLBACKS } from "../../../../src/contracts/owned-ui/index.js";
import { PiExtensionUiBinding } from "../../../../src/integrations/pi/engine/extension-ui-binding.js";
import { PiPromptSuggestions } from "../../../../src/integrations/pi/engine/prompt-suggestions.js";
import { PiProviderAuthentication } from "../../../../src/integrations/pi/engine/provider-authentication.js";
import { PiResourceCatalog } from "../../../../src/integrations/pi/engine/resource-catalog.js";
import { PiEngineSettings } from "../../../../src/integrations/pi/engine/settings-port.js";
import { readUsageView } from "../../../../src/integrations/pi/engine/usage-view.js";
import { PiWorkflowContexts } from "../../../../src/integrations/pi/engine/workflow-contexts.js";

const session = (extra: Record<string, unknown> = {}) => ({
  model: { provider: "openai", id: "gpt-5", name: "GPT-5", reasoning: true },
  thinkingLevel: "medium",
  messages: [],
  agent: { state: { messages: [{ role: "user", content: "hi" }], systemPrompt: "sys", tools: [] }, sessionId: "agent-1" },
  getAvailableThinkingLevels: () => ["off", "low", "high"],
  extensionRunner: { getRegisteredCommands: () => [{ name: "deploy", description: "Deploy" }, { name: "pi-deploy", description: "Deploy" }] },
  ...extra,
}) as unknown as AgentSession;

function runtime(extra: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const settings = new Map<string, unknown>([
    ["CompactionEnabled", false], ["ShowImages", true], ["ImageWidthCells", 40], ["ImageAutoResize", true],
    ["BlockImages", false], ["EnableSkillCommands", true], ["HideThinkingBlock", false],
    ["ShowCacheMissNotices", false], ["CollapseChangelog", false], ["EnableInstallTelemetry", false],
    ["QuietStartup", false], ["ShowHardwareCursor", false], ["ClearOnShrink", true],
    ["ShowTerminalProgress", true], ["SteeringMode", "all"], ["FollowUpMode", "all"],
    ["Transport", "sse"], ["MermaidRenderingMode", "off"], ["DefaultProjectTrust", "ask"],
    ["DoubleEscapeAction", "fork"], ["TreeFilterMode", "default"], ["OutputPad", 0],
    ["TuiMode", "fullscreen"], ["FullscreenScrollbar", "auto"], ["HttpIdleTimeoutMs", 5000],
    ["EditorPaddingX", 0], ["AutocompleteMaxVisible", 8], ["ThemeSetting", "dark"],
    ["Warnings", { anthropicExtraUsage: true }],
  ]);
  const value = {
    calls,
    services: {
      modelRuntime: {
        getAvailableSnapshot: () => [{ provider: "openai", id: "gpt-5", name: "GPT-5" }],
        getProviders: () => [{ id: "openai", name: "OpenAI", auth: { apiKey: {} } }],
        getProvider: (id: string) => ({ id, name: "OpenAI" }),
        getProviderAuthStatus: () => ({ configured: true }),
        isUsingOAuth: () => false,
        isUsingSubscription: () => true,
        logout: async (provider: string) => { calls.push(`logout:${provider}`); },
        completeSimple: async (_model: unknown, _context: unknown, options: { signal: AbortSignal }) => {
          calls.push("complete");
          return options.signal.aborted ? { stopReason: "aborted" } : { role: "assistant", stopReason: "stop", content: [{ type: "text", text: "Run the tests?" }] };
        },
      },
      settingsManager: new Proxy<Record<string, unknown>>({}, {
        get: (_target, property) => {
          const name = String(property);
          if (name === "getCompactionEnabled") return () => settings.get("CompactionEnabled");
          if (name === "flush") return async () => {};
          if (name === "drainErrors") return () => [];
          if (name.startsWith("get")) return () => settings.get(name.slice(3));
          if (name.startsWith("set")) return (next: unknown) => { settings.set(name.slice(3), next); calls.push(`${name}:${String(next)}`); };
          return undefined;
        },
      }),
      resourceLoader: {
        getSkills: () => ({ skills: [{ name: "review", description: "Review code", filePath: "D:/skills/review.md" }], diagnostics: ["skill broke"] }),
        getPrompts: () => ({ prompts: [{ name: "plan", argumentHint: "<goal>" }], diagnostics: [] }),
        getAgentsFiles: () => ({ agentsFiles: [{ path: "D:/AGENTS.md" }] }),
        getSystemPromptSource: () => ({ path: "D:/system.md" }),
        getAppendSystemPromptSources: () => [],
        getThemes: () => ({ themes: [{ name: "dark", sourcePath: "D:/themes/dark.json" }], diagnostics: [] }),
        getExtensions: () => ({ extensions: [{ path: "ext.ts", resolvedPath: "D:/ext.ts", hidden: false }, { path: "" }], errors: [{ path: "bad.ts", error: "syntax" }] }),
      },
    },
    ...extra,
  };
  return value as unknown as AgentSessionRuntime & { calls: string[] };
}

describe("PiResourceCatalog", () => {
  it("shapes loader resources, discovery errors, and autocomplete commands without Pi-branded aliases", () => {
    const current = runtime();
    const contexts = new PiWorkflowContexts({ agentDir: "D:/agent" }, { cwd: () => "D:/work", session: () => session(), runtime: () => current, disposed: () => false, activeModel: () => null, emitView: () => {} });
    const catalog = new PiResourceCatalog({ contexts }, { session: () => session(), runtime: () => current });
    expect(catalog.nonVisualResources().map(resource => `${resource.kind}:${resource.label}:${resource.diagnostic ?? ""}`)).toEqual([
      "skill:review:", "skill:Skill diagnostic:skill broke", "prompt-template:plan:", "agent-context:Agent context:", "system-prompt:System prompt:", "theme:dark:",
    ]);
    expect(catalog.extensionResources().map(resource => `${resource.id}:${resource.loaded}:${resource.diagnostic ?? ""}`)).toEqual([
      "extension-0:true:", "extension-diagnostic-1:false:Extension discovery returned malformed extension metadata", "extension-diagnostic-2:false:syntax",
    ]);
    expect(catalog.workflowAutocompleteCommands().map(command => `${command.source}:${command.name}`)).toEqual([
      "builtin:models", "builtin:login", "prompt:plan", "skill:skill:review", "extension:deploy",
    ]);
    const comparison = new PiResourceCatalog({ contexts, productMode: "comparison" }, { session: () => session(), runtime: () => current });
    expect(comparison.workflowAutocompleteCommands().map(command => `${command.source}:${command.name}`)).toEqual([
      "builtin:model", "builtin:login", "prompt:plan", "skill:skill:review", "extension:deploy",
    ]);
    expect(new PiResourceCatalog({ contexts }, { session: () => undefined, runtime: () => undefined }).nonVisualResources()).toEqual([]);
  });
});

describe("PiEngineSettings", () => {
  it("has no port before a runtime, snapshots pinned settings with fallbacks, and applies a callback through the port", async () => {
    let current: AgentSessionRuntime | undefined;
    const levels: string[] = [];
    const settings = new PiEngineSettings({ availableThemes: null, productMode: "bare" }, {
      runtime: () => current,
      requireSession: () => session(),
      thinkingLevelChanged: level => { levels.push(level); },
      emitView: () => {},
    });
    expect(settings.settingsPort()).toBeNull();
    expect(settings.productMode).toBe("bare");
    const engine = runtime();
    current = engine;
    expect(settings.configuredTheme()).toBe("dark");
    const snapshot = settings.pinnedSettingsSnapshot();
    expect(snapshot).toMatchObject({ autoCompact: false, showImages: true, thinkingLevel: "medium", availableThinkingLevels: ["off", "low", "high"], availableThemes: ["dark"], imageWidthCells: 40 });
    expect(await settings.applyPinnedSetting("onNoSuchCallback")).toMatchObject({ outcome: "failed", message: "Unknown setting callback: onNoSuchCallback" });
    expect(await settings.applyPinnedSetting("onCancel")).toMatchObject({ outcome: "cancelled" });
    expect(await settings.applyPinnedSettingValue("onBlockImagesChange", true)).toMatchObject({ outcome: "completed", message: "Block Images: true" });
    expect(engine.calls).toContain("setBlockImages:true");
    expect(await settings.applyPinnedSettingValue("onShowImagesChange", false)).toMatchObject({ outcome: "failed", message: "shell effect is not bound for live application" });
    expect(settings.settingsPort()).toBe(settings.settingsPort());
  });
});

describe("PiPromptSuggestions", () => {
  const request = (overrides: Record<string, unknown> = {}) => ({
    contractVersion: 1,
    identity: { sessionId: "owned-1", sessionGeneration: 1, runSequence: 1, responseSequence: 1, model: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" } },
    signal: new AbortController().signal,
    ...overrides,
  }) as never;

  it("answers unavailable for a stale position and a candidate from the model runtime for the current one", async () => {
    const engine = runtime();
    const state = { responseSequence: 1, unavailable: false };
    const suggestions = new PiPromptSuggestions({
      session: () => session(),
      runtime: () => engine,
      activeModel: () => ({ providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" }),
      identity: () => ({ sessionId: "owned-1", sessionGeneration: 1, runSequence: 1, responseSequence: state.responseSequence }),
      unavailable: () => state.unavailable,
    });
    expect(suggestions.reasoningPolicy()).toBe("medium");
    expect(await suggestions.generate(request())).toMatchObject({ outcome: "candidate", text: "Run the tests?" });
    state.responseSequence = 2;
    expect(await suggestions.generate(request())).toMatchObject({ outcome: "unavailable", text: null });
    state.responseSequence = 1;
    state.unavailable = true;
    expect(await suggestions.generate(request())).toMatchObject({ outcome: "unavailable" });
    expect(engine.calls.filter(call => call === "complete")).toHaveLength(1);
  });
});

describe("PiExtensionUiBinding", () => {
  it("binds the bridge to the session, reports binding failures as diagnostics, and rebinds only while attached", async () => {
    const calls: string[] = [];
    let bound: unknown;
    let fail = false;
    const current = session({ bindExtensions: async (bindings: unknown) => { if (fail) throw new Error("bridge refused"); bound = bindings; } });
    const binding = new PiExtensionUiBinding({
      session: () => current,
      diagnostic: (severity, code, message) => { calls.push(`${severity}:${code}:${message}`); },
      emitView: () => { calls.push("view"); },
    });
    expect(binding.support()).toMatchObject({ available: false, binding: "unbound" });
    await expect(binding.bind({}, undefined)).rejects.toThrow();
    const theme = Object.fromEntries(["fg", "bg", "bold", "italic", "underline", "inverse", "strikethrough", "getFgAnsi", "getBgAnsi", "getColorMode", "getThinkingBorderColor", "getBashModeBorderColor"].map(name => [name, () => ""]));
    const ui = { ...Object.fromEntries(OWNED_UI_EXTENSION_UI_CALLBACKS.map(name => [name, () => {}])), theme };
    await binding.bind(ui, () => { calls.push("shutdown"); });
    expect(binding.support()).toMatchObject({ available: true, binding: "bound" });
    expect(bound).toMatchObject({ mode: "tui" });
    expect(binding.attached).toBe(true);
    fail = true;
    await binding.rebind();
    expect(binding.support().available).toBe(false);
    expect(calls).toEqual(["view", "error:extension-ui-bind:bridge refused", "view"]);
    await binding.unbind();
    expect(binding.attached).toBe(false);
  });
});

describe("PiProviderAuthentication", () => {
  it("logs out through the model runtime and words the result by credential type", async () => {
    const engine = runtime();
    const calls: string[] = [];
    const contexts = new PiWorkflowContexts({ agentDir: "D:/agent" }, { cwd: () => "D:/work", session: () => session(), runtime: () => engine, disposed: () => false, activeModel: () => null, emitView: () => {} });
    const authentication = new PiProviderAuthentication({ agentDir: "D:/agent", contexts }, {
      runtime: () => engine, requireSession: () => session(), disposed: () => false, sessionGeneration: () => 1,
      interaction: () => ({ prompt: async () => null, notify() {} }),
      setActiveModel: () => {}, reconcileActiveModelAvailability: () => { calls.push("reconcile"); }, emitView: () => { calls.push("view"); },
    });
    expect(await authentication.logout({ command: "logout", argument: "" }, engine, "api_key:openai")).toMatchObject({
      outcome: "completed", message: "Removed stored API key for OpenAI. Environment variables and models.json config are unchanged.",
    });
    expect(await authentication.logout({ command: "logout", argument: "" }, engine, "openai")).toMatchObject({ outcome: "completed", message: "Logged out of OpenAI" });
    expect(engine.calls).toEqual(["logout:openai", "logout:openai"]);
    expect(calls).toEqual(["reconcile", "view", "reconcile", "view"]);
  });
});

describe("readUsageView", () => {
  it("sums usage across entries and reads context and subscription state from the session and runtime", () => {
    const current = session({
      messages: [{ role: "assistant", usage: { input: 10, output: 5, cacheRead: 2, cacheWrite: 1, cost: { total: 0.5 } } }],
      getContextUsage: () => ({ tokens: 18, contextWindow: 100, percent: 18 }),
    });
    expect(readUsageView(current, runtime(), { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" })).toMatchObject({
      input: 10, output: 5, cacheRead: 2, cacheWrite: 1, cost: 0.5, contextTokens: 18, contextWindow: 100, usingSubscription: true, autoCompactEnabled: false,
      latestPrompt: { input: 10, cacheRead: 2, cacheWrite: 1 },
    });
    expect(readUsageView(undefined, undefined, null)).toMatchObject({ input: 0, contextAvailable: false, contextWindow: 0, usingSubscription: false, autoCompactEnabled: true });
  });
});
