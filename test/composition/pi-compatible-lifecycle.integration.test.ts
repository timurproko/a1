import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentSessionRuntime } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { composeOwnedUi } from "../../src/composition/owned-ui.js";
import { createPiEngineHost } from "../../src/integrations/pi/engine/host.js";
import { createPiRuntimeIntegration } from "../../src/integrations/pi/engine/runtime-integration.js";
import type { PiEngineAdapter } from "../../src/integrations/pi/engine/adapter.js";
import { TestPresentationTerminal } from "../features/owned-ui/neutral-port-doubles.js";
import { compatibleExtensionSource } from "../support/pi-compatible-extension.js";

// Rationale: clipboard subprocess packaging is independent of the real SDK and owned UI bridge exercised here.
vi.mock("node:worker_threads", async original => {
  const actual = await original<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options); super(selected.entry, selected.options);
    }
  } };
});

const roots: string[] = [];
const disposals: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const dispose of disposals.splice(0)) await dispose();
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

type Note = { event: string; reason?: string; session?: string; child?: string; ready?: boolean; text?: unknown; cwd?: string };
async function fixture(promptArguments?: readonly string[]) {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "a1-compatible-lifecycle-"))); roots.push(root);
  const agentDir = resolve(root, ".a1/agent"), task = resolve(root, "task"), operational = resolve(root, "operational");
  await Promise.all([agentDir, task, operational].map(path => mkdir(path, { recursive: true })));
  for (const [key, value] of Object.entries({ PI_OFFLINE: "1", PI_CODING_AGENT_DIR: agentDir, [PRODUCT_IDENTITY.environment.profileHome]: root, [PRODUCT_IDENTITY.environment.dataDir]: resolve(root, "data"), [PRODUCT_IDENTITY.environment.configDir]: resolve(root, "config"), [PRODUCT_IDENTITY.environment.runtimeDir]: resolve(root, "runtime") })) vi.stubEnv(key, value);
  vi.stubEnv(PRODUCT_IDENTITY.environment.sessionRuntimeId, undefined);
  await writeFile(resolve(agentDir, "settings.json"), JSON.stringify({ defaultProvider: "fixture", defaultModel: "first", defaultThinkingLevel: "low", defaultProjectTrust: "never", cacheWarming: "off", [PRODUCT_IDENTITY.commandName]: { sessionAutoName: false, promptHistoryEnabled: false, promptSuggestionsEnabled: false, updateCheck: "off" } }));
  await writeFile(resolve(agentDir, "models.json"), JSON.stringify({ providers: { fixture: { api: "openai-completions", apiKey: "hermetic-no-network", baseUrl: "http://127.0.0.1:1/v1", models: ["first", "second"].map(id => ({ id, name: id, reasoning: true, input: ["text"], contextWindow: 128000, maxTokens: 128 })) } } }));
  const audit = resolve(root, "audit.jsonl"), gate = resolve(root, "start.gate"), extension = resolve(root, "supervision.ts");
  await writeFile(extension, compatibleExtensionSource({ audit, gate, operational }));
  const terminal = new TestPresentationTerminal();
  let runtime!: AgentSessionRuntime, adapter!: PiEngineAdapter;
  const composed = await composeOwnedUi({
    cwd: operational, profileId: "a1", productMode: "bare", terminal,
    runtimeOptions: { extensionPaths: [extension], model: "fixture/second", thinking: "medium" },
    ...(promptArguments === undefined ? {} : { promptArguments }), checkForNewerRelease: async () => null,
    createEngineHost: options => {
      const host = createPiEngineHost({ ...options, createRuntime: async input => runtime = await createPiRuntimeIntegration({ ...input, worktreeCwdReader: async () => task }) });
      const create = host.create.bind(host);
      host.create = async input => adapter = await create(input);
      return Promise.resolve(host);
    },
  });
  disposals.push(async () => { await writeFile(gate, "release"); await composed.application.dispose(); });
  return { ...composed, root, agentDir, task, operational, audit, gate, terminal, runtime, adapter,
    notes: async (): Promise<Note[]> => (await readFile(audit, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; })).trim().split("\n").filter(Boolean).map(line => JSON.parse(line)),
    release: () => writeFile(gate, "release"),
  };
}

