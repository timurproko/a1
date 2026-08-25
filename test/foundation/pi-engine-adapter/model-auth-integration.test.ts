import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { PiModelAuthenticationIntegration } from "../../../src/integrations/pi/engine/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function fixture(login: (providerId: string, signal: AbortSignal) => Promise<void>, timeoutMs = 1000) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-model-auth-"));
  roots.push(root);
  const runtime = await ModelRuntime.create({
    authPath: resolve(root, "auth.json"),
    modelsPath: null,
    refreshOnCreate: false,
    allowModelNetwork: false,
  });
  const selected: string[] = [];
  return {
    runtime,
    selected,
    integration: new PiModelAuthenticationIntegration({
      runtime,
      currentModel: () => null,
      selectModel: async model => { selected.push(`${model.provider}/${model.id}`); },
      login,
      timeoutMs,
    }),
  };
}

describe("Pi model and authentication integration", () => {
  it("uses the real public model runtime API for catalog, refresh, status, and selection", async () => {
    const { integration, selected } = await fixture(async () => {});
    const models = await integration.listModels();
    expect(Array.isArray(models)).toBe(true);
    await expect(integration.refreshModels()).resolves.toBeUndefined();
    await expect(integration.status("controlled-missing-provider")).resolves.toBe("unavailable");
    if (models[0]) {
      await integration.selectModel(models[0].providerId, models[0].modelId);
      expect(selected).toEqual([`${models[0].providerId}/${models[0].modelId}`]);
    }
    await expect(integration.selectModel("missing", "missing")).rejects.toThrow(/unavailable/);
  });

  it("keeps real runtime availability aligned with empty, stored, runtime, logout, and restart auth states", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-model-auth-state-"));
    roots.push(root);
    const authPath = resolve(root, "auth.json");

    const empty = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: true, allowModelNetwork: false });
    expect(empty.getAvailableSnapshot()).toEqual([]);
    expect(empty.getProviderAuthStatus("anthropic")).toEqual({ configured: false });

    await writeFile(authPath, JSON.stringify({ anthropic: { type: "api_key", key: "synthetic-test-key" } }), "utf8");
    const stored = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: true, allowModelNetwork: false });
    expect(stored.getProviderAuthStatus("anthropic")).toEqual({ configured: true, source: "stored" });
    expect(stored.getAvailableSnapshot().filter(model => model.provider === "anthropic").length).toBeGreaterThan(0);
    await stored.logout("anthropic");
    expect(stored.getProviderAuthStatus("anthropic")).toEqual({ configured: false });
    expect(stored.getAvailableSnapshot().filter(model => model.provider === "anthropic")).toEqual([]);

    const restarted = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: true, allowModelNetwork: false });
    expect(restarted.getProviderAuthStatus("anthropic")).toEqual({ configured: false });
    expect(restarted.getAvailableSnapshot().filter(model => model.provider === "anthropic")).toEqual([]);

    await restarted.setRuntimeApiKey("anthropic", "synthetic-runtime-key");
    expect(restarted.getProviderAuthStatus("anthropic")).toEqual({ configured: true, source: "runtime" });
    expect(restarted.getAvailableSnapshot().filter(model => model.provider === "anthropic").length).toBeGreaterThan(0);
    await restarted.removeRuntimeApiKey("anthropic");
    expect(restarted.getProviderAuthStatus("anthropic")).toEqual({ configured: false });

    await writeFile(authPath, JSON.stringify({
      "openai-codex": {
        type: "oauth",
        access: "synthetic-access",
        refresh: "synthetic-refresh",
        expires: Date.now() + 3_600_000,
        accountId: "synthetic-account",
      },
    }), "utf8");
    const oauth = await ModelRuntime.create({ authPath, modelsPath: null, refreshOnCreate: true, allowModelNetwork: false });
    expect(oauth.getProviderAuthStatus("openai-codex")).toEqual({ configured: true, source: "stored" });
    expect(oauth.isUsingOAuth("openai-codex")).toBe(true);
    expect(oauth.getAvailableSnapshot().filter(model => model.provider === "openai-codex").length).toBeGreaterThan(0);
    const beforeAbortedRefresh = oauth.getAvailableSnapshot().filter(model => model.provider === "openai-codex").map(model => model.id);
    const controller = new AbortController();
    controller.abort(new Error("synthetic refresh timeout"));
    await expect(oauth.refresh({ signal: controller.signal })).resolves.toMatchObject({ aborted: true });
    expect(oauth.getAvailableSnapshot().filter(model => model.provider === "openai-codex").map(model => model.id)).toEqual(beforeAbortedRefresh);
  });

  it("routes controlled provider login and propagates caller cancellation", async () => {
    const calls: string[] = [];
    const { integration } = await fixture(async (provider, signal) => {
      calls.push(provider);
      await new Promise<void>((resolvePromise, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        setTimeout(resolvePromise, 50);
      });
    });
    const controller = new AbortController();
    const pending = integration.login("controlled-provider", controller.signal);
    controller.abort(new Error("cancelled by test"));
    await expect(pending).rejects.toThrow(/cancelled by test/);
    expect(calls).toEqual(["controlled-provider"]);
  });

  it("bounds provider authentication timeout", async () => {
    const { integration } = await fixture(async (_provider, signal) => {
      await new Promise<void>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    }, 5);
    await expect(integration.login("controlled-provider")).rejects.toThrow(/timed out/);
  });
});
