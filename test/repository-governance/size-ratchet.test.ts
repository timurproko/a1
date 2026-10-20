import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  SIZE_RATCHET_SCHEMA,
  SIZE_THRESHOLDS,
  inspectSizeRatchet,
  maskRust,
  maskTypeScript,
  measureSizeRatchet,
  measureSource,
  ratchetSizeBaseline,
} from "../../scripts/governance/size-ratchet-policy.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function put(root: string, path: string, source: string) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

const body = (count: number) => Array.from({ length: count }, (_, index) => `    value += ${index};`).join("\n");
const typescriptClass = (methods: number, fields: number) => [
  "export class Wide {",
  ...Array.from({ length: fields }, (_, index) => `  #field${index} = ${index};`),
  ...Array.from({ length: methods }, (_, index) => `  method${index}(): number {\n    return ${index};\n  }`),
  "}",
].join("\n");
const baseline = (classes = {}, functions = {}) => ({ schema: SIZE_RATCHET_SCHEMA, thresholds: { ...SIZE_THRESHOLDS }, classes, functions });

describe("size ratchet scanner", () => {
  it("ignores braces inside TypeScript strings, templates, comments, regular expressions, and astral text", () => {
    const source = [
      "// } {",
      "/* { */",
      "const a = \"{\";",
      "const b = '}';",
      "const c = `[📷 ${`{${a}`}]`;",
      "const d = /[{]\\}/g.test(b) ? 1 / 2 : 3;",
      "export class Shape {",
      "  #ready = false;",
      "  constructor(private readonly name: string, options: { wide: boolean } = { wide: false }) {",
      "    this.#ready = options.wide;",
      "  }",
      "  get label(): string { return `${this.name}}`; }",
      "  async *items(): AsyncGenerator<string> { yield \"}\"; }",
      "}",
    ].join("\n");
    expect(maskTypeScript(source).split("\n")).toHaveLength(source.split("\n").length);
    expect(measureSource("src/shape.ts", source).classes).toEqual([{ key: "src/shape.ts::Shape", methods: 3, fields: 1 }]);
  });

  it("ignores braces inside Rust strings, raw strings, characters, and nested comments, and keeps lifetimes", () => {
    const source = [
      "/* outer /* { */ } */",
      "struct Holder<'a> { name: &'a str }",
      "impl<'a> Display for Holder<'a> {",
      "    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {",
      "        let open = '{';",
      "        let close = b'}';",
      "        write!(f, \"{}}}\", r#\"}\"{\"#)",
      "    }",
      "}",
      "#[cfg(test)]",
      "mod tests {",
      "    fn hidden() {}",
      "}",
    ].join("\n");
    expect(maskRust(source)).not.toContain("'{'");
    expect(measureSource("native/crate/src/lib.rs", source).functions).toEqual([{ key: "native/crate/src/lib.rs::Holder::fmt", lines: 5 }]);
  });

  it("measures inclusive function lines, skips bodiless declarations, and disambiguates repeated names", () => {
    const source = [
      "trait Shape { fn area(&self) -> u32; }",
      "#[cfg(windows)]",
      "fn probe() -> bool {",
      "    true",
      "}",
      "#[cfg(not(windows))]",
      "fn probe() -> bool {",
      "    false",
      "}",
    ].join("\n");
    expect(measureSource("native/crate/src/lib.rs", source).functions).toEqual([
      { key: "native/crate/src/lib.rs::probe", lines: 3 },
      { key: "native/crate/src/lib.rs::probe#2", lines: 3 },
    ]);
  });

  it("reports an unbalanced file instead of mismeasuring it", () => {
    expect(() => measureSource("src/broken.ts", "export function broken() {\n")).toThrow(/unbalanced/);
  });
});

