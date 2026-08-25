import { describe, expect, it } from "vitest";
import { assertAgentServicePorts, type AgentServicePorts } from "../../../src/contracts/agent-engine/index.js";

function ports(): AgentServicePorts {
  return {
    models: {
      capabilities: { selection: false, refresh: false, scopedCatalog: false },
      async listModels() { return []; },
      async currentModel() { return null; },
    },
    authentication: {
      capabilities: { login: false, logout: false },
      async status() { return "unavailable"; },
    },
    settings: {
      capabilities: { write: false, flush: false },
      async listSettings() { return []; },
      async readSetting() { return undefined; },
    },
    resources: {
      capabilities: { reload: false, extensionBinding: false },
      async discoverResources() { return []; },
    },
    extensions: {
      capabilities: { reload: false, binding: false, renderers: false },
      async discoverCommands() { return []; },
      async sessionMetadata() { return { sessionId: "test", sessionName: null, sessionPath: null, cwd: "." }; },
      subscribeFailures() { return () => {}; },
    },
    workflows: {
      capabilities: { execute: false },
      async listWorkflows() { return []; },
    },
  };
}

describe("use-case-derived agent service ports", () => {
  it("requires discovery and read operations while permitting unsupported optional capabilities", () => {
    expect(() => assertAgentServicePorts(ports())).not.toThrow();
  });

  it("requires every operation whose capability is advertised", () => {
    const value = ports();
    const models = { ...value.models, capabilities: { ...value.models.capabilities, selection: true } };
    expect(() => assertAgentServicePorts({ ...value, models })).toThrow(/selection requires selectModel/);
  });

  it("accepts implemented optional operations independently", () => {
    const value = ports();
    const settings = { ...value.settings, capabilities: { write: true, flush: false }, async writeSetting() {} };
    expect(() => assertAgentServicePorts({ ...value, settings })).not.toThrow();
  });

  it("rejects missing required ports and implicit capability flags", () => {
    const value = ports();
    expect(() => assertAgentServicePorts({ ...value, resources: undefined } as never)).toThrow(/resources port/);
    const authentication = { ...value.authentication, capabilities: { login: undefined, logout: false } };
    expect(() => assertAgentServicePorts({ ...value, authentication } as never)).toThrow(/must be explicit/);
  });
});