function transport(runtime: AgentSessionRuntime, tool: boolean | "metadata" = false, pause?: Promise<void> | ((turn: number) => Promise<void>)) {
  const contexts: string[] = [];
  runtime.session.agent.streamFunction = (async (model: Parameters<typeof runtime.session.agent.streamFunction>[0], context: Parameters<typeof runtime.session.agent.streamFunction>[1]) => {
    contexts.push(JSON.stringify(context.messages));
    await (typeof pause === "function" ? pause(contexts.length) : pause);
    const toolCall = tool && contexts.length === 1;
    const message = { role: "assistant" as const, content: toolCall ? [{ type: "toolCall", id: `compat-call-${runtime.session.messages.length}`, name: tool === "metadata" ? "compat_metadata" : "compat_watch", arguments: {} }] : [{ type: "text", text: "fixture-response" }], api: model.api, provider: model.provider, model: model.id, timestamp: Date.now(), stopReason: toolCall ? "toolUse" : "stop", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
    return { result: async () => message, async *[Symbol.asyncIterator]() { yield { type: "start", partial: message }; yield { type: "done", reason: message.stopReason, message }; } };
  }) as unknown as typeof runtime.session.agent.streamFunction;
  return contexts;
}

async function ready(f: Awaited<ReturnType<typeof fixture>>) {
  await f.release(); f.application.start();
  await vi.waitFor(() => expect(f.adapter.extensions.visualExtensionSupport().available).toBe(true));
}

async function frame(f: Awaited<ReturnType<typeof fixture>>) {
  await f.adapter.flushEvents();
  await new Promise(resolve => setTimeout(resolve, 20));
  return stripTerminalSequences(f.terminal.writes.join(""));
}

describe("Pi compatibility through real A1 composition and SDK lifecycle", () => {
  it("waits for extension startup before the one-shot initial prompt and displays owned UI surfaces", async () => {
    const f = await fixture(["literal '\" 🚢\n--model stays literal"]);
    const contexts = transport(f.runtime);
    f.application.start();
    const flushing = f.application.flush();
    try {
      await vi.waitFor(async () => expect((await f.notes()).some(note => note.event === "starting")).toBe(true));
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(contexts).toHaveLength(0);
    } finally { await f.release(); await flushing; }
    await vi.waitFor(() => expect(contexts).toHaveLength(1));
    await f.runtime.session.waitForIdle();
    await f.application.flush();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toContain("startup-digest-once");
    expect((await f.notes()).filter(note => note.event === "before")).toEqual([{ event: "before", ready: true }]);
    const rendered = await frame(f);
    for (const text of ["compatibility-widget", "compatibility-notice", "supervision-ready", "compatibility-editor", "fixture-response"]) expect(rendered).toContain(text);
    expect(f.runtime.session.model).toMatchObject({ provider: "fixture", id: "second" });
    expect(f.runtime.session.thinkingLevel).toBe("medium");
    expect(await f.notes()).toContainEqual(expect.objectContaining({ event: "ready", provider: "fixture", model: "first", agentDir: f.agentDir, mode: "tui", hasUI: true }));
  }, 15_000);

  it("calls extension tools/renderers, preserves attached writes and helper cwd, and delivers follow-ups before logical settlement", async () => {
    const f = await fixture(); await ready(f);
    const contexts = transport(f.runtime, true, async turn => {
      // Concurrency: render the tool's transient notice before the follow-up user turn dismisses it.
      if (turn === 2) await vi.waitFor(async () => expect(await frame(f)).toContain("completion-notification"));
    });
    await f.runtime.session.prompt("queue-followup"); await f.runtime.session.waitForIdle();
    const notes = await f.notes();
    expect(notes.filter(note => note.event === "agent_start")).toHaveLength(2);
    expect(notes.filter(note => note.event === "turn_end")).toHaveLength(3);
    expect(notes.filter(note => note.event === "agent_settled")).toHaveLength(1);
    expect(notes.at(-1)?.event).toBe("agent_settled");
    expect(contexts.at(-1)).toContain("durable-followup");
    expect(f.runtime.session.messages.filter(message => "customType" in message && message.customType === "compat-digest")).toHaveLength(1);
    expect(await readFile(resolve(f.task, "owned-tool.txt"), "utf8")).toBe(`attached-only:${f.runtime.session.sessionId}`);
    await expect(readFile(resolve(f.operational, "owned-tool.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(notes).toContainEqual({ event: "helper", cwd: f.operational });
    expect(notes.filter(note => note.event === "notification")).toHaveLength(1);
    const rendered = await frame(f);
    for (const text of ["compatibility-watch-call", "compatibility-watch-result", "completion-notification"]) expect(rendered).toContain(text);
  }, 15_000);

  it("transforms steering input and delivers the acknowledgement through the real queue", async () => {
    const f = await fixture(); await ready(f);
    const gate = Promise.withResolvers<void>();
    const contexts = transport(f.runtime, false, gate.promise);
    const running = f.runtime.session.prompt("bounded-steering-task");
    try {
      await vi.waitFor(() => expect(contexts).toHaveLength(1));
      expect(await f.runtime.session.steer("steering-answer")).toBe("queued");
    } finally { gate.resolve(); }
    await running; await f.runtime.session.waitForIdle();
    expect(contexts).toHaveLength(2);
    expect(contexts[1]).toContain("ack: steering-answer");
    const notes = await f.notes();
    expect(notes.filter(note => note.event === "agent_settled")).toHaveLength(1);
    expect(notes).toContainEqual(expect.objectContaining({ event: "user", text: expect.arrayContaining([expect.objectContaining({ type: "text", text: "ack: steering-answer" })]) }));
  }, 15_000);

  it("supports blocking extension input through the actual owned editor", async () => {
    const f = await fixture(); await ready(f);
    const asking = f.runtime.session.prompt("/compat-ask");
    await vi.waitFor(async () => expect(await frame(f)).toContain("compatibility-question"));
    f.terminal.input("bounded-answer"); f.terminal.input("\r");
    await asking;
    expect(await f.notes()).toContainEqual({ event: "answer", text: "bounded-answer" });
  }, 15_000);

  it("resolves shell metadata per command after model and session changes instead of inheriting parent values", async () => {
    const f = await fixture(); await ready(f);
    for (const key of ["PI_SESSION_ID", "PI_SESSION_FILE", "PI_PROVIDER", "PI_MODEL", "PI_REASONING_LEVEL"]) vi.stubEnv(key, "stale-parent");
    const capture = async () => {
      transport(f.runtime, "metadata"); await f.runtime.session.prompt("capture-metadata"); await f.runtime.session.waitForIdle();
      const result = f.runtime.session.messages.filter(message => message.role === "toolResult").at(-1);
      expect(result, JSON.stringify(result)).toMatchObject({ isError: false });
    };
    const firstId = f.runtime.session.sessionId, firstFile = f.runtime.session.sessionFile;
    await capture();
    await f.runtime.session.setModel(f.runtime.services.modelRuntime.getModel("fixture", "first")!);
    f.runtime.session.setThinkingLevel("high");
    await capture();
    await f.runtime.newSession();
    await capture();
    const metadata = (await f.notes()).filter(note => note.event === "metadata");
    expect(metadata).toEqual([
      expect.objectContaining({ PI_SESSION_ID: firstId, PI_SESSION_FILE: firstFile, PI_PROVIDER: "fixture", PI_MODEL: "second", PI_REASONING_LEVEL: "medium" }),
      expect.objectContaining({ PI_SESSION_ID: firstId, PI_SESSION_FILE: firstFile, PI_PROVIDER: "fixture", PI_MODEL: "first", PI_REASONING_LEVEL: "high" }),
      expect.objectContaining({ PI_SESSION_ID: f.runtime.session.sessionId, PI_SESSION_FILE: f.runtime.session.sessionFile, PI_PROVIDER: "fixture", PI_MODEL: "first", PI_REASONING_LEVEL: "low" }),
    ]);
    expect(f.runtime.session.sessionId).not.toBe(firstId);
  }, 20_000);

  it("keeps two independently composed worker sessions and notifications isolated", async () => {
    const first = await fixture(); await ready(first);
    const second = await fixture(); await ready(second);
    transport(first.runtime, true); transport(second.runtime, true);
    await Promise.all([first.runtime.session.prompt("queue-followup"), second.runtime.session.prompt("queue-followup")]);
    await Promise.all([first.runtime.session.waitForIdle(), second.runtime.session.waitForIdle()]);
    expect(first.runtime.session.sessionId).not.toBe(second.runtime.session.sessionId);
    expect(first.runtime.session.sessionFile).not.toBe(second.runtime.session.sessionFile);
    for (const f of [first, second]) {
      expect(await readFile(resolve(f.task, "owned-tool.txt"), "utf8")).toBe(`attached-only:${f.runtime.session.sessionId}`);
      const notes = await f.notes();
      expect(notes.filter(note => note.event === "notification")).toHaveLength(1);
      expect(notes.filter(note => note.event === "agent_settled")).toHaveLength(1);
      expect(notes).toContainEqual({ event: "helper", cwd: f.operational });
    }
  }, 20_000);

  it("preserves extension-owned durable notifications across replacement without duplicate delivery", async () => {
    const f = await fixture(); await ready(f);
    f.runtime.session.sessionManager.appendMessage({ role: "user", content: "persisted notification origin", timestamp: 1 });
    const originalPath = f.runtime.session.sessionFile!, entryId = f.runtime.session.sessionManager.getLeafId()!;
    const replace = [
      () => f.runtime.newSession(),
      () => f.adapter.executeWorkflow({ command: "reload", argument: "" }),
      () => f.runtime.switchSession(originalPath),
      () => f.runtime.fork(entryId),
    ];
    for (const [index, operation] of replace.entries()) {
      const content = `durable-outcome-${index}`;
      await f.runtime.session.prompt(`/compat-pending ${content}`);
      await operation();
      expect(f.runtime.session.messages.filter(message => "customType" in message && message.customType === "compat-pending" && message.content === content)).toHaveLength(1);
    }
    const contexts = transport(f.runtime);
    await f.runtime.session.prompt("read-pending-outcome");
    expect(contexts[0]).toContain("durable-outcome-3");
    expect((await f.notes()).filter(note => note.event === "pending-delivered")).toHaveLength(4);
  }, 20_000);

  it("awaits replacement startup before withSession and emits exactly one start per new, reload, resume and fork", async () => {
    const f = await fixture(); await ready(f);
    const original = f.runtime.session;
    const originalPath = original.sessionFile!;
    original.sessionManager.appendMessage({ role: "user", content: "persisted prompt", timestamp: 1 });
    const entryId = original.sessionManager.getLeafId()!;
    await rm(f.gate);
    let callback = false;
    const replacing = f.runtime.newSession({ withSession: async () => { callback = true; } });
    try {
      await vi.waitFor(async () => expect((await f.notes()).some(note => note.event === "starting" && note.reason === "new")).toBe(true));
      expect(callback).toBe(false);
    } finally { await f.release(); await replacing; }
    expect(callback).toBe(true);
    expect(await f.adapter.executeWorkflow({ command: "reload", argument: "" })).toMatchObject({ outcome: "completed" });
    await f.runtime.switchSession(originalPath);
    await f.runtime.fork(entryId);
    const notes = await f.notes();
    expect(notes.filter(note => note.event === "ready").map(note => note.reason)).toEqual(["startup", "new", "reload", "resume", "fork"]);
    expect(notes.filter(note => note.event === "shutdown").map(note => note.reason)).toEqual(["new", "reload", "resume", "fork"]);
    expect(new Set(notes.filter(note => note.event === "ready").map(note => note.child)).size).toBe(5);
    expect(await frame(f)).toContain(`compatibility-widget:${f.runtime.session.sessionId}`);
  }, 20_000);
});