describe("size ratchet gate", () => {
  async function fixture() {
    const root = await mkdtemp(join(tmpdir(), "a1-size-ratchet-"));
    roots.push(root);
    await put(root, "src/wide.ts", typescriptClass(22, 2));
    await put(root, "src/integrations/pi/components/upstream/vendored.ts", typescriptClass(40, 40));
    await put(root, "native/crate/src/lib.rs", `pub fn long() {\n    let mut value = 0;\n${body(110)}\n}\n`);
    return root;
  }

  it("measures only units above a threshold and never vendored sources", async () => {
    const measured = await measureSizeRatchet(await fixture());
    expect(measured).toEqual({
      classes: { "src/wide.ts::Wide": { methods: 22, fields: 2 } },
      functions: { "native/crate/src/lib.rs::long": { lines: 113 } },
      errors: [],
    });
  });

  it("passes when every recorded count is current", async () => {
    const measured = await measureSizeRatchet(await fixture());
    expect(inspectSizeRatchet(measured, ratchetSizeBaseline(measured, null, { seed: true }))).toEqual([]);
  });

  it("fails when a recorded count grows", async () => {
    const measured = await measureSizeRatchet(await fixture());
    const recorded = baseline({ "src/wide.ts::Wide": { methods: 21, fields: 2 } }, { "native/crate/src/lib.rs::long": { lines: 113 } });
    expect(inspectSizeRatchet(measured, recorded)).toEqual(["src/wide.ts::Wide: methods grew from 21 to 22; the size ratchet only allows shrinking"]);
  });

  it("fails when an unrecorded unit exceeds a threshold", async () => {
    const measured = await measureSizeRatchet(await fixture());
    const recorded = baseline({ "src/wide.ts::Wide": { methods: 22, fields: 2 } });
    expect(inspectSizeRatchet(measured, recorded)).toEqual([
      "native/crate/src/lib.rs::long: new oversized function (lines 113) exceeds the size thresholds; split it",
    ]);
  });

  it("fails until a shrunk count is lowered or a split unit's entry is removed", async () => {
    const measured = await measureSizeRatchet(await fixture());
    const recorded = baseline(
      { "src/wide.ts::Wide": { methods: 30, fields: 2 }, "src/gone.ts::Gone": { methods: 25, fields: 0 } },
      { "native/crate/src/lib.rs::long": { lines: 113 } },
    );
    expect(inspectSizeRatchet(measured, recorded)).toEqual([
      "src/wide.ts::Wide: methods shrank to 22; lower the entry with node scripts/governance/update-size-ratchet.mjs",
      "src/gone.ts::Gone: unit is gone or below every threshold; remove the entry with node scripts/governance/update-size-ratchet.mjs",
    ]);
    const lowered = ratchetSizeBaseline(measured, recorded);
    expect(lowered.classes).toEqual({ "src/wide.ts::Wide": { methods: 22, fields: 2 } });
    expect(inspectSizeRatchet(measured, lowered)).toEqual([]);
  });

  it("never adds or raises entries when lowering", async () => {
    const measured = await measureSizeRatchet(await fixture());
    const lowered = ratchetSizeBaseline(measured, baseline({ "src/wide.ts::Wide": { methods: 21, fields: 2 } }));
    expect(lowered.classes).toEqual({ "src/wide.ts::Wide": { methods: 21, fields: 2 } });
    expect(lowered.functions).toEqual({});
  });

  it("rejects edited thresholds and a foreign schema", async () => {
    const measured = await measureSizeRatchet(await fixture());
    const loosened = { ...ratchetSizeBaseline(measured, null, { seed: true }), thresholds: { ...SIZE_THRESHOLDS, functionLines: 1000 } };
    expect(inspectSizeRatchet(measured, loosened)).toContain(`size ratchet thresholds must stay ${JSON.stringify(SIZE_THRESHOLDS)}`);
    expect(inspectSizeRatchet(measured, { schema: "other" })).toEqual([`size ratchet baseline must use schema ${SIZE_RATCHET_SCHEMA}`]);
  });
});
