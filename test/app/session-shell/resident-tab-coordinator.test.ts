import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiEvent } from "../../../src/contracts/owned-ui/index.js";
import { ResidentTabCoordinator, type ResidentTabOptions } from "../../../src/app/session-shell/resident-tab-coordinator.js";

afterEach(() => { vi.useRealTimers(); });

function harness(options: Partial<ResidentTabOptions> | undefined) {
  const statuses: string[] = [];
  const root = {
    appendWorkflowStatus: vi.fn((message: string) => statuses.push(message)),
    rehydrateHistoryText: (text: string) => text,
    editor: { setText: vi.fn(), addToHistory: vi.fn() },
  };
  const coordinator = new ResidentTabCoordinator(
    options === undefined ? undefined : { requestDetach: async () => true, ...options },
    { root: root as never },
  );
  return { coordinator, root, statuses };
}

const lifecycle = (state: string) => ({ type: "session-lifecycle", lifecycle: state }) as unknown as OwnedUiEvent;
const block = { type: "transcript-block" } as unknown as OwnedUiEvent;

describe("ResidentTabCoordinator", () => {
  it("is inert outside a resident tab", async () => {
    const { coordinator } = harness(undefined);
    expect(coordinator.active).toBe(false);
    expect(await coordinator.admit({ sessionId: "s", sessionFile: null, kind: "prompt", text: "x" })).toBeUndefined();
    expect(await coordinator.detach()).toBeUndefined();
    await expect(coordinator.gracefulStop(null)).resolves.toBeUndefined();
    coordinator.observeLifecycle(lifecycle("busy"));
    coordinator.restoreInput();
    coordinator.dispose();
  });

  it("reports idle when the session settles and never reports a stall during a long turn", () => {
    vi.useFakeTimers();
    const reportStatus = vi.fn();
    const { coordinator, statuses } = harness({ reportStatus });
    coordinator.observeLifecycle(lifecycle("busy"));
    coordinator.observeLifecycle(block);
    vi.advanceTimersByTime(3_600_000);
    expect(reportStatus).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);
    coordinator.observeLifecycle(lifecycle("ready"));
    expect(reportStatus.mock.calls).toEqual([["idle"]]);
  });

  it("restores recovered prompts and drafts into the editor", () => {
    const withPrompts = harness({ recovered: { prompts: [{ id: "1", text: "first" }, { id: "2", text: "second" }], draft: "draft" } });
    withPrompts.coordinator.restoreInput();
    expect(withPrompts.root.editor.setText).toHaveBeenCalledWith("first");
    expect(withPrompts.root.editor.addToHistory.mock.calls).toEqual([["draft"], ["second"]]);
    expect(withPrompts.statuses[0]).toContain("prior draft and 1 additional prompt are in editor history");
    const draftOnly = harness({ recovered: { prompts: [], draft: "only" } });
    draftOnly.coordinator.restoreInput();
    expect(draftOnly.root.editor.setText).toHaveBeenCalledWith("only");
  });

  it("journals, correlates, detaches, and stops through the tab", async () => {
    const correlated = vi.fn(async () => { throw new Error("late"); });
    const dispatched = vi.fn();
    const checkpoint = vi.fn();
    const { coordinator } = harness({
      admit: async () => ({ id: "j1" }), dispatched, correlated, checkpoint,
      requestDetach: async () => false, unavailableNotice: "stay",
    });
    expect(coordinator.active).toBe(true);
    expect(await coordinator.admit({ sessionId: "s", sessionFile: null, kind: "prompt", text: "x" })).toEqual({ id: "j1" });
    await coordinator.dispatched("j1", "c1");
    expect(dispatched).toHaveBeenCalledOnce();
    expect(correlated).toHaveBeenCalledWith("j1", "c1");
    coordinator.checkpoint("draft");
    expect(checkpoint).toHaveBeenCalledWith("draft");
    expect(await coordinator.detach()).toBe("stay");
  });
});
