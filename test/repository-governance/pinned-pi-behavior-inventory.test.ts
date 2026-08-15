import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface SourceRecord {
  readonly id: string;
  readonly package: "@earendil-works/pi-coding-agent" | "@earendil-works/pi-tui";
  readonly path: string;
  readonly sourceMap: string;
  readonly lines: number;
  readonly sha256: string;
}

interface Inventory {
  readonly schema: string;
  readonly upstream: {
    readonly commit: string;
    readonly license: string;
    readonly packages: readonly { readonly name: string; readonly version: string; readonly integrity: string }[];
  };
  readonly sourceProvenance: readonly SourceRecord[];
  readonly requiredCategories: readonly string[];
  readonly behaviorInventory: readonly {
    readonly id: string;
    readonly category: string;
    readonly behavior: string;
    readonly provenance: {
      readonly source: string;
      readonly lines: readonly [number, number];
      readonly symbol: string;
      readonly anchors: readonly string[];
    };
    readonly acceptance: { readonly id: string; readonly producer: string; readonly assertion: string };
  }[];
  readonly manifests: {
    readonly advertisedBuiltInCommands: readonly string[];
    readonly nonAdvertisedCommandRoutes: readonly string[];
    readonly tuiKeybindings: readonly string[];
    readonly appKeybindings: readonly string[];
    readonly sessionEvents: readonly string[];
    readonly settingsCallbacks: readonly string[];
    readonly statefulComponents: readonly string[];
  };
  readonly demonstrationShellSmoke: {
    readonly result: string;
    readonly findings: readonly string[];
    readonly invalidatedEvidence: readonly string[];
    readonly classification: string;
  };
}

const evidencePath = "openspec/changes/build-owned-pi-ui-foundation/evidence/pinned-pi-interactive-baseline.json";
const packageRoots = {
  "@earendil-works/pi-coding-agent": "node_modules/@earendil-works/pi-coding-agent/dist",
  "@earendil-works/pi-tui": "node_modules/@earendil-works/pi-tui/dist",
} as const;

async function loadInventory(): Promise<Inventory> {
  return JSON.parse(await readFile(evidencePath, "utf8")) as Inventory;
}

