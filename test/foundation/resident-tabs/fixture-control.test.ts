import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { residentFixtureControl } from "../../../src/foundation/resident-tabs/fixture-control.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function observedTab(controls: string, tabId: string): NodeJS.ProcessEnv {
  return {
    [PRODUCT_IDENTITY.environment.residentFixtureControlDir]: controls,
    [PRODUCT_IDENTITY.environment.residentProgressObservationDir]: join(controls, "observations"),
    [PRODUCT_IDENTITY.environment.residentProgressRunId]: "run-a",
    [PRODUCT_IDENTITY.environment.residentProgressTabId]: tabId,
    [PRODUCT_IDENTITY.environment.residentProgressTabIncarnation]: "1",
  };
}

describe("resident exact-artifact fixture control", () => {
  it("is absent unless an isolated control directory and bounded observed tab identity are explicit", () => {
    expect(residentFixtureControl({})).toBeNull();
    expect(residentFixtureControl(observedTab("control", "../other"))).toBeNull();
    // Invariant: the bridge tab identity is erased at launch and never selects a fixture tab.
    expect(residentFixtureControl({
      [PRODUCT_IDENTITY.environment.residentFixtureControlDir]: "control",
      [PRODUCT_IDENTITY.environment.tabId]: "tab-a",
    })).toBeNull();
  });

  it("stops only the marked real stage for the observed tab after launch erased the bridge identity", () => {
    const root = mkdtempSync(join(tmpdir(), "a1-fixture-control-"));
    roots.push(root);
    const environment = observedTab(root, "tab-a");
    expect(environment[PRODUCT_IDENTITY.environment.tabId]).toBeUndefined();
    const control = residentFixtureControl(environment);
    expect(control?.stopped("child-render-write")).toBe(false);
    writeFileSync(join(root, "tab-b.child-render-write.stop"), "");
    expect(control?.stopped("child-render-write")).toBe(false);
    writeFileSync(join(root, "tab-a.child-render-write.stop"), "");
    expect(control?.stopped("child-render-write")).toBe(true);

    const frame = "\u001b[?2026hwide🙂text\u001b[?2026l";
    expect(control?.fragmentChildWrite(frame)).toEqual([frame]);
    writeFileSync(join(root, "tab-a.child-render-fragments.enable"), "");
    const fragments = control?.fragmentChildWrite(frame) ?? [];
    expect(fragments.length).toBeGreaterThan(1);
    expect(fragments.length).toBeLessThanOrEqual(64);
    expect(fragments.join("")).toBe(frame);
  });
});
