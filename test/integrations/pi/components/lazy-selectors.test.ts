import { afterEach, describe, expect, it, vi } from "vitest";

const thinkingOptions = {
  currentLevel: "medium" as const,
  availableLevels: ["low", "medium"] as const,
  onSelect: () => {},
  onCancel: () => {},
};

async function loadSelectors() {
  return (await import("../../../../src/integrations/pi/components/lazy-selectors.js")).piShellLazySelectors;
}

afterEach(() => {
  vi.doUnmock("../../../../src/integrations/pi/components/thinking-selector-dialog.js");
  vi.resetModules();
});

describe("lazy selector modules", () => {
  it("prepares idempotently across concurrent callers and then builds the selector", async () => {
    const selectors = await loadSelectors();
    await Promise.all([selectors.prepare(), selectors.prepare(), selectors.prepare()]);
    await selectors.prepare();
    const component = await selectors.createThinking(thinkingOptions);
    expect(component.render(80).join("\n")).toContain("Thinking Level");
  });

  it("observes a background module failure and reuses it each time the route opens", async () => {
    const failure = new Error("selector module failed");
    vi.resetModules();
    vi.doMock("../../../../src/integrations/pi/components/thinking-selector-dialog.js", () => { throw failure; });
    const selectors = await loadSelectors();
    await expect(selectors.prepare()).resolves.toBeUndefined();
    const first = await selectors.createThinking(thinkingOptions).then(() => null, (error: unknown) => error);
    expect(first).toBeInstanceOf(Error);
    await expect(selectors.createThinking(thinkingOptions)).rejects.toBe(first);
  });
});
