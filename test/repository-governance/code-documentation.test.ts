import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  CODE_DOCUMENTATION_RULES,
  classifyCodeDocumentationSource,
  formatCodeDocumentationDiagnostics,
  inspectCodeDocumentation,
  loadTrackedCodeDocumentationSources,
  sourceRecordsFromFiles,
} from "../../scripts/governance/code-documentation-policy.mjs";

const execFileAsync = promisify(execFile);
const owner = { fixture: { id: "fixture", publicEntry: "src/fixture/index.ts" } };

function inspect(files: Record<string, string>, options: { synchronizedDestinations?: Set<string> } = {}) {
  return inspectCodeDocumentation({
    sources: sourceRecordsFromFiles(files),
    owners: owner,
    ...(options.synchronizedDestinations === undefined ? {} : { synchronizedDestinations: options.synchronizedDestinations }),
  });
}

function rules(files: Record<string, string>) {
  return inspect(files).map(value => value.rule);
}

describe("code documentation source roles", () => {
  it.each([
    ["src/feature.ts", "first-party-production"],
    ["test/feature.test.ts", "first-party-tooling"],
    ["scripts/check.mjs", "first-party-tooling"],
    ["bin/cli.js", "first-party-tooling"],
    ["vitest.config.ts", "first-party-tooling"],
    ["native/process-guardian/src/main.rs", "first-party-native"],
    ["src/integrations/pi/components/upstream/component.ts", "synchronized"],
    ["native/terminal-host/vendor/lib/source.zig", "vendored"],
    ["src/integrations/pi/components/resources/builtin-themes.ts", "generated"],
    ["dist/cli.js", "ignored"],
    ["native/process-guardian/target/debug/build.rs", "ignored"],
  ])("classifies %s as %s", (path, role) => {
    expect(classifyCodeDocumentationSource(path)).toBe(role);
    expect(classifyCodeDocumentationSource(path.replaceAll("/", "\\"))).toBe(role);
  });

  it("does not turn similar path names into broad exclusions", () => {
    expect(classifyCodeDocumentationSource("src/integrations/pi/components/upstreamish/component.ts")).toBe("first-party-production");
    expect(classifyCodeDocumentationSource("native/terminal-host/vendorish/source.rs")).toBe("first-party-native");
    expect(classifyCodeDocumentationSource("other/source.ts")).toBe("unmatched");
  });

  it("loads normalized tracked code without reading ignored and vendored content", async () => {
    const repository = await mkdtemp(join(tmpdir(), "a1-code-documentation-"));
    await execFileAsync("git", ["init"], { cwd: repository });
    for (const [path, source] of Object.entries({
      "src/a.ts": "export const a = 1;",
      "test/a.test.ts": "export const test = true;",
      "native/a.rs": "fn main() {}",
      "native/terminal-host/vendor/lib/a.zig": "const a = 1;",
      "target/generated.rs": "fn generated() {}",
      "notes.txt": "ignored",
    })) {
      await mkdir(join(repository, path, ".."), { recursive: true });
      await writeFile(join(repository, path), source);
    }
    await execFileAsync("git", ["add", "-f", "."], { cwd: repository });

    const sources = await loadTrackedCodeDocumentationSources(repository);
    expect(sources.map(value => [value.path, value.role, value.source === null])).toEqual([
      ["native/a.rs", "first-party-native", false],
      ["native/terminal-host/vendor/lib/a.zig", "vendored", true],
      ["src/a.ts", "first-party-production", false],
      ["target/generated.rs", "ignored", true],
      ["test/a.test.ts", "first-party-tooling", false],
    ]);
  });

  it("rejects a tracked code path without an explicit source role", () => {
    const diagnostics = inspectCodeDocumentation({
      sources: [{ path: "other/source.ts", role: "unmatched", source: "export const value = 1;" }],
      owners: {},
    });
    expect(diagnostics.map(value => value.rule)).toEqual([CODE_DOCUMENTATION_RULES.sourceClassification]);
  });

  it("requires synchronized provenance without applying first-party style", () => {
    const path = "src/integrations/pi/components/upstream/component.ts";
    const source = "export class Synced {}\n// upstream wording";
    const missing = inspectCodeDocumentation({ sources: sourceRecordsFromFiles({ [path]: source }), owners: {} });
    expect(missing.map(value => value.rule)).toEqual([CODE_DOCUMENTATION_RULES.synchronizedProvenance]);

    const accepted = inspectCodeDocumentation({
      sources: sourceRecordsFromFiles({ [path]: source }),
      owners: {},
      synchronizedDestinations: new Set([path]),
    });
    expect(accepted).toEqual([]);
  }, 30_000);
});