async function loadPinnedSource(record: SourceRecord): Promise<string> {
  const sourceMap = JSON.parse(await readFile(join(packageRoots[record.package], record.sourceMap), "utf8")) as {
    readonly sources: readonly string[];
    readonly sourcesContent: readonly string[];
  };
  expect(sourceMap.sources).toHaveLength(1);
  expect(sourceMap.sourcesContent).toHaveLength(1);
  expect(record.path.endsWith(sourceMap.sources[0]!.replaceAll("\\", "/").replace(/^.*?src\//, "src/"))).toBe(true);
  return sourceMap.sourcesContent[0]!.replaceAll("\r\n", "\n");
}

function objectKeys(source: string, start: string, end: string): string[] {
  const region = source.slice(source.indexOf(start), source.indexOf(end));
  return [...region.matchAll(/^\s*"([^"]+)"\s*:/gm)].map(match => match[1]!);
}

function switchCases(source: string, start: string, end: string): string[] {
  const region = source.slice(source.indexOf(start), source.indexOf(end));
  return [...region.matchAll(/case "([^"]+)"/g)].map(match => match[1]!);
}

describe("complete pinned Pi interactive behavior inventory", () => {
  it("binds every required category and acceptance case to exact pinned upstream source", async () => {
    const inventory = await loadInventory();
    expect(inventory.schema).toBe("addone-pinned-pi-interactive-baseline-v1");
    expect(inventory.upstream).toMatchObject({
      commit: "53fa77ccd8a279eb87e92294ef3687b03ff80112",
      license: "MIT",
    });
    expect(inventory.upstream.packages.map(value => `${value.name}@${value.version}`)).toEqual([
      "@earendil-works/pi-coding-agent@0.84.1",
      "@earendil-works/pi-tui@0.84.1",
    ]);
    expect(inventory.upstream.packages.every(value => value.integrity.startsWith("sha512-"))).toBe(true);

    const sources = new Map<string, string>();
    for (const record of inventory.sourceProvenance) {
      const source = await loadPinnedSource(record);
      expect(source.split("\n"), record.path).toHaveLength(record.lines);
      expect(createHash("sha256").update(source).digest("hex"), record.path).toBe(record.sha256);
      sources.set(record.id, source);
    }

    const covered = new Set(inventory.behaviorInventory.map(value => value.category));
    expect([...covered].sort()).toEqual([...inventory.requiredCategories].sort());
    expect(new Set(inventory.behaviorInventory.map(value => value.id)).size).toBe(inventory.behaviorInventory.length);
    expect(new Set(inventory.behaviorInventory.map(value => value.acceptance.id)).size).toBe(inventory.behaviorInventory.length);

    for (const item of inventory.behaviorInventory) {
      const source = sources.get(item.provenance.source);
      expect(source, `${item.id}: missing source`).toBeDefined();
      const [start, end] = item.provenance.lines;
      expect(start, `${item.id}: start line`).toBeGreaterThan(0);
      expect(end, `${item.id}: end line`).toBeGreaterThanOrEqual(start);
      const region = source!.split("\n").slice(start - 1, end).join("\n");
      for (const anchor of item.provenance.anchors) expect(region, `${item.id}: ${anchor}`).toContain(anchor);
      expect(item.behavior.length, item.id).toBeGreaterThan(40);
      expect(item.acceptance.producer, item.id).toMatch(/^pinned-upstream-/);
      expect(item.acceptance.assertion.length, item.id).toBeGreaterThan(40);
      expect(item.acceptance.assertion, item.id).not.toContain("PiSessionShell");
    }
  });

  it("matches the complete upstream command, keybinding, event, and settings manifests", async () => {
    const inventory = await loadInventory();
    const records = new Map(inventory.sourceProvenance.map(value => [value.id, value]));
    const commands = await loadPinnedSource(records.get("commands")!);
    const keybindings = await loadPinnedSource(records.get("keybindings")!);
    const tuiKeybindings = await loadPinnedSource(records.get("tui-keybindings")!);
    const interactive = await loadPinnedSource(records.get("interactive")!);

    expect([...commands.matchAll(/\{ name: "([^"]+)"/g)].map(match => match[1])).toEqual(
      inventory.manifests.advertisedBuiltInCommands,
    );
    for (const command of inventory.manifests.advertisedBuiltInCommands) {
      expect(interactive, `missing /${command} route`).toContain(`\"/${command}\"`);
    }
    for (const command of inventory.manifests.nonAdvertisedCommandRoutes) {
      expect(commands, `${command} must remain non-advertised`).not.toContain(`name: "${command}"`);
      expect(interactive, `missing hidden /${command} route`).toContain(`\"/${command}\"`);
    }

    expect(objectKeys(tuiKeybindings, "export const TUI_KEYBINDINGS", "export interface KeybindingConflict")).toEqual(
      inventory.manifests.tuiKeybindings,
    );
    expect(objectKeys(keybindings, "export const KEYBINDINGS", "const KEYBINDING_NAME_MIGRATIONS")).toEqual(
      inventory.manifests.appKeybindings,
    );
    expect(switchCases(interactive, "private async handleEvent", "/** Extract text content")).toEqual(
      inventory.manifests.sessionEvents,
    );

    const settingsRegion = interactive.slice(
      interactive.indexOf("private showSettingsSelector"),
      interactive.indexOf("private async handleModelCommand"),
    );
    expect([...settingsRegion.matchAll(/^\s*(on[A-Z][A-Za-z]+):/gm)].map(match => match[1])).toEqual(
      inventory.manifests.settingsCallbacks,
    );
    expect(inventory.manifests.statefulComponents).toHaveLength(24);
    for (const component of inventory.manifests.statefulComponents) expect(interactive).toContain(component);
  });

  it("records the failed smoke and invalidates circular demonstration-shell parity", async () => {
    const inventory = await loadInventory();
    expect(inventory.demonstrationShellSmoke.result).toBe("failed");
    expect(inventory.demonstrationShellSmoke.findings).toEqual([
      "Vanilla startup composition was absent.",
      "Command discovery and autocomplete were absent.",
      "Ordinary prompt submission produced no visible turn.",
      "Most pinned vanilla workflows were absent.",
    ]);
    expect(inventory.demonstrationShellSmoke.invalidatedEvidence).toContain(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pi-parity-acceptance.json",
    );
    expect(inventory.demonstrationShellSmoke.classification).toContain("regression fixtures only");

    const previous = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pi-parity-acceptance.json",
      "utf8",
    )) as {
      readonly result: string;
      readonly manualAcceptanceStatus: string;
      readonly evidenceClassification: string;
      readonly fixtures: readonly { readonly classification: string }[];
      readonly visualDivergences: readonly string[];
    };
    expect(previous.result).toBe("invalidated");
    expect(previous.manualAcceptanceStatus).toBe("blocked-pending-independent-parity");
    expect(previous.evidenceClassification).toBe("regression-only-not-parity");
    expect(previous.fixtures.every(value => value.classification.includes("no independent upstream producer"))).toBe(true);
    expect(previous.visualDivergences).toHaveLength(4);
  });
});
