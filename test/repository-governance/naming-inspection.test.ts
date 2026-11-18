import { describe, expect, it } from "vitest";
import rawPolicy from "../../config/internal-naming-policy.json" with { type: "json" };
import { inspectTypeScript } from "../../scripts/governance/product-identifier-policy.mjs";
import { inspectNamingSource } from "../../scripts/governance/naming-inspection.mjs";
import { namingSourceRole, validateNamingPolicy } from "../../scripts/governance/naming-source-policy.mjs";

const policy = validateNamingPolicy(rawPolicy);
const inspect = (source: string, extension = "ts") => inspectNamingSource(`src/example.${extension}`, source, policy);

describe("internal naming syntax policy", () => {
  it.each([
    "const a1client = 1;", "function runa1task() {}", "class A1Worker {}", "class Worker { #a1Cache = 1; }",
    'const worker = { "a1Run"() {} };', "interface Worker { A1_RUN(): void; }", "const worker = { A1_CACHE: 1 };",
    "function run(a1Argument: string) {}", "type a1Result = number;", "enum A1State { Ready }",
    "const { value: a1Value } = source;", "const [a1Value] = source;", "const a1Lambda = () => {};",
    'const key = "a1Run"; const worker = { [key]() {} };', 'const worker = { ["a" + "1Run"]() {} };',
    'import { worker as a1Worker } from "external";', "class Worker { get a1Value() { return 1; } }",
    'const rootKey = "A1_PRIVATE_ROOT";', 'const rootKey = "A1_" + "PRIVATE_ROOT";',
    'process.env["A1_PRIVATE_ROOT"];', 'const worker = { A1_CONFIG_DIR: 1 };',
  ])("rejects branded owned input: %s", source => {
    expect(inspect(source).internal.length).toBeGreaterThan(0);
  });

  it.each(["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"])("covers %s files", extension => {
    const result = inspect("const a1Name = 1;", extension);
    expect(result.internal).toEqual(expect.arrayContaining([expect.objectContaining({ identifier: "a1Name", rule: "NAME001", line: 1 })]));
  });

  it("does not parse comments, hashes, algorithms, or source snippets as declarations", () => {
    expect(inspect('/* class A1Ignored {} */ const text = "class A1Fixture {}"; const algorithm = "sha1"; const code = 0xa1; const pattern = /A1_/;').internal).toEqual([]);
  });

  it("allows public keys only as values and actual environment boundaries", () => {
    expect(inspect('const configKey = "A1_CONFIG_DIR"; const dir = process.env[configKey]; const environment = { A1_CONFIG_DIR: dir };').internal).toEqual([]);
    expect(inspect("const A1_CONFIG_DIR = 1;").internal).not.toEqual([]);
    expect(inspect("const worker = { A1_UNKNOWN: 1 };").external).toEqual([]);
  });

  it("resolves constant keys in their lexical scope", () => {
    const result = inspect('const key = "A1_CONFIG_DIR"; function run() { const key = "A1_PRIVATE_ROOT"; return process.env[key]; }');
    expect(result.internal.some(value => value.identifier === "A1_PRIVATE_ROOT")).toBe(true);
  });

  it("does not mistake a shadowed parameter for an outer static name", () => {
    expect(inspect('const key = "a1Static"; function run(key: string) { return record[key]; }').internal).toEqual([]);
  });

  it("fails closed on malformed scripts", () => {
    expect(inspect("const worker = {").internal.some(value => value.rule === "NAME002")).toBe(true);
  });

  it("retains only exact serialized member exceptions", () => {
    const source = 'interface Evidence { "a1ParityBaselineCommit": string; }';
    expect(inspectTypeScript("test/repository-governance/pi-parity-evidence.test.ts", source).internal).toEqual([]);
    expect(inspectTypeScript("src/unrelated.ts", source).internal).not.toEqual([]);
  });

  it.each([
    ["scripts/governance/delivery-contract.mjs", "a1"],
    ["scripts/governance/delivery-control.mjs", "a1"],
    ["scripts/governance/delivery-case-verifier.mjs", "a1"],
    ["test/repository-governance/portable-delivery-cases.node.mjs", "a1"],
    ["test/repository-governance/delivery-progress.node.mjs", "a1InstallationRequired"],
    ["test/repository-governance/portable-delivery-cases.node.mjs", "a1InstallationRequired"],
  ])("preserves frozen serialized fields only at their declared boundary: %s %s", (path, name) => {
    const source = `const selected = wire.${name};\nconst output = { ${name}: false };`;
    const result = inspectTypeScript(path, source);
    expect(result.internal).toEqual([]);
    expect(result.external).toHaveLength(2);
    expect(inspectTypeScript("src/unrelated.ts", source).internal).toHaveLength(2);
    expect(inspectTypeScript(path, `const ${name} = false;`).internal).toHaveLength(1);
    expect(inspectTypeScript(path, "const output = { a1Internal: false };").internal).toHaveLength(1);
  });

  it("parses the owned Python helper language without an external interpreter", () => {
    expect(inspect('class A1Worker:\n  def run(self):\n    return 1\n', "py").internal).not.toEqual([]);
    expect(inspect('text = "A1 normal output"\n# a1_comment\n', "py").internal).toEqual([]);
    expect(inspect('def broken(\n', "py").internal.some(value => value.rule === "NAME002")).toBe(true);
  });

  it("checks workflow environment maps and shell assignments", () => {
    expect(inspect('jobs:\n  test:\n    env:\n      A1_PRIVATE_ROOT: value\n', "yml").internal).not.toEqual([]);
    expect(inspect('env:\n  A1_CONFIG_DIR: path\n', "yml").internal).toEqual([]);
    expect(inspect('export A1_PRIVATE_ROOT=value\necho "$A1_PRIVATE_ROOT"\n', "sh").internal).not.toEqual([]);
    expect(inspect('a1 "$@"\n# a1 is the public command\n', "sh").internal).toEqual([]);
    expect(inspect('function a1helper { :; }', "sh").internal).not.toEqual([]);
    expect(inspect('$env:A1_PRIVATE_ROOT = "path"', "sh").internal).not.toEqual([]);
    expect(inspect('value: [', "yaml").internal.some(value => value.rule === "NAME002")).toBe(true);
  });

  it("inspects the declared extensionless Pi shim as shell without admitting arbitrary bin sources", () => {
    const path = "bin/pi-compatible/pi";
    expect(namingSourceRole(path)).toBe("shell");
    expect(inspectNamingSource(path, '#!/bin/sh\nexec node "$basedir/../pi-compatible.js" "$@"\n', policy).internal).toEqual([]);
    expect(inspectNamingSource(path, '#!/bin/sh\nexport A1_PRIVATE_ROOT=value\n', policy).internal).toEqual(expect.arrayContaining([expect.objectContaining({ identifier: "A1_PRIVATE_ROOT" })]));
    expect(namingSourceRole("bin/unknown-entry")).toBe("unsupported");
    expect(namingSourceRole("bin/pi-compatible/pi.unknown")).toBe("unsupported");
  });

  it.each(["ps1", "psm1"])("inspects PowerShell %s environment boundaries and hyphenated declarations", extension => {
    expect(namingSourceRole(`scripts/worker.${extension}`)).toBe("shell");
    expect(inspect('$env:A1_PRIVATE_ROOT = "path"', extension).internal.length).toBeGreaterThan(0);
    expect(inspect('function Invoke-a1Worker { }', extension).internal.length).toBeGreaterThan(0);
    expect(inspect('$env:A1_CONFIG_DIR = "path"; function Invoke-Worker { }', extension).internal).toEqual([]);
  });

  it("never excludes owned ports or helpers as if they were vendor code", () => {
    expect(namingSourceRole("src/integrations/pi/components/upstream/local.ts")).toBe("script");
    expect(namingSourceRole("test/fixtures/worker.ts")).toBe("script");
    expect(namingSourceRole("src/integrations/pi/components/vendor/file.ts")).toBe("script");
    expect(namingSourceRole("src/generated/file.rs")).toBe("unsupported");
    expect(namingSourceRole("src/example.unknown")).toBe("unsupported");
  });

  it("rejects wildcard, duplicate, and private-legacy policy exceptions", () => {
    const entry = policy.environment.find(entry => entry.exposure === "public" && /a1/i.test(entry.key))!;
    expect(entry).toBeDefined();
    expect(() => validateNamingPolicy({ ...policy, environment: [...policy.environment, entry] })).toThrow();
    expect(() => validateNamingPolicy({ ...policy, environment: [{ ...entry, key: "A1_*" }] })).toThrow();
    expect(() => validateNamingPolicy({ ...policy, environment: [{ ...entry, exposure: "private" }] })).toThrow(/branding/);
    expect(() => validateNamingPolicy({ ...policy, environment: [{ ...entry, aliases: ["old"] }] })).toThrow(/aliases/);
    expect(() => validateNamingPolicy({ ...policy, externalMembers: [{ name: "A1_PRIVATE", path: "src/worker.ts", reason: "compatibility" }] })).toThrow();
  });
});
