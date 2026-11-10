import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createAgentSessionFromServices, createAgentSessionServices, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-model-cycling-"));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  const modelRuntime = await ModelRuntime.create({ authPath: join(root, "auth.json"), modelsPath: null, refreshOnCreate: false, allowModelNetwork: false });
  const models = modelRuntime.getModels().slice(0, 3);
  expect(models).toHaveLength(3);
  const available = vi.spyOn(modelRuntime, "getAvailableSnapshot").mockReturnValue(models);
  vi.spyOn(modelRuntime, "checkAuth").mockResolvedValue({ type: "api_key" });
  const services = await createAgentSessionServices({ cwd: root, agentDir: join(root, "agent"), modelRuntime });
  const { session } = await createAgentSessionFromServices({ services, sessionManager: SessionManager.inMemory(root), model: models[0]!, noTools: "all" });
  onTestFinished(() => session.dispose());
  return { session, models, available };
}

describe("the existing pinned session model-cycle pools", () => {
  it("cycles all available models and wraps when no scope is configured", async () => {
    const { session, models } = await fixture();
    for (const model of [models[1], models[2], models[0]]) {
      expect(await session.cycleModel("forward")).toMatchObject({ model, isScoped: false });
      expect(session.model).toBe(model);
    }
  });

  it("cycles only available scoped models in scope order and wraps", async () => {
    const { session, models, available } = await fixture();
    session.setScopedModels([models[0]!, models[2]!, models[1]!].map(model => ({ model })));
    available.mockReturnValue([models[0]!, models[1]!]);
    for (const model of [models[1], models[0]]) {
      expect(await session.cycleModel("forward")).toMatchObject({ model, isScoped: true });
      expect(session.model).not.toBe(models[2]);
    }
    available.mockReturnValue(models);
    expect(await session.cycleModel("forward")).toMatchObject({ model: models[2], isScoped: true });
  });

  it("returns to all available models immediately after clearing the session scope", async () => {
    const { session, models } = await fixture();
    session.setScopedModels([{ model: models[0]! }, { model: models[2]! }]);
    expect(await session.cycleModel("forward")).toMatchObject({ model: models[2], isScoped: true });
    session.setScopedModels([]);
    expect(await session.cycleModel("forward")).toMatchObject({ model: models[0], isScoped: false });
    expect(await session.cycleModel("forward")).toMatchObject({ model: models[1], isScoped: false });
  });

  it.each([0, 1])("does not widen a nonempty scope with %i eligible models", async count => {
    const { session, models, available } = await fixture();
    session.setScopedModels([{ model: models[0]! }, { model: models[2]! }]);
    available.mockReturnValue(count === 0 ? [models[1]!] : [models[0]!, models[1]!]);
    expect(await session.cycleModel("forward")).toBeUndefined();
    expect(session.model).toBe(models[0]);
  });

  it.each([0, 1])("leaves an unscoped pool with %i available models unchanged", async count => {
    const { session, models, available } = await fixture();
    available.mockReturnValue(models.slice(0, count));
    expect(await session.cycleModel("forward")).toBeUndefined();
    expect(session.model).toBe(models[0]);
  });
});
