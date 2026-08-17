import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const PINNED_PI_VERSION = "0.84.2";
export const PINNED_PI_COMMIT = "914cf1472e715297caa30db4b9535d534a9eb718";
export const DEFAULT_COLUMNS = 88;
export const DEFAULT_ROWS = 26;
export const FULL_GATE_TIMEOUT_MS = 90_000;
export const TERMINAL_PARITY_TOLERANCES = Object.freeze([
  "differential-sgr-order",
  "transient-scrollbar-thumb-rounding",
  "ordinary-vanilla-wheel-distance",
]);

export const TERMINAL_PARITY_ACTIONS = Object.freeze([
  { type: "wait", milliseconds: 1_200, until: "pi v0.84.2" },
  { type: "checkpoint", name: "startup-resources", domains: ["startup-resources", "rows-spacing", "component-geometry", "footer-status", "cursor-focus"] },
  { type: "text", value: "Parity editor input λ界" },
  { type: "checkpoint", name: "editor-input", domains: ["editor", "raw-ansi", "cursor-focus", "wrapping"] },
  { type: "key", key: "ctrl-u" },
  { type: "text", value: "/settings" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "settings-selector", domains: ["selector-dialog", "editor", "footer-status", "component-geometry", "focus"] },
  { type: "key", key: "down" },
  { type: "checkpoint", name: "settings-navigation", domains: ["selector-dialog", "scroll", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "settings-cancel-restored", domains: ["selector-dialog", "editor", "footer-status", "cursor-focus"] },
  { type: "text", value: "/model" },
  { type: "key", key: "enter" },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "model-cancel-restored", domains: ["selector-dialog", "transcript", "editor", "footer-status", "cursor-focus"] },
  { type: "text", value: "/trust" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "trust-selector", domains: ["selector-dialog", "settings", "editor", "footer-status", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "trust-cancel-restored", domains: ["selector-dialog", "transcript", "editor", "footer-status", "cursor-focus"] },
  { type: "text", value: "/scoped-models" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "scoped-models-dirty", domains: ["selector-dialog", "models", "editor", "footer-status", "cursor-focus"] },
  { type: "key", key: "ctrl-s" },
  { type: "checkpoint", name: "scoped-models-saved-open", domains: ["selector-dialog", "models", "transcript", "footer-status", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "scoped-models-cancel-restored", domains: ["selector-dialog", "models", "transcript", "editor", "footer-status", "cursor-focus"] },
  { type: "text", value: "/help" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "command-transcript", domains: ["transcript", "rows-spacing", "wrapping", "footer-status"] },
  { type: "text", value: "parity-stream" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 900 },
  { type: "checkpoint", name: "stream-settlement", domains: ["transcript", "settlement", "footer-status", "raw-ansi", "rows-spacing"] },
  { type: "text", value: "/resume" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 500 },
  { type: "checkpoint", name: "session-selector-current", domains: ["selector-dialog", "sessions", "keybindings", "cursor-focus", "scroll"] },
  { type: "raw", value: "\t" },
  { type: "wait", milliseconds: 500 },
  { type: "checkpoint", name: "session-selector-all", domains: ["selector-dialog", "sessions", "loading", "cursor-focus", "scroll"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "session-selector-cancel-restored", domains: ["selector-dialog", "transcript", "editor", "footer-status", "cursor-focus"] },
  { type: "key", key: "up" },
  { type: "checkpoint", name: "history-previous", domains: ["editor", "keybindings", "cursor-focus"] },
  { type: "key", key: "down" },
  { type: "text", value: "history draft" },
  { type: "key", key: "up" },
  { type: "key", key: "up" },
  { type: "key", key: "down" },
  { type: "checkpoint", name: "history-draft-restored", domains: ["editor", "keybindings", "cursor-focus"] },
  { type: "key", key: "ctrl-u" },
  { type: "text", value: "parity-error" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 700 },
  { type: "checkpoint", name: "recoverable-error", domains: ["errors", "settlement", "editor", "footer-status"] },
  { type: "wheel", direction: "up", notches: 2, column: 8, row: 8 },
  { type: "checkpoint", name: "physical-wheel", domains: ["scroll", "scrollbar", "transcript", "cursor-focus"] },
  { type: "wheel", direction: "down", notches: 100, column: 8, row: 8 },
  { type: "resize", columns: 72, rows: 20 },
  { type: "checkpoint", name: "narrow-resize", domains: ["resize", "wrapping", "component-geometry", "editor", "footer-status"] },
  { type: "resize", columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS },
  { type: "checkpoint", name: "restored-resize", domains: ["resize", "wrapping", "component-geometry", "scroll"] },
  { type: "text", value: "/tree" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "tree-selector", domains: ["selector-dialog", "sessions", "keybindings", "cursor-focus", "scroll"] },
  { type: "key", key: "up" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "tree-summary-choice", domains: ["selector-dialog", "sessions", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "tree-summary-cancel-restored", domains: ["selector-dialog", "sessions", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "text", value: "/login" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "login-auth-type", domains: ["selector-dialog", "authentication", "cursor-focus"] },
  { type: "key", key: "escape" },
  { type: "checkpoint", name: "login-auth-cancel-restored", domains: ["selector-dialog", "transcript", "editor", "footer-status", "cursor-focus"] },
  { type: "text", value: "/reload" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "reload-status", domains: ["transcript", "status", "raw-ansi", "rows-spacing"] },
  { type: "text", value: "parity-stream" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 900 },
  { type: "checkpoint", name: "reload-extension-stream", domains: ["extensions", "transcript", "settlement", "footer-status", "raw-ansi"] },
  { type: "raw", value: "/changelog\r" },
  { type: "checkpoint", name: "changelog", domains: ["transcript", "markdown", "raw-ansi", "rows-spacing", "scroll"] },
  { type: "text", value: "/export" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "export-error", domains: ["transcript", "errors", "raw-ansi", "rows-spacing"] },
  { type: "shutdown" },
]);

export async function prepareParityFixture(root) {
  const workRoot = resolve(root);
  const cwd = join(workRoot, "cwd");
  const templateProfile = join(workRoot, "profile-template");
  await mkdir(join(cwd, ".pi", "skills", "parity-skill"), { recursive: true });
  await mkdir(join(cwd, ".pi", "prompts"), { recursive: true });
  await mkdir(join(templateProfile, "extensions"), { recursive: true });
  await Promise.all([
    writeFile(join(cwd, "AGENTS.md"), "# Terminal Parity Context\n\nDeterministic fixture context.\n", "utf8"),
    writeFile(join(cwd, ".pi", "skills", "parity-skill", "SKILL.md"), "---\nname: parity-skill\ndescription: Deterministic terminal parity skill.\n---\n\nParity fixture.\n", "utf8"),
    writeFile(join(cwd, ".pi", "prompts", "parity.md"), "---\ndescription: Deterministic parity prompt\n---\nParity prompt body.\n", "utf8"),
    writeFile(join(templateProfile, "settings.json"), `${JSON.stringify({
      defaultProvider: "addone-parity",
      defaultModel: "scripted",
      quietStartup: false,
      showHardwareCursor: true,
      theme: "dark",
    }, null, 2)}\n`, "utf8"),
    writeFile(join(templateProfile, "extensions", "deterministic-provider.ts"), deterministicProviderSource(), "utf8"),
  ]);
  const profiles = {};
  for (const producer of ["upstream-pi", "addone-owned-ui"]) {
    const profile = join(workRoot, producer, "agent");
    await mkdir(resolve(profile, ".."), { recursive: true });
    await cp(templateProfile, profile, { recursive: true, force: true });
    profiles[producer] = profile;
  }
  return Object.freeze({ workRoot, cwd, profiles: Object.freeze(profiles) });
}

export function commonParityEnvironment(profile, base = process.env) {
  const environment = { ...base };
  for (const name of ["NO_COLOR", "CI", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY"]) delete environment[name];
  return {
    ...environment,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    FORCE_COLOR: "3",
    PI_OFFLINE: "1",
    PI_TELEMETRY: "0",
    PI_CODING_AGENT_DIR: profile,
    PI_CODING_AGENT_SESSION_DIR: join(profile, "sessions"),
    ADDONE_PROFILE_HOME: resolve(profile, "..", ".."),
  };
}

function deterministicProviderSource() {
  return `import { Type, createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export default function deterministicParityProvider(pi) {
  pi.on("agent_start", (_event, ctx) => {
    if (!ctx.hasUI) throw new Error("terminal parity extension expected UI capability");
    ctx.ui.setWidget("parity-lifecycle", ["extension lifecycle ready"], { placement: "aboveEditor" });
  });
  pi.registerTool({
    name: "parity_echo",
    label: "Parity Echo",
    description: "Deterministic terminal parity tool",
    parameters: Type.Object({ value: Type.String() }),
    async execute(_toolCallId, params, _signal, onUpdate) {
      onUpdate?.({ content: [{ type: "text", text: "tool:partial" }], details: { stage: "partial" } });
      await wait(40);
      return { content: [{ type: "text", text: \`tool:\${params.value}\` }], details: { stage: "complete" } };
    },
    renderCall(args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold(\`parity_echo \${args.value}\`)), 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "no result";
      return new Text(theme.fg(isPartial ? "warning" : "success", text), 0, 0);
    },
  });
  pi.registerProvider("addone-parity", {
    name: "AddOne terminal parity fixture",
    baseUrl: "http://127.0.0.1/unused",
    apiKey: "parity-fixture-key",
    api: "addone-parity-stream",
    models: [{
      id: "scripted",
      name: "Scripted parity model",
      reasoning: true,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8192,
      maxTokens: 512,
    }],
    streamSimple(model, context, options) {
      const stream = createAssistantMessageEventStream();
      void (async () => {
        const output = {
          role: "assistant",
          content: [],
          api: model.api,
          provider: model.provider,
          model: model.id,
          usage: { input: 7, output: 11, cacheRead: 2, cacheWrite: 1, totalTokens: 21, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: "pending",
          timestamp: 1700000000000,
        };
        stream.push({ type: "start", partial: output });
        const last = context.messages.at(-1);
        const prompt = typeof last?.content === "string" ? last.content : Array.isArray(last?.content) ? last.content.filter(value => value.type === "text").map(value => value.text).join("") : "";
        if (prompt.includes("parity-error")) {
          await wait(80);
          output.stopReason = "error";
          output.errorMessage = "deterministic parity provider error";
          stream.push({ type: "error", reason: "error", error: output });
          stream.end();
          return;
        }
        const userText = context.messages.filter(message => message.role === "user").map(message => typeof message.content === "string" ? message.content : Array.isArray(message.content) ? message.content.filter(value => value.type === "text").map(value => value.text).join("") : "").join("\\n");
        const hasParityPrompt = userText.includes("parity-stream");
        const hasParityToolResult = context.messages.some(message => message.role === "toolResult" && message.toolName === "parity_echo");
        if (hasParityPrompt && !hasParityToolResult) {
          output.content.push({ type: "thinking", thinking: "" });
          stream.push({ type: "thinking_start", contentIndex: 0, partial: output });
          await wait(50);
          output.content[0].thinking = "Use deterministic tool";
          stream.push({ type: "thinking_delta", contentIndex: 0, delta: "Use deterministic tool", partial: output });
          stream.push({ type: "thinking_end", contentIndex: 0, content: output.content[0].thinking, partial: output });
          output.content.push({ type: "toolCall", id: "parity-tool-1", name: "parity_echo", arguments: {} });
          stream.push({ type: "toolcall_start", contentIndex: 1, partial: output });
          output.content[1].arguments = { value: "ready" };
          stream.push({ type: "toolcall_delta", contentIndex: 1, delta: '{"value":"ready"}', partial: output });
          stream.push({ type: "toolcall_end", contentIndex: 1, toolCall: output.content[1], partial: output });
          output.stopReason = "toolUse";
          stream.push({ type: "done", reason: "toolUse", message: output });
          stream.end();
          return;
        }
        output.content.push({ type: "text", text: "" });
        stream.push({ type: "text_start", contentIndex: 0, partial: output });
        for (const delta of ["Deterministic ", "**streamed** ", "response\\n\\n- alpha\\n- beta"]) {
          if (options?.signal?.aborted) throw new Error("aborted");
          await wait(70);
          output.content[0].text += delta;
          stream.push({ type: "text_delta", contentIndex: 0, delta, partial: output });
        }
        stream.push({ type: "text_end", contentIndex: 0, content: output.content[0].text, partial: output });
        output.stopReason = "stop";
        stream.push({ type: "done", reason: "stop", message: output });
        stream.end();
      })().catch(error => {
        const output = { role: "assistant", content: [], api: model.api, provider: model.provider, model: model.id, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "error", errorMessage: String(error), timestamp: 1700000000000 };
        stream.push({ type: "error", reason: "error", error: output });
        stream.end();
      });
      return stream;
    },
  });
}
`;
}
