import { describe, expect, it, vi } from "vitest";
import type { OwnedUiWorkflowRequest } from "../../../src/contracts/owned-ui/index.js";
import { openWorkflowSelector, type WorkflowSelectors } from "../../../src/app/session-shell/workflow-router.js";

function selectors() {
  const calls: string[] = [];
  const record = (name: string) => vi.fn(async (...args: unknown[]) => { calls.push(args.length === 0 || args[0] === undefined ? name : `${name}(${String(args[0])})`); });
  const port = {
    showScopedModelsSelector: record("scoped"),
    showModelsDialog: record("models"),
    showModelSelector: record("model"),
    showForkSelector: record("fork"),
    showThinkingSelector: record("thinking"),
    showTrustSelector: record("trust"),
    showSettingsSelector: record("settings"),
    showSessionSelector: record("resume"),
    showLoginAuthTypeSelector: record("login-type"),
    showLoginMethodSelector: record("login-method"),
    showLogoutSelector: record("logout"),
    showTreeSelector: record("tree"),
  } as unknown as WorkflowSelectors;
  return { port, calls };
}

const request = (command: string, overrides: Partial<OwnedUiWorkflowRequest> = {}) =>
  ({ command, argument: "", ...overrides }) as OwnedUiWorkflowRequest;

describe("openWorkflowSelector", () => {
  it("opens the selector for every unchosen request", async () => {
    const { port, calls } = selectors();
    for (const command of ["scoped-models", "models", "model", "fork", "thinking", "trust", "settings", "resume", "login", "logout", "tree"]) {
      expect(await openWorkflowSelector(request(command), port, { residentTab: false }), command).toEqual({ outcome: "completed", diagnostic: null });
    }
    expect(calls).toEqual(["scoped", "models", "model", "fork", "thinking", "trust", "settings", "resume", "login-type", "logout", "tree"]);
  });

  it("passes arguments that pick within a selector and leaves chosen requests to the engine", async () => {
    const { port, calls } = selectors();
    await openWorkflowSelector(request("models", { argument: " gpt " }), port, { residentTab: false });
    await openWorkflowSelector(request("login", { argument: "anthropic" }), port, { residentTab: false });
    expect(calls).toEqual(["models(gpt)", "login-method(anthropic)"]);
    for (const chosen of [
      request("model", { argument: "x" }),
      request("model", { selection: "x" }),
      request("fork", { confirmed: true }),
      request("thinking", { argument: "high" }),
      request("resume", { argument: "/s" }),
      request("tree", { selection: "e1" }),
      request("compact"),
    ]) {
      expect(await openWorkflowSelector(chosen, port, { residentTab: false }), chosen.command).toBeUndefined();
    }
  });

  it("refuses the in-tab Settings selector inside a resident tab", async () => {
    const { port, calls } = selectors();
    expect(await openWorkflowSelector(request("settings"), port, { residentTab: true }))
      .toEqual({ outcome: "rejected", diagnostic: "Settings is available from the global Settings tab." });
    expect(calls).toEqual([]);
  });
});
