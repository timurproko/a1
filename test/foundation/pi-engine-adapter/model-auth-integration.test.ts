import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { PiModelAuthenticationIntegration } from "../../../src/foundation/pi-engine-adapter/index.js";

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
