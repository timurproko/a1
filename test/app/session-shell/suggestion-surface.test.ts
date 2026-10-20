import { describe, expect, it, vi } from "vitest";
import type { OwnedUiEvent, OwnedUiPromptSuggestionIdentity } from "../../../src/contracts/owned-ui/index.js";
import {
  promptSuggestionSurface,
  responseSuggestionDecision,
  routeResponseToSuggestions,
  suggestionModelKey,
  suggestionPresentationBlockReason,
} from "../../../src/app/session-shell/suggestion-surface.js";

type ResponseEvent = Extract<OwnedUiEvent, { readonly type: "assistant-message-completed" | "agent-run-settled" }>;
const model = { providerId: "anthropic", modelId: "claude", displayName: "Claude" };

function response(overrides: Partial<ResponseEvent> = {}): ResponseEvent {
  return {
    type: "assistant-message-completed",
    sessionId: "session-1",
    sequence: 1,
    sessionGeneration: 3,
    runSequence: 4,
    responseSequence: 5,
    model,
    assistantMessageCount: 2,
    successful: true,
    stopReason: "stop",
    toolContinuation: false,
    ...overrides,
  } as ResponseEvent;
}

describe("response suggestion decision", () => {
  it.each([
    [{ successful: false, toolContinuation: true }, "failed-response"],
    [{ toolContinuation: true }, "tool-continuation"],
    [{ stopReason: "toolUse" }, "tool-continuation"],
    [{ stopReason: "length" }, "incomplete-response"],
    [{ stopReason: null }, "incomplete-response"],
    [{ assistantMessageCount: 1 }, "early-conversation"],
  ] as const)("blocks %j as %s without asking the root", (overrides, reason) => {
    const prepare = vi.fn(() => null);
    expect(responseSuggestionDecision(response(overrides as Partial<ResponseEvent>), prepare)).toBe(reason);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("defers a qualifying response to the root's prepare-time reason", () => {
    expect(responseSuggestionDecision(response(), () => "draft")).toBe("draft");
    expect(responseSuggestionDecision(response(), () => null)).toBeNull();
  });
});

describe("routing responses to the suggestion controller", () => {
  const controller = () => ({ skip: vi.fn(), consider: vi.fn(), settle: vi.fn() });
  const identity = { sessionId: "session-1", sessionGeneration: 3, runSequence: 4, responseSequence: 5 };

  it("considers a completed response and settles a settled run with the same identity", () => {
    const target = controller();
    routeResponseToSuggestions(target, response(), () => null);
    routeResponseToSuggestions(target, response({ type: "agent-run-settled", aborted: false } as Partial<ResponseEvent>), () => null);
    expect(target.consider).toHaveBeenCalledWith({ ...identity, model }, null);
    expect(target.settle).toHaveBeenCalledWith({ ...identity, model }, null);
    expect(target.skip).not.toHaveBeenCalled();
  });

  it("skips a response without a model and never computes its decision", () => {
    const target = controller();
    const prepare = vi.fn(() => null);
    routeResponseToSuggestions(target, response({ model: null }), prepare);
    expect(target.skip).toHaveBeenCalledWith({ ...identity, model: null }, "no-model");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("tolerates a shell without suggestions", () => {
    expect(() => routeResponseToSuggestions(null, response(), () => null)).not.toThrow();
  });
});

describe("suggestion presentation", () => {
  const identity: OwnedUiPromptSuggestionIdentity = { sessionId: "session-1", sessionGeneration: 3, runSequence: 4, responseSequence: 5, model };
  const state = { disposed: false, view: { sessionId: "session-1", activeModel: model }, sessionGeneration: 3 } as const;

  it("blocks a disposed shell, a stale identity, and otherwise defers to the root", () => {
    expect(suggestionPresentationBlockReason(identity, { ...state, disposed: true }, () => null)).toBe("disposed");
    expect(suggestionPresentationBlockReason(identity, { ...state, sessionGeneration: 4 }, () => null)).toBe("stale-identity");
    expect(suggestionPresentationBlockReason(identity, { ...state, view: { sessionId: "other", activeModel: model } }, () => null)).toBe("stale-identity");
    expect(suggestionPresentationBlockReason(identity, { ...state, view: { sessionId: "session-1", activeModel: null } }, () => null)).toBe("stale-identity");
    expect(suggestionPresentationBlockReason(identity, state, () => null)).toBeNull();
    expect(suggestionModelKey({ activeModel: null })).toBe("");
  });

  it("presents ghost text only when the root accepts it", () => {
    let accepts = false;
    const root = { canPresentPromptSuggestion: () => accepts, setPromptSuggestion: vi.fn() };
    const render = vi.fn();
    const surface = promptSuggestionSurface(root as never, () => null, render);
    expect(surface.canPresent(identity)).toBe(true);
    expect(surface.present("next")).toBe(false);
    accepts = true;
    expect(surface.present("next")).toBe(true);
    surface.clear();
    surface.requestRender();
    expect(root.setPromptSuggestion.mock.calls).toEqual([["next"], [null]]);
    expect(render).toHaveBeenCalledOnce();
    expect(promptSuggestionSurface(root as never, () => "disposed", render).canPresent(identity)).toBe(false);
  });
});
