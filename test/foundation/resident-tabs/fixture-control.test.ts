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

describe("resident exact-artifact fixture control", () => {
  it("is absent unless an isolated control directory and bounded tab identity are explicit", () => {
    expect(residentFixtureControl({})).toBeNull();
    expect(residentFixtureControl({
      [PRODUCT_IDENTITY.environment.residentFixtureControlDir]: "control",
      [PRODUCT_IDENTITY.environment.tabId]: "../other",
    })).toBeNull();
  });

  it("stops only the marked real stage for the selected tab", () => {
    const root = mkdtempSync(join(tmpdir(), "a1-fixture-control-"));
    roots.push(root);
    const environment = {
      [PRODUCT_IDENTITY.environment.residentFixtureControlDir]: root,
      [PRODUCT_IDENTITY.environment.tabId]: "tab-a",
    };
    const control = residentFixtureControl(environment);
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