describe("owner-public class contracts", () => {
  it("resolves direct, named, aliased, star, and duplicate barrel exports", () => {
    const diagnostics = inspect({
      "src/fixture/index.ts": [
        "export { PublicClass as Alias } from './public.js';",
        "export * from './public.js';",
        "export * from './other.js';",
      ].join("\n"),
      "src/fixture/public.ts": "/** Coordinates fixture state across one bounded owner. */\nexport class PublicClass {}",
      "src/fixture/other.ts": "/** Applies the other fixture lifecycle without sharing mutable state. */\nexport class OtherClass {}\nclass PrivateClass {}",
    });
    expect(diagnostics).toEqual([]);
  });

  it("requires one meaningful contract only for reachable first-party classes", () => {
    const diagnostics = inspect({
      "src/fixture/index.ts": "export { PublicClass } from './public.js';",
      "src/fixture/public.ts": "export class PublicClass {}\nexport class PrivateClass {}",
    });
    expect(diagnostics).toEqual([
      expect.objectContaining({ rule: CODE_DOCUMENTATION_RULES.publicClassContract, path: "src/fixture/public.ts", symbol: "PublicClass" }),
    ]);
  });

  it("limits owner diagnostics to changed files while using bounded export context", () => {
    const sources = sourceRecordsFromFiles({
      "src/fixture/index.ts": "export * from './changed.js';\nexport * from './unchanged.js';",
      "src/fixture/changed.ts": "export class ChangedClass {}",
      "src/fixture/unchanged.ts": "export class UnchangedClass {}",
    });
    const diagnostics = inspectCodeDocumentation({ sources, owners: owner, diagnosticPaths: new Set(["src/fixture/changed.ts"]) });
    expect(diagnostics).toEqual([expect.objectContaining({ path: "src/fixture/changed.ts", symbol: "ChangedClass", rule: CODE_DOCUMENTATION_RULES.publicClassContract })]);
  });

  it("does not require a contract for a synchronized class re-exported by an owner", () => {
    const path = "src/integrations/pi/components/upstream/component.ts";
    const diagnostics = inspectCodeDocumentation({
      sources: sourceRecordsFromFiles({
        "src/fixture/index.ts": "export { SyncedClass } from '../integrations/pi/components/upstream/component.js';",
        [path]: "export class SyncedClass {}",
      }),
      owners: owner,
      synchronizedDestinations: new Set([path]),
    });
    expect(diagnostics).toEqual([]);
  });

  it("rejects duplicate, summary, boilerplate, private, and protected JSDoc", () => {
    const found = rules({
      "src/fixture/index.ts": "export * from './classes.js';",
      "src/fixture/classes.ts": [
        "/** First contract. */",
        "/** Second contract. */",
        "export class Duplicate {}",
        "/** @summary Summary contract. */",
        "export class Summary {}",
        "/** Class for things. */",
        "export class Boilerplate {}",
        "export class Members {",
        "  /** Internal value. */",
        "  private value = 1;",
        "  /** Protected value. */",
        "  protected other = 2;",
        "}",
      ].join("\n"),
    });
    expect(found).toEqual(expect.arrayContaining([
      CODE_DOCUMENTATION_RULES.multipleJsdoc,
      CODE_DOCUMENTATION_RULES.summaryTag,
      CODE_DOCUMENTATION_RULES.classContractQuality,
      CODE_DOCUMENTATION_RULES.privateJsdoc,
    ]));
  });
});

describe("implementation comment hygiene", () => {
  it("accepts categorized multiline rationale, tracked work, explained suppressions, and comment-looking strings", () => {
    const diagnostics = inspect({
      "scripts/accepted.mjs": [
        "const url = 'https://example.test/path';",
        "const marker = '// not a comment';",
        "const expression = /\\/\\/not-a-comment/u;",
        "const endpoint = `https://example.test/${value}`;",
        "// Invariant: the first line establishes the bounded rule.",
        "// The continuation records only essential detail.",
        "export const value = 1;",
        "// TODO(#321): replace the compatibility boundary after adoption.",
        "// @ts-expect-error -- fixture proves an explained compiler suppression",
        "value.missing();",
      ].join("\n"),
    });
    expect(diagnostics).toEqual([]);
  });

  it("rejects uncategorized narration, commented code, untracked work, and unsafe suppressions", () => {
    const found = rules({
      "scripts/rejected.mjs": [
        "// Set the value.",
        "export const value = 1;",
        "// Rationale: const disabled = true;",
        "// TODO: revisit later.",
        "// @ts-ignore",
        "value.missing();",
      ].join("\n"),
    });
    expect(found).toEqual(expect.arrayContaining([
      CODE_DOCUMENTATION_RULES.implementationIntent,
      CODE_DOCUMENTATION_RULES.commentedCode,
      CODE_DOCUMENTATION_RULES.trackedFollowUp,
      CODE_DOCUMENTATION_RULES.suppressionReason,
    ]));
  });

  it("parses native comments without treating ordinary and raw strings as comments", () => {
    const accepted = inspect({
      "native/tool/src/main.rs": [
        "fn main() {",
        "    let url = \"https://example.test\";",
        "    let raw = r#\"// not a comment\"#;",
        "    // Platform: the host receives this value from the operating system.",
        "    /// Public native contract uses the language's documentation form.",
        "}",
      ].join("\n"),
    });
    expect(accepted).toEqual([]);
    expect(rules({ "native/tool/src/main.rs": "fn main() { // explain the call\n}" })).toContain(CODE_DOCUMENTATION_RULES.implementationIntent);
  });

  it("formats sorted actionable failures and a clean command result", () => {
    const diagnostics = inspect({
      "scripts/z.mjs": "// unclear\nexport const z = 1;",
      "scripts/a.mjs": "// also unclear\nexport const a = 1;",
    });
    expect(diagnostics.map(value => value.path)).toEqual(["scripts/a.mjs", "scripts/z.mjs"]);
    expect(formatCodeDocumentationDiagnostics(diagnostics)).toContain("DOC005 scripts/a.mjs:1:1");
    expect(formatCodeDocumentationDiagnostics([])).toBe("Code documentation governance OK: no violations.\n");
  });
});

describe("code documentation command surface", () => {
  it("declares separate full and changed-file package commands", async () => {
    const repository = fileURLToPath(new URL("../..", import.meta.url));
    const manifest = JSON.parse(await readFile(join(repository, "package.json"), "utf8"));
    expect(manifest.scripts["check:code-documentation"]).toBe("node scripts/governance/check-code-documentation.mjs --mode full");
    expect(manifest.scripts["check:code-documentation:changed"]).toBe("node scripts/release/run-changed-documentation.mjs");
  });
});
