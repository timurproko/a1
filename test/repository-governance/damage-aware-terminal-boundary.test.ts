import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PINNED_PI_TUI_DAMAGE_GRAMMAR } from "../../src/integrations/pi/tui-runtime/index.js";

describe("damage-aware terminal public boundary", () => {
  it("pins conformance to the installed public Pi package identity", async () => {
    const packagePath = new URL("../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/package.json", import.meta.url);
    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as { readonly name: string; readonly version: string };
    expect(`${packageJson.name}@${packageJson.version}`).toBe("@earendil-works/pi-tui@0.84.2");
    expect(PINNED_PI_TUI_DAMAGE_GRAMMAR).toContain(`${packageJson.name}@${packageJson.version}`);
  });

  it("uses owned ports without Pi internals, package patches, or broad semantic parsing", async () => {
    const source = await readFile(new URL("../../src/integrations/pi/tui-runtime/damage-aware-terminal.ts", import.meta.url), "utf8");
    expect(source).toContain("implements PiTuiTerminalPort");
    expect(source).toContain("parsePinnedFullscreenWrite");
    expect(source).toContain("grammar-mismatch");
    const imports = source.match(/^import[^;]+;/gmu)?.join("\n") ?? "";
    expect(imports).not.toMatch(/@earendil-works|#pi-tui|node_modules/u);
    expect(source).not.toMatch(/prototype|private-field|AssistantMessage|stripAnsi|visibleWidth/u);
    expect(source).not.toMatch(/from\s+["'][^"']+\/(?:dist|src)\//u);
  });

  it("activates the decorator only for the custom viewport branch", async () => {
    const source = await readFile(new URL("../../src/integrations/pi/session-ui/session-shell.ts", import.meta.url), "utf8");
    const optionsStart = source.indexOf("const runtimeOptions");
    const optionsEnd = source.indexOf("runtime = new PiTuiRuntimeAdapter", optionsStart);
    const options = source.slice(optionsStart, optionsEnd);
    expect(options).toContain("this.#customViewport ? {");
    expect(options).toContain("decorateTerminal:");
    expect(options).toContain(": { layoutRoot: this.root.layoutRoot() }");
  });
});
