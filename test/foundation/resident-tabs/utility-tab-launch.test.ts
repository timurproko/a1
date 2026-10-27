import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("slim utility tab launch", () => {
  it("branches to the utility entry before the Agent startup graph is loaded", async () => {
    const source = await readFile("bin/ui.js", "utf8");
    const branch = source.indexOf("if (utilityRoute !== null)");
    const utility = source.indexOf('import("../dist/composition/utility-tab.js")');
    const graph = source.indexOf("descriptor.loadDeclaredStartupGraph()");
    expect(branch).toBeGreaterThan(-1);
    expect(utility).toBeGreaterThan(branch);
    expect(graph).toBeGreaterThan(utility);
    expect(source.slice(branch, graph)).not.toContain("loadDeclaredStartupGraph");
  });

  it("keeps Agent and standby launches on the declared startup graph", async () => {
    const source = await readFile("bin/ui.js", "utf8");
    const agentBranch = source.indexOf("} else {");
    const graph = source.indexOf("descriptor.loadDeclaredStartupGraph()");
    const standby = source.indexOf("if (tabStandby) await waitForStandbyPromotion");
    expect(graph).toBeGreaterThan(agentBranch);
    expect(standby).toBeGreaterThan(graph);
  });
});
