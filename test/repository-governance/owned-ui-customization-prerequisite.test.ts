import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const gatePath = resolve("scripts/check-owned-ui-customization-prerequisites.mjs");
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const mutations = [
  ["prohibited runtime or package patch", "InteractiveMode.prototype.render = replacement;"],
  ["generic visible workflow fallback", "workflowSelector({ options: [] });"],
  ["rendered-string status substitution", "replaceWorkingMessageInRows(rows);"],
  ["silent rendered-width rewriting", "normalizeRenderedRows(rows, width);"],
  ["string-named engine reflection", "dynamicCall(session, 'reload');"],
  ["production adapter type escape", "const runtime = value as unknown as Runtime;"],
  ["prohibited terminal selection patch", "rewriteSelectedCells(selectionCoordinates);"],
] as const;

describe("owned UI customization prerequisite", () => {
  it("passes the zero-debt production baseline", () => {
    const result = spawnSync(process.execPath, [gatePath], { encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("zero architecture debt");
  });

  it.each(mutations)("rejects %s", async (diagnostic, mutation) => {
    const root = await fixture({ "src/foundation/pi-engine-adapter/mutation.ts": mutation });
    const result = runGate(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });

  it("rejects stale source-ledger statuses", async () => {
    const root = await fixture({}, { implementationStatus: "not-ported" });
    const result = runGate(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stale or absent destination status");
  });

  it("rejects absent source-ledger destinations", async () => {
    const root = await fixture({}, { localDestination: "src/foundation/pi-component-adapter/missing.ts" });
    const result = runGate(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("absent local destination");
  });

  it("rejects monolithic shell recomposition", async () => {
    const root = await fixture({
      "src/foundation/pi-component-adapter/shell-presenters-transcript.ts": "export {};\n".repeat(551),
    });
    const result = runGate(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("monolithic shell responsibility module");
  });
});

async function fixture(
  overrides: Readonly<Record<string, string>>,
  ledgerOverride: Readonly<Record<string, unknown>> = {},
): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-customization-gate-"));
  roots.push(root);
  const prefix = "src/foundation/pi-component-adapter/";
  const modules = [
    "shell-shared-facade.ts",
    "shell-editor-autocomplete.ts",
    "shell-selectors-dialogs.ts",
    "shell-presenters-transcript.ts",
    "shell-footer-status.ts",
    "shell-extension-ui.ts",
  ];
  const files: Record<string, string> = {
    [`${prefix}shell-components.ts`]: modules.map(module => `export * from \"./${module.replace(/\.ts$/, ".js")}\";`).join("\n"),
    ...Object.fromEntries(modules.map(module => [`${prefix}${module}`, "export {};\n"])),
    ...overrides,
  };
  for (const [path, source] of Object.entries(files)) await writeFixture(root, path, source);
  const ledger = {
    records: [{
      id: "fixture",
      implementationStatus: "owned-port-present",
      localDestination: `${prefix}shell-components.ts`,
      ...ledgerOverride,
    }],
  };
  await writeFixture(root, "evidence/owned-pi-ui-foundation/pinned-pi-source-port-ledger.json", JSON.stringify(ledger));
  return root;
}

async function writeFixture(root: string, path: string, source: string): Promise<void> {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source);
}

function runGate(root: string) {
  return spawnSync(process.execPath, [gatePath, "--root", root], { encoding: "utf8" });
}
