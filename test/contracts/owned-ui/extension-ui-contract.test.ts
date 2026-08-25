import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  assertOwnedUiExtensionUiPort,
} from "../../../src/contracts/owned-ui/index.js";

function extensionUiPort(): Record<string, unknown> {
  const port: Record<string, unknown> = Object.fromEntries(OWNED_UI_EXTENSION_UI_CALLBACKS.map(name => [name, vi.fn()]));
  port.theme = Object.fromEntries([
    "fg",
    "bg",
    "bold",
    "italic",
    "underline",
    "inverse",
    "strikethrough",
    "getFgAnsi",
    "getBgAnsi",
    "getColorMode",
    "getThinkingBorderColor",
    "getBashModeBorderColor",
  ].map(name => [name, vi.fn()]));
  return port;
}

function interfaceBody(source: string, name: string): string {
  const marker = `export interface ${name} {`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`missing ${name}`);
  const opening = source.indexOf("{", start);
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(opening + 1, index);
  }
  throw new Error(`unterminated ${name}`);
}

describe("owned extension UI contracts", () => {
  it("matches every callback and property in the independently installed pinned public UI context", async () => {
    const source = await readFile(
      "node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts",
      "utf8",
    );
    const body = interfaceBody(source, "ExtensionUIContext");
    const callbacks = new Set([...body.matchAll(/^\s{4}([A-Za-z]\w*)(?:<[^>]+>)?\(/gm)].map(match => match[1]!));
    const properties = new Set([...body.matchAll(/^\s{4}readonly\s+([A-Za-z]\w*)\s*:/gm)].map(match => match[1]!));

    expect(OWNED_UI_EXTENSION_CONTRACT_VERSION).toBe(1);
    expect([...OWNED_UI_EXTENSION_UI_CALLBACKS].sort()).toEqual([...callbacks].sort());
    expect([...OWNED_UI_EXTENSION_UI_PROPERTIES].sort()).toEqual([...properties].sort());
  });

  it("covers every pinned custom rendering entry point", async () => {
    const source = await readFile(
      "node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts",
      "utf8",
    );
    expect(source).toContain("renderCall?:");
    expect(source).toContain("renderResult?:");
    expect(source).toContain("registerMessageRenderer<");
    expect(source).toContain("registerEntryRenderer<");
    expect(source).toContain("registerMarkdownTransformer(");
    expect(OWNED_UI_EXTENSION_RENDER_CALLBACKS).toEqual([
      "tool.renderCall",
      "tool.renderResult",
      "message",
      "entry",
      "markdownTransformer",
    ]);
  });

  it("accepts a complete dependency-free port and rejects every missing callback", () => {
    expect(() => assertOwnedUiExtensionUiPort(extensionUiPort())).not.toThrow();

    for (const callback of OWNED_UI_EXTENSION_UI_CALLBACKS) {
      const malformed = extensionUiPort();
      delete malformed[callback];
      expect(() => assertOwnedUiExtensionUiPort(malformed)).toThrow(callback);
    }
  });

  it("keeps owned contracts dependency-free and confines the validated public UI type to the engine adapter", async () => {
    const [contract, adapter] = await Promise.all([
      readFile("src/contracts/owned-ui/extension-ui.ts", "utf8"),
      readFile("src/integrations/pi/engine/adapter.ts", "utf8"),
    ]);
    expect(contract).not.toMatch(/@earendil-works|pi-coding-agent|pi-tui/);
    expect(adapter.match(/ExtensionUIContext/g)).toHaveLength(3);
    expect(adapter).toContain("assertOwnedUiExtensionUiPort(value)");
    expect(adapter).not.toMatch(/createExtensionUIContext|getUIContext|InteractiveMode/);
  });

  it("rejects malformed theme ports without inspecting Pi private context", () => {
    const missingTheme = extensionUiPort();
    delete missingTheme.theme;
    expect(() => assertOwnedUiExtensionUiPort(missingTheme)).toThrow(/theme port/);

    const malformedTheme = extensionUiPort();
    delete (malformedTheme.theme as Record<string, unknown>).fg;
    expect(() => assertOwnedUiExtensionUiPort(malformedTheme)).toThrow(/theme callback.*fg/);
  });
});
