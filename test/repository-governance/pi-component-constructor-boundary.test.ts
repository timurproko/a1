import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Pi component constructor boundary", () => {
  it("uses compile-time constructors without concrete-object escapes", async () => {
    const root = resolve("src/foundation/pi-component-adapter");
    const files = (await readdir(root)).filter(name => name.endsWith(".ts"));
    const source = (await Promise.all(files.map(async name => ({ name, text: await readFile(resolve(root, name), "utf8") }))));
    for (const file of source) {
      expect(file.text, file.name).not.toMatch(/Reflect\.construct|as\s+(?:unknown\s+as\s+|never\b|any\b)/);
    }
    const selectors = source.find(value => value.name === "shell-selectors-dialogs.ts")?.text ?? "";
    for (const constructor of ["SettingsSelectorComponent", "ModelSelectorComponent", "SessionSelectorComponent", "TreeSelectorComponent", "UserMessageSelectorComponent", "LoginDialogComponent"]) {
      expect(selectors).toContain(`new ${constructor}(`);
    }
  });

  it("confines dynamic invocation to documented extension callback surfaces", async () => {
    const root = resolve("src/foundation/pi-component-adapter");
    const files = (await readdir(root)).filter(name => name.endsWith(".ts"));
    for (const name of files) {
      const text = await readFile(resolve(root, name), "utf8");
      if (text.includes("Reflect.apply")) expect(["shell-editor-autocomplete.ts", "shell-extension-ui.ts"]).toContain(name);
    }
  });
});
