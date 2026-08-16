import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const PINNED_PI_VERSION = "0.84.1";
export const PINNED_PI_COMMIT = "53fa77ccd8a279eb87e92294ef3687b03ff80112";
export const DEFAULT_COLUMNS = 88;
export const DEFAULT_ROWS = 26;
export const FULL_GATE_TIMEOUT_MS = 90_000;
export const TERMINAL_PARITY_TOLERANCES = Object.freeze([
  "differential-sgr-order",
  "transient-scrollbar-thumb-rounding",
]);

export const TERMINAL_PARITY_ACTIONS = Object.freeze([
  { type: "wait", milliseconds: 1_200, until: "pi v0.84.1" },
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
  { type: "text", value: "/help" },
  { type: "key", key: "enter" },
  { type: "checkpoint", name: "command-transcript", domains: ["transcript", "rows-spacing", "wrapping", "footer-status"] },
  { type: "text", value: "parity-stream" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 900 },
  { type: "checkpoint", name: "stream-settlement", domains: ["transcript", "settlement", "footer-status", "raw-ansi", "rows-spacing"] },
  { type: "text", value: "parity-error" },
  { type: "key", key: "enter" },
  { type: "wait", milliseconds: 700 },
  { type: "checkpoint", name: "recoverable-error", domains: ["errors", "settlement", "editor", "footer-status"] },
  { type: "wheel", direction: "up", notches: 2, column: 8, row: 8 },
  { type: "checkpoint", name: "physical-wheel", domains: ["scroll", "scrollbar", "transcript", "cursor-focus"] },
  { type: "resize", columns: 72, rows: 20 },
  { type: "checkpoint", name: "narrow-resize", domains: ["resize", "wrapping", "component-geometry", "editor", "footer-status"] },
  { type: "resize", columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS },
  { type: "checkpoint", name: "restored-resize", domains: ["resize", "wrapping", "component-geometry", "scroll"] },
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
  return `import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export default function deterministicParityProvider(pi) {
  pi.on("agent_start", (_event, ctx) => {
    if (!ctx.hasUI) throw new Error("terminal parity extension expected UI capability");
    ctx.ui.setWidget("parity-lifecycle", ["extension lifecycle ready"], { placement: "aboveEditor" });
  });
  pi.registerProvider("addone-parity", {
    name: "AddOne terminal parity fixture",
    baseUrl: "http://127.0.0.1/unused",
    apiKey: "parity-fixture-key",
    api: "addone-parity-stream",
    models: [{
      id: "scripted",
      name: "Scripted parity model",
      reasoning: false,
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
