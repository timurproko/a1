import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("keyboard input presentation ownership", () => {
  it("keeps coordination on A1-owned ports without private Pi or component imports", async () => {
    const source = await readFile(new URL("../../src/integrations/pi/tui-runtime/input-presentation-coordinator.ts", import.meta.url), "utf8");
    const imports = source.match(/^import[^;]+;/gmu)?.join("\n") ?? "";
    expect(imports).not.toMatch(/@earendil-works|#pi-tui|node_modules|ui\/components/u);
    expect(source).not.toMatch(/prototype|private-field|requestImmediateRender|\.dist\//u);
    expect(source).toContain("original order");
    expect(source).toContain("Finite fail-closed grammar");
  });

  it("enables coordination and viewport reuse only on the declared custom viewport", async () => {
    const shell = await readFile(new URL("../../src/integrations/pi/session-ui/session-shell.ts", import.meta.url), "utf8");
    const root = await readFile(new URL("../../src/integrations/pi/session-ui/session-shell-root.ts", import.meta.url), "utf8");
    const optionsStart = shell.indexOf("const runtimeOptions");
    const optionsEnd = shell.indexOf("runtime = new PiTuiRuntimeAdapter", optionsStart);
    const runtimeOptions = shell.slice(optionsStart, optionsEnd);
    expect(runtimeOptions).toContain("this.#customViewport ? {");
    expect(runtimeOptions).toContain("inputCoordination:");
    expect(runtimeOptions).toContain(": { layoutRoot: this.root.layoutRoot() }");
    expect(root).toContain("this.#customViewport && this.#dockInputReuseEnabled");
    expect(root).toContain("coordination: Exclude<PiTuiInputSurfaceKind");
  });

  it("does not create a second terminal authority or patch installed packages", async () => {
    const sources = await Promise.all([
      "../../src/integrations/pi/tui-runtime/input-presentation-coordinator.ts",
      "../../src/integrations/pi/tui-runtime/adapter.ts",
      "../../src/integrations/pi/session-ui/session-shell-root.ts",
    ].map(path => readFile(new URL(path, import.meta.url), "utf8")));
    const combined = sources.join("\n");
    expect(combined).not.toMatch(/node_modules\/(?!\.\.)|Object\.defineProperty\([^,]+\.prototype|\.prototype\s*=/u);
    expect(sources[0]).not.toContain("terminal.write");
    expect(sources[2]).not.toContain("terminal.write");
  });
});
