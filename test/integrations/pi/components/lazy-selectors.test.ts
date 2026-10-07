import { describe, expect, it, vi } from "vitest";
import { createPiShellLazySelectorLoader } from "../../../../src/integrations/pi/components/lazy-selectors.js";

const thinkingOptions = {
  currentLevel: "medium" as const,
  availableLevels: ["low", "medium"] as const,
  onSelect: () => {},
  onCancel: () => {},
};

describe("lazy selector modules", () => {
  it("shares fulfilled and in-flight preparation across callers", async () => {
    const thinking = vi.fn(() => import("../../../../src/integrations/pi/components/thinking-selector-dialog.js"));
    const tree = vi.fn(() => import("../../../../src/integrations/pi/components/upstream/components/tree-selector.js"));
    const loader = createPiShellLazySelectorLoader({ thinking, tree });

    await Promise.all([loader.prepare(), loader.prepare(), loader.prepare()]);
    await loader.prepare();
    const component = await loader.createThinking(thinkingOptions);

    expect(component.render(80).join("\n")).toContain("Thinking Level");
    expect(thinking).toHaveBeenCalledTimes(1);
    expect(tree).toHaveBeenCalledTimes(1);
  });

  it("observes background rejection and reuses it for explicit route recovery", async () => {
    const failure = new Error("selector module failed");
    const thinking = vi.fn(async () => { throw failure; });
    const tree = vi.fn(() => import("../../../../src/integrations/pi/components/upstream/components/tree-selector.js"));
    const loader = createPiShellLazySelectorLoader({ thinking, tree });

    await expect(loader.prepare()).resolves.toBeUndefined();
    await expect(loader.createThinking(thinkingOptions)).rejects.toBe(failure);
    expect(thinking).toHaveBeenCalledTimes(1);
    expect(tree).toHaveBeenCalledTimes(1);
  });
});
