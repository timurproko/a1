import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiRuntimeIntegration } from "../../../../src/integrations/pi/engine/index.js";
import { listPiCompatibleModels } from "../../../../src/integrations/pi/engine/cli-discovery.js";

const roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

async function fixture() {
  vi.stubEnv("PI_OFFLINE", "1");
  const root = await mkdtemp(resolve(tmpdir(), "a1-compatible-engine-")); roots.push(root);
  const agentDir = resolve(root, "agent"); await mkdir(agentDir);
  const settings = JSON.stringify({ defaultProvider: "fixture", defaultModel: "first", defaultThinkingLevel: "low", defaultProjectTrust: "never" });
  await writeFile(resolve(agentDir, "settings.json"), settings);
  const extension = resolve(root, "fixture.ts");
  await writeFile(extension, `export default function(pi) {
    pi.registerProvider("fixture", { api: "openai-completions", apiKey: "hermetic-no-network", baseUrl: "http://127.0.0.1:1/v1", models: ["first", "second"].map(id => ({ id, name: id, reasoning: true, input: ["text"], contextWindow: 4096, maxTokens: 128, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })) });
    pi.registerFlag("fixture-effort", { type: "string", description: "fixture effort" });
    pi.registerTool({ name: "fixture_tool", label: "Fixture", description: "fixture", parameters: { type: "object", properties: {} }, async execute() { return { content: [{ type: "text", text: "fixture result" }], details: {} }; } });
    pi.on("session_start", () => pi.appendEntry("fixture-start", { effort: pi.getFlag("fixture-effort"), host: process.env.FM_PI_SESSION_PID }));
  }`);
  return { root, agentDir, extension, settings };
}

describe("real embedded compatibility launch", () => {
  it("lists extension-provided available models without starting a session or changing parent host authority", async () => {
    const f = await fixture();
    vi.stubEnv("FM_PI_SESSION_PID", "parent-host");
    const models = await listPiCompatibleModels(f.root, f.agentDir, { extensionPaths: [f.extension] }, "fixture/");
    expect(models).toEqual(["fixture/first", "fixture/second"]);
    expect(process.env.FM_PI_SESSION_PID).toBe("parent-host");
    expect(await readFile(resolve(f.agentDir, "settings.json"), "utf8")).toBe(f.settings);
  });

  it("loads explicit resources/flags before startup, excludes built-in and extension tools, and overrides resumed model/effort without saved-default writes", async () => {
    const f = await fixture();
    vi.stubEnv("FM_PI_SESSION_PID", "same-process-host");
    const options = { extensionPaths: [f.extension], extensionFlagValues: [["fixture-effort", "ultra"]] as const, sessionDir: resolve(f.root, "sessions") };
    const first = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: options });
    const path = first.session.sessionManager.getSessionFile()!;
    try {
      await first.session.bindExtensions({});
      expect(first.session.sessionManager.getEntries()).toContainEqual(expect.objectContaining({ type: "custom", customType: "fixture-start", data: { effort: "ultra", host: "same-process-host" } }));
      first.session.sessionManager.appendMessage({ role: "user", content: "persisted without a model call", timestamp: 1 });
      expect(first.session.model?.id).toBe("first");
    } finally { await first.dispose(); }
    const resumed = await createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, sessionSelection: { target: path }, runtimeOptions: { ...options, model: "fixture/second:high", thinking: "medium", excludeTools: ["write", "fixture_*"] } });
    try {
      expect(resumed.session.model).toMatchObject({ provider: "fixture", id: "second" });
      expect(resumed.session.thinkingLevel).toBe("medium");
      expect(resumed.session.getActiveToolNames()).toContain("read");
      expect(resumed.session.getActiveToolNames()).not.toContain("write");
      expect(resumed.session.getActiveToolNames()).not.toContain("fixture_tool");
      expect(resumed.session.sessionManager.getSessionFile()).toBe(path);
      expect(process.env.FM_PI_SESSION_PID).toBe("same-process-host");
      expect(await readFile(resolve(f.agentDir, "settings.json"), "utf8")).toBe(f.settings);
    } finally { await resumed.dispose(); }
  });

  it.each([{ model: "fixture/not-a-real-model" }, { extensionFlagValues: [["unregistered-effort", "ultra"]] as const }])("rejects unavailable concrete contracts rather than falling back: %j", async extra => {
    const f = await fixture();
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension], ...extra } })).rejects.toThrow();
  });

  it("fails an explicit extension import rather than launching a worker without its hooks", async () => {
    const f = await fixture();
    await writeFile(f.extension, "throw new Error('explicit extension failed');");
    await expect(createPiRuntimeIntegration({ cwd: f.root, agentDir: f.agentDir, runtimeOptions: { extensionPaths: [f.extension] } })).rejects.toThrow("explicit extension failed");
  });
});
